"use client";

import { useRef, useState } from "react";
import { Camera, X, Upload, WifiOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { saveReportPhoto } from "./actions";

interface UploadedPhoto {
  id: string;
  storage_path: string;
  public_url: string;
  caption: string;
}

interface Props {
  reportId: string;
  projectName: string;
  today: string;
  tenantId: string;
  isOnline: boolean;
  onUploaded: (photo: UploadedPhoto) => void;
  onOfflineSaved: (localId: string, blob: Blob) => void;
  onClose: () => void;
}

const MAX_WIDTH = 1280;
const QUALITY = 0.82;

async function compressWithWatermark(
  file: File,
  projectName: string,
  dateLabel: string
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      // Calculate dimensions
      let { width, height } = img;
      if (width > MAX_WIDTH) {
        height = Math.round((height * MAX_WIDTH) / width);
        width = MAX_WIDTH;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;

      // Draw photo
      ctx.drawImage(img, 0, 0, width, height);

      // Watermark bar at bottom
      const barH = Math.max(40, Math.round(height * 0.07));
      ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
      ctx.fillRect(0, height - barH, width, barH);

      // Watermark text
      const fontSize = Math.max(13, Math.round(barH * 0.42));
      ctx.fillStyle = "#ffffff";
      ctx.font = `600 ${fontSize}px system-ui, sans-serif`;
      ctx.textBaseline = "middle";
      const textY = height - barH / 2;
      ctx.fillText(`${projectName}  ·  ${dateLabel}`, 12, textY);

      URL.revokeObjectURL(url);
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error("Gagal kompres gambar")),
        "image/webp",
        QUALITY
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Gagal memuat gambar")); };
    img.src = url;
  });
}

export default function PhotoCapture({
  reportId, projectName, today, tenantId, isOnline, onUploaded, onOfflineSaved, onClose,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [compressedBlob, setCompressedBlob] = useState<Blob | null>(null);
  const [processing, setProcessing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dateLabel = new Date(today).toLocaleDateString("id-ID", {
    day: "numeric", month: "short", year: "numeric",
  });

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setProcessing(true);
    setPreview(null);
    setCompressedBlob(null);

    try {
      const blob = await compressWithWatermark(file, projectName, dateLabel);
      const previewUrl = URL.createObjectURL(blob);
      setPreview(previewUrl);
      setCompressedBlob(blob);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memproses gambar");
    } finally {
      setProcessing(false);
    }
  }

  async function handleUpload() {
    if (!compressedBlob) return;
    const localId = crypto.randomUUID();

    if (!isOnline) {
      // Save offline
      onOfflineSaved(localId, compressedBlob);
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const supabase = createClient();
      const filename = `${tenantId}/daily-reports/${today}/${localId}.webp`;
      const { error: uploadErr } = await supabase.storage
        .from("progress-photos")
        .upload(filename, compressedBlob, { contentType: "image/webp", upsert: false });

      if (uploadErr) throw new Error(uploadErr.message);

      const { data: { publicUrl } } = supabase.storage
        .from("progress-photos")
        .getPublicUrl(filename);

      const result = await saveReportPhoto(reportId, filename, caption);
      if (result?.error) throw new Error(result.error);

      onUploaded({
        id: localId,
        storage_path: filename,
        public_url: publicUrl,
        caption,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal upload foto");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-0 sm:px-4">
      <div className="bg-white w-full sm:rounded-2xl sm:max-w-sm shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Ambil Foto Progres</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Preview / Capture Button */}
          {preview ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Preview" className="w-full rounded-xl object-cover max-h-64" />
              <button
                onClick={() => { setPreview(null); setCompressedBlob(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                className="absolute top-2 right-2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/50 rounded text-white text-xs">
                {projectName} · {dateLabel}
              </div>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={processing}
              className="w-full h-40 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-3 text-gray-400 hover:border-brand-300 hover:text-brand-500 transition-colors"
            >
              {processing ? (
                <>
                  <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
                  <span className="text-sm">Memproses...</span>
                </>
              ) : (
                <>
                  <Camera className="w-8 h-8" />
                  <span className="text-sm font-medium">Ketuk untuk ambil foto</span>
                  <span className="text-xs">Watermark otomatis ditambahkan</span>
                </>
              )}
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Caption */}
          {preview && (
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Keterangan foto (opsional)"
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{error}</p>
          )}

          {!isOnline && preview && (
            <div className="flex items-center gap-2 text-xs text-orange-600 bg-orange-50 border border-orange-200 px-3 py-2 rounded-lg">
              <WifiOff className="w-3.5 h-3.5 shrink-0" />
              Mode offline — foto disimpan lokal &amp; upload saat online
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Batal
            </button>
            {preview && (
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-lg transition-colors disabled:opacity-60"
              >
                {uploading ? (
                  <><div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> Mengupload...</>
                ) : !isOnline ? (
                  <><WifiOff className="w-4 h-4" /> Simpan Offline</>
                ) : (
                  <><Upload className="w-4 h-4" /> Upload Foto</>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
