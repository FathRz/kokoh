"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ChevronDown, ChevronRight, X, Home, Layers } from "lucide-react";
import { createPerumahan, deletePerumahan, createBlok, deleteBlok } from "./actions";

export type PerumahanRow = {
  id: string;
  name: string;
  blok: BlokRow[];
};

export type BlokRow = {
  id: string;
  nomor: string;
  perumahan_id: string;
  project?: { id: string; name: string; status: string } | null;
};

const STATUS_LABELS: Record<string, string> = {
  planning: "Perencanaan",
  active: "Aktif",
  on_hold: "Ditunda",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

const STATUS_COLORS: Record<string, string> = {
  planning: "bg-blue-50 text-blue-600",
  active: "bg-green-50 text-green-600",
  on_hold: "bg-yellow-50 text-yellow-600",
  completed: "bg-gray-50 text-gray-500",
  cancelled: "bg-red-50 text-red-500",
};

interface Props {
  perumahan: PerumahanRow[];
}

export default function PerumahanTab({ perumahan }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showAddPerumahan, setShowAddPerumahan] = useState(false);
  const [newPerumahanName, setNewPerumahanName] = useState("");
  const [addBlokFor, setAddBlokFor] = useState<string | null>(null);
  const [newBlokNomor, setNewBlokNomor] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: string) {
    setExpanded((e) => ({ ...e, [id]: !e[id] }));
  }

  async function handleAddPerumahan() {
    if (!newPerumahanName.trim()) return;
    setLoading(true);
    setError(null);
    const result = await createPerumahan(newPerumahanName);
    setLoading(false);
    if (result?.error) { setError(result.error); return; }
    setNewPerumahanName("");
    setShowAddPerumahan(false);
    startTransition(() => router.refresh());
  }

  async function handleDeletePerumahan(id: string) {
    setLoading(true);
    const result = await deletePerumahan(id);
    setLoading(false);
    if (result?.error) { setError(result.error); return; }
    startTransition(() => router.refresh());
  }

  async function handleAddBlok(perumahanId: string) {
    if (!newBlokNomor.trim()) return;
    setLoading(true);
    setError(null);
    const result = await createBlok(perumahanId, newBlokNomor);
    setLoading(false);
    if (result?.error) { setError(result.error); return; }
    setNewBlokNomor("");
    setAddBlokFor(null);
    startTransition(() => router.refresh());
  }

  async function handleDeleteBlok(id: string) {
    setLoading(true);
    const result = await deleteBlok(id);
    setLoading(false);
    if (result?.error) { setError(result.error); return; }
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">Kelola master data perumahan dan nomor blok</p>
        </div>
        <button
          onClick={() => { setShowAddPerumahan(true); setError(null); }}
          className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Tambah Perumahan
        </button>
      </div>

      {/* Add Perumahan Form */}
      {showAddPerumahan && (
        <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 flex gap-3 items-center">
          <Home className="w-4 h-4 text-brand-500 shrink-0" />
          <input
            type="text"
            autoFocus
            value={newPerumahanName}
            onChange={(e) => setNewPerumahanName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddPerumahan()}
            placeholder="Nama perumahan, mis: Grand Kokoh Residence"
            className="flex-1 text-sm bg-white border border-brand-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
          />
          <button
            onClick={handleAddPerumahan}
            disabled={loading || !newPerumahanName.trim()}
            className="px-3.5 py-2 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-lg disabled:opacity-60 transition-colors"
          >
            Simpan
          </button>
          <button
            onClick={() => { setShowAddPerumahan(false); setNewPerumahanName(""); }}
            className="p-2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="px-4 py-3 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200">{error}</div>
      )}

      {/* List */}
      {perumahan.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          Belum ada perumahan. Klik "Tambah Perumahan" untuk memulai.
        </div>
      ) : (
        <div className="relative space-y-3">
          {isPending && (
            <div className="absolute inset-0 z-10 bg-white/65 rounded-xl flex items-center justify-center">
              <div className="flex items-center gap-2 bg-white rounded-full px-3.5 py-2 shadow-sm border border-gray-100">
                <span className="block w-3.5 h-3.5 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
                <span className="text-xs font-medium text-gray-500">Memperbarui...</span>
              </div>
            </div>
          )}
          {perumahan.map((p) => (
            <div key={p.id} className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
              {/* Perumahan header */}
              <div className="flex items-center gap-3 px-4 py-3">
                <button
                  onClick={() => toggle(p.id)}
                  className="flex items-center gap-2 flex-1 text-left"
                >
                  {expanded[p.id]
                    ? <ChevronDown className="w-4 h-4 text-gray-400" />
                    : <ChevronRight className="w-4 h-4 text-gray-400" />
                  }
                  <Home className="w-4 h-4 text-brand-400" />
                  <span className="font-medium text-gray-800 text-sm">{p.name}</span>
                  <span className="text-xs text-gray-400 ml-1">({p.blok.length} blok)</span>
                </button>
                <button
                  onClick={() => handleDeletePerumahan(p.id)}
                  disabled={loading || p.blok.length > 0}
                  title={p.blok.length > 0 ? "Hapus semua blok terlebih dahulu" : "Hapus perumahan"}
                  className="p-1.5 text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Blok list */}
              {expanded[p.id] && (
                <div className="border-t border-gray-50 px-4 pb-3 pt-2">
                  <div className="space-y-2 mb-3">
                    {p.blok.length === 0 && (
                      <p className="text-xs text-gray-400 py-1">Belum ada blok</p>
                    )}
                    {p.blok.map((b) => (
                      <div key={b.id} className="flex items-center gap-2 py-1">
                        <Layers className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                        <span className="text-sm text-gray-700 font-medium min-w-[60px]">Blok {b.nomor}</span>
                        {b.project ? (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[b.project.status] ?? ""}`}>
                            {STATUS_LABELS[b.project.status] ?? b.project.status}: {b.project.name}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">Tersedia</span>
                        )}
                        <button
                          onClick={() => handleDeleteBlok(b.id)}
                          disabled={loading || !!b.project}
                          title={b.project ? "Blok sedang digunakan" : "Hapus blok"}
                          className="ml-auto p-1 text-gray-300 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add blok inline */}
                  {addBlokFor === p.id ? (
                    <div className="flex gap-2 items-center mt-2">
                      <span className="text-sm text-gray-500">Blok</span>
                      <input
                        type="text"
                        autoFocus
                        value={newBlokNomor}
                        onChange={(e) => setNewBlokNomor(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddBlok(p.id)}
                        placeholder="A, B, C, 1, 2 ..."
                        className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
                      />
                      <button
                        onClick={() => handleAddBlok(p.id)}
                        disabled={loading || !newBlokNomor.trim()}
                        className="px-3 py-1.5 text-xs font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-lg disabled:opacity-60 transition-colors"
                      >
                        Tambah
                      </button>
                      <button
                        onClick={() => { setAddBlokFor(null); setNewBlokNomor(""); }}
                        className="p-1.5 text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setAddBlokFor(p.id); setNewBlokNomor(""); setExpanded((e) => ({ ...e, [p.id]: true })); }}
                      className="flex items-center gap-1.5 text-xs text-brand-500 hover:text-brand-600 font-medium mt-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Tambah Blok
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
