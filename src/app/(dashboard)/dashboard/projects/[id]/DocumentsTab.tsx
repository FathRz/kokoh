"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, Trash2, FileText, FileImage, Download, AlertTriangle, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { saveProjectFile, deleteProjectFile } from "../actions";
import { ProjectFile } from "./page";

const DOC_TYPES = [
  { value: "ded" as const, label: "DED (Detail Engineering Design)", color: "text-blue-600 bg-blue-50 border-blue-200" },
  { value: "design_rumah" as const, label: "Design Rumah", color: "text-purple-600 bg-purple-50 border-purple-200" },
];

const ACCEPT = ".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx";

function formatSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function FileIcon({ name }: { name: string }) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg", "jpeg", "png", "webp"].includes(ext)) {
    return <FileImage className="w-5 h-5 text-green-500" />;
  }
  return <FileText className="w-5 h-5 text-red-500" />;
}

interface Props {
  projectId: string;
  tenantId: string;
  files: ProjectFile[];
}

export default function DocumentsTab({ projectId, tenantId, files }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [uploading, setUploading] = useState<"ded" | "design_rumah" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProjectFile | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dedRef = useRef<HTMLInputElement>(null);
  const designRef = useRef<HTMLInputElement>(null);

  const dedFiles = files.filter((f) => f.type === "ded");
  const designFiles = files.filter((f) => f.type === "design_rumah");

  async function handleUpload(type: "ded" | "design_rumah", file: File) {
    if (file.size > 20 * 1024 * 1024) {
      setError("Ukuran file maksimal 20MB");
      return;
    }

    setUploading(type);
    setError(null);

    const supabase = createClient();
    const ext = file.name.split(".").pop();
    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const storagePath = `${tenantId}/${projectId}/${type}/${uniqueName}`;

    const { error: uploadError } = await supabase.storage
      .from("project-docs")
      .upload(storagePath, file);

    if (uploadError) {
      setError(uploadError.message);
      setUploading(null);
      return;
    }

    const result = await saveProjectFile(projectId, {
      type,
      file_name: file.name,
      storage_path: storagePath,
      file_size: file.size,
    });

    setUploading(null);
    if (result?.error) {
      setError(result.error);
      // Remove orphan from storage
      await supabase.storage.from("project-docs").remove([storagePath]);
      return;
    }

    startTransition(() => router.refresh());
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await deleteProjectFile(deleteTarget.id, projectId, deleteTarget.storage_path);
    setDeleting(false);
    if (result?.error) { setError(result.error); }
    setDeleteTarget(null);
    startTransition(() => router.refresh());
  }

  async function getDownloadUrl(storagePath: string): Promise<string | null> {
    const supabase = createClient();
    const { data } = await supabase.storage
      .from("project-docs")
      .createSignedUrl(storagePath, 60); // 60s signed URL
    return data?.signedUrl ?? null;
  }

  async function handleDownload(file: ProjectFile) {
    const url = await getDownloadUrl(file.storage_path);
    if (!url) { setError("Gagal membuat link unduhan"); return; }
    const a = document.createElement("a");
    a.href = url;
    a.download = file.file_name;
    a.click();
  }

  return (
    <>
      <div className="relative space-y-5">
        {isPending && (
          <div className="absolute inset-0 z-10 bg-white/65 rounded-xl flex items-center justify-center">
            <div className="flex items-center gap-2 bg-white rounded-full px-3.5 py-2 shadow-sm border border-gray-100">
              <span className="block w-3.5 h-3.5 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
              <span className="text-xs font-medium text-gray-500">Memperbarui...</span>
            </div>
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
          </div>
        )}

        {DOC_TYPES.map(({ value: type, label, color }) => {
          const typeFiles = type === "ded" ? dedFiles : designFiles;
          const ref = type === "ded" ? dedRef : designRef;
          const isUploading = uploading === type;

          return (
            <div key={type} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${color}`}>
                    {type === "ded" ? "DED" : "Design"}
                  </span>
                  <span className="text-sm font-medium text-gray-700">{label}</span>
                  <span className="text-xs text-gray-400">({typeFiles.length} file)</span>
                </div>
                <button
                  onClick={() => ref.current?.click()}
                  disabled={isUploading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-lg transition-colors disabled:opacity-60"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {isUploading ? "Mengupload..." : "Upload"}
                </button>
                <input
                  ref={ref}
                  type="file"
                  accept={ACCEPT}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUpload(type, file);
                    e.target.value = "";
                  }}
                />
              </div>

              {typeFiles.length === 0 ? (
                <div
                  className="flex flex-col items-center justify-center py-10 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => ref.current?.click()}
                >
                  <Upload className="w-8 h-8 text-gray-300 mb-2" />
                  <p className="text-sm text-gray-400">Klik atau drag file untuk upload</p>
                  <p className="text-xs text-gray-300 mt-1">PDF, Word, Excel, Gambar · maks 20MB</p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-50">
                  {typeFiles.map((file) => (
                    <li key={file.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/50 group">
                      <FileIcon name={file.file_name} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{file.file_name}</p>
                        <p className="text-xs text-gray-400">
                          {formatSize(file.file_size)} · {formatDate(file.created_at)}
                        </p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleDownload(file)}
                          className="p-1.5 rounded text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(file)}
                          className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Hapus Dokumen</h3>
                <p className="text-sm text-gray-500 mt-0.5 truncate max-w-[220px]">{deleteTarget.file_name}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-5">File akan dihapus permanen dari server.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors disabled:opacity-60"
              >
                {deleting ? "Menghapus..." : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
