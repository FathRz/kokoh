"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, FolderPlus } from "lucide-react";
import { createProject } from "./actions";
import type { PerumahanOption, BlokOption, MemberOption } from "./page";
import CurrencyInput from "@/components/ui/CurrencyInput";

const STATUS_OPTIONS = [
  { value: "planning", label: "Perencanaan" },
  { value: "active", label: "Aktif" },
  { value: "on_hold", label: "Ditunda" },
];

interface Props {
  onClose: () => void;
  perumahanOptions: PerumahanOption[];
  blokOptions: BlokOption[];
  memberOptions: MemberOption[];
}

export default function CreateProjectModal({ onClose, perumahanOptions, blokOptions, memberOptions }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    code: "",
    location: "",
    status: "planning",
    start_date: "",
    end_date: "",
    budget_total: "",
    description: "",
    perumahan_id: "",
    blok_id: "",
    pm_id: "",
    site_manager_id: "",
  });

  const pmOptions = memberOptions.filter((m) => m.role === "project_manager" || m.role === "tenant_owner");
  const siteManagerOptions = memberOptions.filter((m) => m.role === "site_manager" || m.role === "tenant_owner");

  const availableBlokForSelected = blokOptions.filter(
    (b) => b.perumahan_id === form.perumahan_id && !b.taken
  );

  function set(key: string, value: string) {
    setForm((f) => {
      const updated = { ...f, [key]: value };
      if (key === "name" && !f.code) {
        updated.code = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
      }
      if (key === "perumahan_id") {
        updated.blok_id = ""; // reset blok when perumahan changes
      }
      return updated;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim()) {
      setError("Nama dan kode proyek wajib diisi");
      return;
    }
    setLoading(true);
    setError(null);

    const result = await createProject({
      ...form,
      budget_total: parseFloat(form.budget_total) || 0,
      perumahan_id: form.perumahan_id || null,
      blok_id: form.blok_id || null,
      pm_id: form.pm_id || null,
      site_manager_id: form.site_manager_id || null,
    });

    setLoading(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    router.refresh();
    onClose();
    if (result.id) router.push(`/dashboard/projects/${result.id}`);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
              <FolderPlus className="w-4 h-4 text-brand-500" />
            </div>
            <h3 className="font-semibold text-gray-800">Buat Proyek Baru</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Nama Proyek <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition-all"
                placeholder="Perumahan Grand Kokoh Residence"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Kode Proyek <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={form.code}
                onChange={(e) => set("code", e.target.value.toUpperCase())}
                maxLength={10}
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition-all font-mono"
                placeholder="GKR-2025"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition-all bg-white"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            {/* Perumahan */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nama Perumahan</label>
              <select
                value={form.perumahan_id}
                onChange={(e) => set("perumahan_id", e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition-all bg-white"
              >
                <option value="">— Pilih Perumahan —</option>
                {perumahanOptions.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              {perumahanOptions.length === 0 && (
                <p className="text-xs text-gray-400 mt-1">Tambahkan perumahan di Pengaturan → Perumahan & Blok</p>
              )}
            </div>

            {/* Blok */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nomor Blok</label>
              <select
                value={form.blok_id}
                onChange={(e) => set("blok_id", e.target.value)}
                disabled={!form.perumahan_id}
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition-all bg-white disabled:bg-gray-50 disabled:text-gray-400"
              >
                <option value="">— Pilih Blok —</option>
                {availableBlokForSelected.map((b) => (
                  <option key={b.id} value={b.id}>Blok {b.nomor}</option>
                ))}
              </select>
              {form.perumahan_id && availableBlokForSelected.length === 0 && (
                <p className="text-xs text-orange-500 mt-1">Semua blok sudah terpakai atau belum ada blok</p>
              )}
            </div>

            {/* Tim Proyek */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Project Manager</label>
              <select
                value={form.pm_id}
                onChange={(e) => set("pm_id", e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition-all bg-white"
              >
                <option value="">— Pilih PM —</option>
                {pmOptions.map((m) => (
                  <option key={m.id} value={m.id}>{m.full_name}</option>
                ))}
              </select>
              {pmOptions.length === 0 && (
                <p className="text-xs text-gray-400 mt-1">Belum ada anggota dengan role Project Manager</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Site Manager</label>
              <select
                value={form.site_manager_id}
                onChange={(e) => set("site_manager_id", e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition-all bg-white"
              >
                <option value="">— Pilih Site Manager —</option>
                {siteManagerOptions.map((m) => (
                  <option key={m.id} value={m.id}>{m.full_name}</option>
                ))}
              </select>
              {siteManagerOptions.length === 0 && (
                <p className="text-xs text-gray-400 mt-1">Belum ada anggota dengan role Site Manager</p>
              )}
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Lokasi</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition-all"
                placeholder="Jl. Contoh No. 1, Kota"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Tanggal Mulai</label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => set("start_date", e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Estimasi Selesai</label>
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => set("end_date", e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition-all"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Total Anggaran (RAB)</label>
              <CurrencyInput
                value={form.budget_total}
                onChange={(raw) => set("budget_total", raw)}
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Deskripsi</label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition-all resize-none"
                placeholder="Keterangan singkat proyek..."
              />
            </div>
          </div>

          {error && (
            <div className="px-4 py-3 rounded-lg text-sm font-medium bg-red-50 text-red-700 border border-red-200">
              {error}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit as unknown as React.MouseEventHandler}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-lg transition-colors disabled:opacity-60"
          >
            <FolderPlus className="w-4 h-4" />
            {loading ? "Menyimpan..." : "Buat Proyek"}
          </button>
        </div>
      </div>
    </div>
  );
}
