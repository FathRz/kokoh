"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Edit2, Trash2, X, Check, AlertTriangle, TrendingUp, ChevronUp, ChevronDown, Calendar, LayoutList, GanttChartSquare } from "lucide-react";
import { ProjectDetail, WbsItem } from "./page";
import { createWbsItem, updateWbsItem, deleteWbsItem } from "../actions";
import CurrencyInput from "@/components/ui/CurrencyInput";
import GanttChart from "./GanttChart";

const BUDGET_WARNING = 250_000_000;

function formatRupiah(n: number) {
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(2)}M`;
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(2)}jt`;
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

interface Props {
  project: ProjectDetail;
  wbsItems: WbsItem[];
}

type FormMode = "create" | "edit" | null;

const EMPTY_FORM = {
  name: "",
  code: "",
  budget_amount: "",
  cost_weight: "",
  start_date: "",
  end_date: "",
  actual_progress: "",
};

export default function WbsTab({ project, wbsItems: initialItems }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // Optimistic progress overrides for the +5/-5 stepper only.
  // All other mutations rely on router.refresh() updating initialItems directly.
  const [view, setView] = useState<"table" | "gantt">("table");
  const [progressOverrides, setProgressOverrides] = useState<Record<string, number>>({});
  const [mode, setMode] = useState<FormMode>(null);
  const [editTarget, setEditTarget] = useState<WbsItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WbsItem | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Merge server items with any in-flight optimistic progress
  const items = initialItems.map((i) =>
    i.id in progressOverrides ? { ...i, actual_progress: progressOverrides[i.id] } : i
  );

  // Derived totals
  const totalWeight = items.reduce((s, i) => s + i.cost_weight, 0);
  const weightedProgress = items.reduce((s, i) => s + (i.cost_weight * i.actual_progress) / 100, 0);
  const overallProgress = totalWeight > 0 ? Math.round((weightedProgress / totalWeight) * 100) : 0;
  const totalBudget = items.reduce((s, i) => s + i.budget_amount, 0);
  const budgetOverLimit = totalBudget > BUDGET_WARNING;

  function openCreate(prefillStart?: string, prefillEnd?: string) {
    setForm({
      ...EMPTY_FORM,
      code: `WBS-${String(initialItems.length + 1).padStart(2, "0")}`,
      start_date: prefillStart ?? "",
      end_date: prefillEnd ?? "",
    });
    setEditTarget(null);
    setMode("create");
    setError(null);
  }

  function openEdit(item: WbsItem) {
    setForm({
      name: item.name,
      code: item.code,
      budget_amount: String(item.budget_amount),
      cost_weight: String(item.cost_weight),
      start_date: item.start_date ?? "",
      end_date: item.end_date ?? "",
      actual_progress: String(item.actual_progress),
    });
    setEditTarget(item);
    setMode("edit");
    setError(null);
  }

  function closeForm() {
    setMode(null);
    setEditTarget(null);
    setError(null);
  }

  function setField(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleBudgetChange(value: string) {
    const amount = parseFloat(value) || 0;
    const autoWeight =
      project.budget_total > 0
        ? Math.min(100, parseFloat(((amount / project.budget_total) * 100).toFixed(2)))
        : 0;
    setForm((f) => ({ ...f, budget_amount: value, cost_weight: String(autoWeight) }));
  }

  async function handleCreate() {
    if (!form.name.trim() || !form.code.trim()) { setError("Nama dan kode wajib diisi"); return; }
    setLoading(true);
    setError(null);
    const result = await createWbsItem(project.id, {
      name: form.name,
      code: form.code,
      budget_amount: parseFloat(form.budget_amount) || 0,
      cost_weight: parseFloat(form.cost_weight) || 0,
      planned_progress: 0,
      order_index: items.length,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
    });
    setLoading(false);
    if (result?.error) { setError(result.error); return; }
    closeForm();
    startTransition(() => router.refresh());
  }

  async function handleEdit() {
    if (!editTarget) return;
    if (!form.name.trim()) { setError("Nama wajib diisi"); return; }
    setLoading(true);
    setError(null);
    const result = await updateWbsItem(editTarget.id, project.id, {
      name: form.name,
      budget_amount: parseFloat(form.budget_amount) || 0,
      cost_weight: parseFloat(form.cost_weight) || 0,
      actual_progress: parseFloat(form.actual_progress) || 0,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
    });
    setLoading(false);
    if (result?.error) { setError(result.error); return; }
    closeForm();
    startTransition(() => router.refresh());
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setLoading(true);
    const result = await deleteWbsItem(deleteTarget.id, project.id);
    setLoading(false);
    if (result?.error) { setError(result.error); return; }
    setDeleteTarget(null);
    startTransition(() => router.refresh());
  }

  async function handleProgressChange(item: WbsItem, delta: number) {
    const newProgress = Math.min(100, Math.max(0, item.actual_progress + delta));
    setProgressOverrides((prev) => ({ ...prev, [item.id]: newProgress }));
    await updateWbsItem(item.id, project.id, { actual_progress: newProgress });
    setProgressOverrides((prev) => { const next = { ...prev }; delete next[item.id]; return next; });
    startTransition(() => router.refresh());
  }

  // Date constraints from project
  const minDate = project.start_date ?? undefined;
  const maxDate = project.end_date ?? undefined;

  return (
    <>
      <div className="space-y-4">
        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-500 font-medium mb-1">Total Anggaran RAP</p>
            <p className={`text-lg font-bold ${budgetOverLimit ? "text-red-600" : "text-gray-900"}`}>
              {formatRupiah(totalBudget)}
            </p>
            <div className="flex items-center gap-1 mt-0.5">
              <p className="text-xs text-gray-400">dari RAB {formatRupiah(project.budget_total)}</p>
              {budgetOverLimit && (
                <span className="text-xs font-medium text-red-500 flex items-center gap-0.5">
                  <AlertTriangle className="w-3 h-3" />
                  Melebihi batas
                </span>
              )}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-500 font-medium mb-1">Total Bobot</p>
            <p className={`text-lg font-bold ${Math.abs(totalWeight - 100) < 0.1 ? "text-green-600" : "text-yellow-600"}`}>
              {totalWeight.toFixed(1)}%
            </p>
            <p className="text-xs text-gray-400 mt-0.5">target 100%</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-500 font-medium mb-1">Progress Keseluruhan</p>
            <div className="flex items-end gap-2">
              <p className="text-lg font-bold text-brand-600">{overallProgress}%</p>
              <TrendingUp className="w-4 h-4 text-brand-400 mb-1" />
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1.5">
              <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${overallProgress}%` }} />
            </div>
          </div>
        </div>

        {/* Table / Gantt */}
        <div className="relative bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {isPending && view === "table" && <RefreshOverlay />}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800 text-sm">Rencana Anggaran Pelaksanaan (RAP)</h2>
            <div className="flex items-center gap-2">
              {/* View toggle */}
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
                <button
                  onClick={() => setView("table")}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors ${view === "table" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                >
                  <LayoutList className="w-3.5 h-3.5" />
                  Tabel
                </button>
                <button
                  onClick={() => setView("gantt")}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors ${view === "gantt" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                >
                  <GanttChartSquare className="w-3.5 h-3.5" />
                  Gantt
                </button>
              </div>
              <button
                onClick={() => openCreate()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Item
              </button>
            </div>
          </div>

          {view === "gantt" ? (
            <GanttChart
              project={project}
              items={items}
              isPending={isPending}
              onAdd={openCreate}
              onEdit={openEdit}
            />
          ) : items.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-gray-400">Belum ada item WBS. Klik "Tambah Item" untuk memulai.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 w-24">Kode</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Nama Pekerjaan</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Anggaran</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 w-20">Bobot</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 w-40">Jadwal</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 w-36">Realisasi</th>
                    <th className="px-4 py-3 w-20"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {items.map((item) => (
                    <WbsRow
                      key={item.id}
                      item={item}
                      onEdit={() => openEdit(item)}
                      onDelete={() => setDeleteTarget(item)}
                      onProgressChange={(delta) => handleProgressChange(item, delta)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit Modal */}
      {mode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">
                {mode === "create" ? "Tambah Item WBS" : "Edit Item WBS"}
              </h3>
              <button onClick={closeForm} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Nama Pekerjaan <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setField("name", e.target.value)}
                    placeholder="Pekerjaan Pondasi"
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Kode <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={(e) => setField("code", e.target.value.toUpperCase())}
                    disabled={mode === "edit"}
                    placeholder="WBS-01"
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent font-mono disabled:bg-gray-50 disabled:text-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Bobot (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    value={form.cost_weight}
                    onChange={(e) => setField("cost_weight", e.target.value)}
                    placeholder="0"
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Anggaran (Rp)</label>
                  <CurrencyInput
                    value={form.budget_amount}
                    onChange={handleBudgetChange}
                  />
                  {parseFloat(form.budget_amount) > 0 && project.budget_total > 0 && (
                    <p className="mt-1 text-xs text-gray-400">
                      = {parseFloat(form.cost_weight).toFixed(2)}% dari total RAB
                    </p>
                  )}
                </div>

                {/* Date range */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Tanggal Mulai
                  </label>
                  <input
                    type="date"
                    value={form.start_date}
                    min={minDate}
                    max={form.end_date || maxDate}
                    onChange={(e) => setField("start_date", e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Tanggal Selesai
                  </label>
                  <input
                    type="date"
                    value={form.end_date}
                    min={form.start_date || minDate}
                    max={maxDate}
                    onChange={(e) => setField("end_date", e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
                  />
                </div>

                {minDate && maxDate && (
                  <p className="col-span-2 text-xs text-gray-400 -mt-2">
                    Rentang proyek: {formatDate(minDate)} – {formatDate(maxDate)}
                  </p>
                )}

                {mode === "edit" && (
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Realisasi Progress (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.01}
                      value={form.actual_progress}
                      onChange={(e) => setField("actual_progress", e.target.value)}
                      placeholder="0"
                      className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
                    />
                  </div>
                )}
              </div>

              {error && (
                <div className="px-4 py-3 rounded-lg text-sm font-medium bg-red-50 text-red-700 border border-red-200">{error}</div>
              )}
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={closeForm} className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                Batal
              </button>
              <button
                onClick={mode === "create" ? handleCreate : handleEdit}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-lg transition-colors disabled:opacity-60"
              >
                <Check className="w-4 h-4" />
                {loading ? "Menyimpan..." : mode === "create" ? "Tambah" : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Hapus Item WBS</h3>
                <p className="text-sm text-gray-500 mt-0.5">{deleteTarget.code} — {deleteTarget.name}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-5">Yakin ingin menghapus item ini?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors disabled:opacity-60"
              >
                {loading ? "Menghapus..." : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function RefreshOverlay() {
  return (
    <div className="absolute inset-0 z-10 bg-white/65 flex items-center justify-center">
      <div className="flex items-center gap-2 bg-white rounded-full px-3.5 py-2 shadow-sm border border-gray-100">
        <span className="block w-3.5 h-3.5 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
        <span className="text-xs font-medium text-gray-500">Memperbarui...</span>
      </div>
    </div>
  );
}

function WbsRow({
  item,
  onEdit,
  onDelete,
  onProgressChange,
}: {
  item: WbsItem;
  onEdit: () => void;
  onDelete: () => void;
  onProgressChange: (delta: number) => void;
}) {
  return (
    <tr className="hover:bg-gray-50/50 transition-colors group">
      <td className="px-4 py-3">
        <span className="font-mono text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{item.code}</span>
      </td>
      <td className="px-4 py-3 font-medium text-gray-800">{item.name}</td>
      <td className="px-4 py-3 text-right text-gray-600 tabular-nums whitespace-nowrap">
        {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(item.budget_amount)}
      </td>
      <td className="px-4 py-3 text-right tabular-nums">
        <span className="text-gray-600">{item.cost_weight.toFixed(1)}%</span>
      </td>
      <td className="px-4 py-3 text-center">
        {item.start_date || item.end_date ? (
          <div className="flex flex-col items-center gap-0.5 text-xs text-gray-500">
            <span>{item.start_date ? new Date(item.start_date).toLocaleDateString("id-ID", { day: "numeric", month: "short" }) : "—"}</span>
            <span className="text-gray-300">↓</span>
            <span>{item.end_date ? new Date(item.end_date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "—"}</span>
          </div>
        ) : (
          <span className="text-xs text-gray-300">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onProgressChange(-5)}
            className="p-0.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <div className="flex-1">
            <div className="flex justify-center mb-1">
              <span className="text-xs font-semibold tabular-nums text-brand-600">
                {item.actual_progress.toFixed(1)}%
              </span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-500 rounded-full transition-all"
                style={{ width: `${item.actual_progress}%` }}
              />
            </div>
          </div>
          <button
            onClick={() => onProgressChange(5)}
            className="p-0.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onEdit} className="p-1.5 rounded text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}
