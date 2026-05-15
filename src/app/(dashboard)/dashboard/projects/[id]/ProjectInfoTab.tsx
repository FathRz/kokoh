"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Edit2, Trash2, MapPin, Calendar, DollarSign, FileText, Home, Layers, X, Check, AlertTriangle, User, HardHat } from "lucide-react";
import { ProjectDetail, PerumahanOpt, BlokOpt, MemberOpt } from "./page";
import { updateProject, deleteProject } from "../actions";
import CurrencyInput from "@/components/ui/CurrencyInput";

const STATUS_OPTIONS = [
  { value: "planning", label: "Perencanaan" },
  { value: "active", label: "Aktif" },
  { value: "on_hold", label: "Ditunda" },
  { value: "completed", label: "Selesai" },
  { value: "cancelled", label: "Dibatalkan" },
];

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

function formatDate(d: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

interface Props {
  project: ProjectDetail;
  perumahanOptions: PerumahanOpt[];
  blokOptions: BlokOpt[];
  memberOptions: MemberOpt[];
}

export default function ProjectInfoTab({ project, perumahanOptions, blokOptions, memberOptions }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: project.name,
    location: project.location ?? "",
    status: project.status,
    start_date: project.start_date ?? "",
    end_date: project.end_date ?? "",
    budget_total: String(project.budget_total),
    description: project.description ?? "",
    perumahan_id: project.perumahan_id ?? "",
    blok_id: project.blok_id ?? "",
    pm_id: project.pm_id ?? "",
    site_manager_id: project.site_manager_id ?? "",
  });

  const pmOptions = memberOptions.filter((m) => m.role === "project_manager" || m.role === "tenant_owner");
  const siteManagerOptions = memberOptions.filter((m) => m.role === "site_manager" || m.role === "tenant_owner");

  const availableBlok = blokOptions.filter(
    (b) => b.perumahan_id === form.perumahan_id && (!b.taken || b.id === project.blok_id)
  );

  function setField(key: string, value: string) {
    setForm((f) => {
      const updated = { ...f, [key]: value };
      if (key === "perumahan_id") updated.blok_id = "";
      return updated;
    });
  }

  async function handleSave() {
    if (!form.name.trim()) { setError("Nama proyek wajib diisi"); return; }
    setLoading(true);
    setError(null);
    const result = await updateProject(project.id, {
      name: form.name,
      location: form.location,
      status: form.status,
      start_date: form.start_date,
      end_date: form.end_date,
      budget_total: parseFloat(form.budget_total) || 0,
      description: form.description,
      perumahan_id: form.perumahan_id || null,
      blok_id: form.blok_id || null,
      pm_id: form.pm_id || null,
      site_manager_id: form.site_manager_id || null,
    });
    setLoading(false);
    if (result?.error) { setError(result.error); return; }
    setEditing(false);
    router.refresh();
  }

  async function handleDelete() {
    setLoading(true);
    await deleteProject(project.id);
  }

  if (editing) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-gray-800">Edit Info Proyek</h2>
          <button onClick={() => { setEditing(false); setError(null); }} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nama Proyek <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
            <select
              value={form.status}
              onChange={(e) => setField("status", e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent bg-white"
            >
              {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Lokasi</label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => setField("location", e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nama Perumahan</label>
            <select
              value={form.perumahan_id}
              onChange={(e) => setField("perumahan_id", e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent bg-white"
            >
              <option value="">— Tidak dipilih —</option>
              {perumahanOptions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nomor Blok</label>
            <select
              value={form.blok_id}
              onChange={(e) => setField("blok_id", e.target.value)}
              disabled={!form.perumahan_id}
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent bg-white disabled:bg-gray-50 disabled:text-gray-400"
            >
              <option value="">— Tidak dipilih —</option>
              {availableBlok.map((b) => (
                <option key={b.id} value={b.id}>Blok {b.nomor}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Project Manager</label>
            <select
              value={form.pm_id}
              onChange={(e) => setField("pm_id", e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent bg-white"
            >
              <option value="">— Tidak dipilih —</option>
              {pmOptions.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Site Manager (Mandor)</label>
            <select
              value={form.site_manager_id}
              onChange={(e) => setField("site_manager_id", e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent bg-white"
            >
              <option value="">— Tidak dipilih —</option>
              {siteManagerOptions.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Tanggal Mulai</label>
            <input
              type="date"
              value={form.start_date}
              onChange={(e) => setField("start_date", e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Estimasi Selesai</label>
            <input
              type="date"
              value={form.end_date}
              onChange={(e) => setField("end_date", e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Total Anggaran (RAB)</label>
            <CurrencyInput
              value={form.budget_total}
              onChange={(raw) => setField("budget_total", raw)}
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Deskripsi</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent resize-none"
            />
          </div>
        </div>

        {error && (
          <div className="mt-4 px-4 py-3 rounded-lg text-sm font-medium bg-red-50 text-red-700 border border-red-200">{error}</div>
        )}

        <div className="flex gap-3 mt-5">
          <button
            onClick={() => { setEditing(false); setError(null); }}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-lg transition-colors disabled:opacity-60"
          >
            <Check className="w-4 h-4" />
            {loading ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-gray-800">Detail Proyek</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Edit
            </button>
            <button
              onClick={() => setShowDelete(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Hapus
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {project.perumahan_name && (
            <InfoRow icon={Home} label="Perumahan" value={project.perumahan_name} />
          )}
          {project.blok_nomor && (
            <InfoRow icon={Layers} label="Nomor Blok" value={`Blok ${project.blok_nomor}`} />
          )}
          <InfoRow icon={User} label="Project Manager" value={project.pm_name ?? "-"} />
          <InfoRow icon={HardHat} label="Site Manager (Mandor)" value={project.site_manager_name ?? "-"} />
          <InfoRow icon={MapPin} label="Lokasi" value={project.location ?? "-"} />
          <InfoRow
            icon={DollarSign}
            label="Total Anggaran (RAB)"
            value={formatRupiah(project.budget_total)}
            valueClass="font-semibold text-gray-900"
          />
          <InfoRow icon={Calendar} label="Tanggal Mulai" value={formatDate(project.start_date)} />
          <InfoRow icon={Calendar} label="Estimasi Selesai" value={formatDate(project.end_date)} />
          {project.description && (
            <div className="sm:col-span-2">
              <InfoRow icon={FileText} label="Deskripsi" value={project.description} />
            </div>
          )}
        </div>
      </div>

      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Hapus Proyek</h3>
                <p className="text-sm text-gray-500 mt-0.5">Tindakan ini tidak bisa dibatalkan</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              Yakin ingin menghapus proyek <strong>{project.name}</strong>? Semua data terkait (WBS, log, dokumen) akan ikut terhapus.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDelete(false)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors disabled:opacity-60"
              >
                {loading ? "Menghapus..." : "Hapus Proyek"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  valueClass = "text-gray-700",
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-gray-400" />
      </div>
      <div>
        <p className="text-xs text-gray-400 font-medium mb-0.5">{label}</p>
        <p className={`text-sm ${valueClass}`}>{value}</p>
      </div>
    </div>
  );
}
