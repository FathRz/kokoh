"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Sun, Cloud, CloudRain, Zap,
  Plus, Minus, Check, AlertCircle, WifiOff, RefreshCw,
  ClipboardList, Camera, X, Users, ChevronRight,
  TrendingUp, Clock, CheckCircle, XCircle, Edit2,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { submitDailyReport, updateDailyReport, saveReportPhoto } from "./actions";
import { offlineDB, type OfflineDailyReport } from "@/lib/db/offline";
import type { ReportProject, ReportWbsItem, SubmittedReport, ReportPhoto } from "./page";
import PhotoCapture from "./PhotoCapture";
import { createClient } from "@/lib/supabase/client";

const WEATHER_OPTIONS = [
  { value: "cerah",        label: "Cerah",   icon: Sun,       color: "text-yellow-500 bg-yellow-50 border-yellow-300" },
  { value: "berawan",      label: "Berawan", icon: Cloud,     color: "text-gray-500 bg-gray-50 border-gray-300" },
  { value: "hujan_ringan", label: "Hujan",   icon: CloudRain, color: "text-blue-500 bg-blue-50 border-blue-300" },
  { value: "hujan_lebat",  label: "Deras",   icon: Zap,       color: "text-indigo-500 bg-indigo-50 border-indigo-300" },
] as const;

const WEATHER_DISPLAY: Record<string, { label: string; Icon: React.ElementType; cls: string }> = {
  cerah:        { label: "Cerah",   Icon: Sun,       cls: "text-yellow-500" },
  berawan:      { label: "Berawan", Icon: Cloud,     cls: "text-gray-400"   },
  hujan_ringan: { label: "Hujan",   Icon: CloudRain, cls: "text-blue-500"   },
  hujan_lebat:  { label: "Deras",   Icon: Zap,       cls: "text-indigo-500" },
};

type ItemStatus = "idle" | "submitting" | "offline_saved" | "error";
type PhotoEntry = ReportPhoto & { caption: string };

interface ItemForm {
  newProgress: number;
  notes: string;
  status: ItemStatus;
  errorMsg: string;
  photos: PhotoEntry[];
  reportId: string | null;
}

interface Props {
  userId: string;
  tenantId: string;
  projects: ReportProject[];
  todayWbsItems: ReportWbsItem[];
  submittedToday: SubmittedReport[];
  reportHistory: SubmittedReport[];
  today: string;
}

function formatTime(isoStr: string) {
  return new Date(isoStr).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function formatShortDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

export default function TodayTasksView({
  userId, tenantId, projects, todayWbsItems, submittedToday, reportHistory, today,
}: Props) {
  const router = useRouter();
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id ?? "");
  const [weather, setWeather] = useState(() => submittedToday[0]?.weather ?? "cerah");
  const [laborCount, setLaborCount] = useState(() => submittedToday[0]?.labor_count ?? 1);
  const [isOnline, setIsOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [photoTarget, setPhotoTarget] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [editTargetReportId, setEditTargetReportId] = useState<string | null>(null);
  const [editingReport, setEditingReport] = useState<SubmittedReport | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  function closeSheet() {
    setActiveItemId(null);
    setEditTargetReportId(null);
    setEditingReport(null);
  }

  function handleEditReport(report: SubmittedReport, wbsItemId: string) {
    setItemForms((prev) => ({
      ...prev,
      [wbsItemId]: {
        ...prev[wbsItemId],
        newProgress: report.actual_progress,
        notes: report.notes ?? "",
        status: "idle",
        errorMsg: "",
        photos: [],
        reportId: report.id,
      },
    }));
    setWeather(report.weather);
    setLaborCount(report.labor_count);
    setEditTargetReportId(report.id);
    setEditingReport(report);
    setActiveItemId(wbsItemId);
  }

  // Derive: latest report per WBS (reportHistory sorted desc → first match is latest)
  const latestByWbs = new Map<string, SubmittedReport>();
  for (const r of reportHistory) {
    const key = r.wbs_item_id ?? "__project__";
    if (!latestByWbs.has(key)) latestByWbs.set(key, r);
  }

  // Derive: all today's reports per WBS
  const todayByWbs: Record<string, SubmittedReport[]> = {};
  for (const r of submittedToday) {
    const key = r.wbs_item_id ?? "__project__";
    if (!todayByWbs[key]) todayByWbs[key] = [];
    todayByWbs[key].push(r);
  }

  // Derive: full history per WBS for the riwayat section
  const historyByWbs = reportHistory.reduce<Record<string, SubmittedReport[]>>((acc, r) => {
    const key = r.wbs_item_id ?? "__project__";
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  const filteredItems = todayWbsItems.filter((item) => item.project_id === selectedProjectId);

  // ItemForm per WBS — always starts idle so multiple submissions per day are allowed
  const [itemForms, setItemForms] = useState<Record<string, ItemForm>>(() => {
    const map: Record<string, ItemForm> = {};
    for (const item of todayWbsItems) {
      const latest = latestByWbs.get(item.id);
      const latestIsRejected = latest?.is_approved === false;
      map[item.id] = {
        newProgress: latest?.actual_progress ?? item.actual_progress,
        notes: "",
        status: "idle",
        errorMsg: latestIsRejected ? (latest?.rejection_note ?? "") : "",
        photos: [],
        reportId: null,
      };
    }
    return map;
  });

  function setItemField<K extends keyof ItemForm>(id: string, key: K, value: ItemForm[K]) {
    setItemForms((prev) => ({ ...prev, [id]: { ...prev[id], [key]: value } }));
  }

  // Lock body scroll when sheet is open
  useEffect(() => {
    if (activeItemId) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [activeItemId]);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const onOnline = () => { setIsOnline(true); syncQueue(); };
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    offlineDB.dailyReports
      .where("_sync_status").equals("pending")
      .count()
      .then(setPendingCount)
      .catch(() => {});
  }, []);

  const syncQueue = useCallback(async () => {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const pending = await offlineDB.dailyReports
        .where("_sync_status").equals("pending").toArray();
      if (pending.length === 0) { setSyncing(false); setPendingCount(0); return; }
      let synced = 0;
      for (const item of pending) {
        const result = await submitDailyReport({
          project_id: item.project_id,
          wbs_item_id: item.wbs_item_id,
          report_date: item.report_date,
          actual_progress: item.actual_progress,
          labor_count: item.labor_count,
          weather: item.weather,
          notes: item.notes ?? "",
        });
        if (!result?.error) {
          await offlineDB.dailyReports.update(item.id, { _sync_status: "synced", _server_id: result.id });
          const photos = await offlineDB.reportPhotos
            .where("report_local_id").equals(item.id)
            .and((p) => p._sync_status === "pending")
            .toArray();
          for (const photo of photos) {
            try {
              const supabase = createClient();
              const filename = `${tenantId}/daily-reports/${item.report_date}/${photo.id}.webp`;
              const { error: uploadErr } = await supabase.storage
                .from("progress-photos")
                .upload(filename, photo.image_blob, { contentType: "image/webp", upsert: true });
              if (!uploadErr && result.id) {
                await saveReportPhoto(result.id, filename, photo.caption ?? "");
                await offlineDB.reportPhotos.update(photo.id, { _sync_status: "synced" });
              }
            } catch { /* skip */ }
          }
          synced++;
        } else {
          await offlineDB.dailyReports.update(item.id, { _sync_status: "error", _sync_error: result.error });
        }
      }
      const remaining = await offlineDB.dailyReports.where("_sync_status").equals("pending").count();
      setPendingCount(remaining);
      setSyncMsg(`${synced} laporan berhasil disinkronkan`);
      if (synced > 0) router.refresh();
    } catch {
      setSyncMsg("Gagal sinkronisasi, coba lagi");
    } finally {
      setSyncing(false);
    }
  }, [tenantId, router]);

  async function handleSubmitItem(wbsItemId: string) {
    const form = itemForms[wbsItemId];
    if (!form) return;
    setItemField(wbsItemId, "status", "submitting");
    setItemField(wbsItemId, "errorMsg", "");

    // Edit mode: update existing report
    if (editTargetReportId) {
      const result = await updateDailyReport(editTargetReportId, {
        actual_progress: form.newProgress,
        labor_count: laborCount,
        weather,
        notes: form.notes,
      });
      if (result?.error) {
        setItemField(wbsItemId, "status", "error");
        setItemField(wbsItemId, "errorMsg", result.error);
      } else {
        setItemForms((prev) => ({
          ...prev,
          [wbsItemId]: { ...prev[wbsItemId], status: "idle", notes: "", photos: [], errorMsg: "" },
        }));
        closeSheet();
        router.refresh();
      }
      return;
    }

    const payload = {
      project_id: selectedProjectId,
      wbs_item_id: wbsItemId,
      report_date: today,
      actual_progress: form.newProgress,
      labor_count: laborCount,
      weather,
      notes: form.notes,
    };

    if (!isOnline) {
      const localId = crypto.randomUUID();
      await offlineDB.dailyReports.add({
        id: localId, ...payload, tenant_id: tenantId, created_by: userId,
        _sync_status: "pending",
      } as OfflineDailyReport);
      setPendingCount((c) => c + 1);
      setItemField(wbsItemId, "status", "offline_saved");
      closeSheet();
      return;
    }

    const result = await submitDailyReport(payload);
    if (result?.error) {
      setItemField(wbsItemId, "status", "error");
      setItemField(wbsItemId, "errorMsg", result.error);
    } else {
      setItemForms((prev) => ({
        ...prev,
        [wbsItemId]: {
          ...prev[wbsItemId],
          status: "idle",
          notes: "",
          photos: [],
          errorMsg: "",
          reportId: result.id ?? null,
        },
      }));
      closeSheet();
      router.refresh();
    }
  }

  function adjustProgress(id: string, delta: number) {
    setItemForms((prev) => {
      const current = prev[id]?.newProgress ?? 0;
      const clamped = Math.min(100, Math.max(0, current + delta));
      return { ...prev, [id]: { ...prev[id], newProgress: clamped } };
    });
  }

  const currentProject = projects.find((p) => p.id === selectedProjectId);
  const activeItem = activeItemId ? filteredItems.find((i) => i.id === activeItemId) : null;
  const activeForm = activeItemId ? itemForms[activeItemId] : null;
  const activeHistory = activeItemId ? (historyByWbs[activeItemId] ?? []) : [];
  // The progress baseline for "Sebelumnya" hint in the sheet
  const latestKnownProgress = activeItemId
    ? (latestByWbs.get(activeItemId)?.actual_progress ?? activeItem?.actual_progress ?? 0)
    : 0;

  if (projects.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <ClipboardList className="w-7 h-7 text-gray-400" />
        </div>
        <h2 className="text-base font-semibold text-gray-800 mb-1">Belum ada proyek</h2>
        <p className="text-sm text-gray-400 max-w-xs">
          Anda belum ditugaskan ke proyek apapun. Hubungi Project Manager untuk assignment.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-lg mx-auto space-y-4 pb-24 md:pb-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-gray-900">Laporan Harian</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {new Date(today + "T00:00:00").toLocaleDateString("id-ID", {
              weekday: "long", day: "numeric", month: "long", year: "numeric",
            })}
          </p>
        </div>

        {/* Offline banner */}
        {!isOnline && (
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-orange-50 border border-orange-200 text-orange-700 text-sm">
            <WifiOff className="w-4 h-4 shrink-0" />
            <span className="font-medium">Mode Offline</span>
            <span className="text-orange-500 text-xs">— tersimpan lokal, sinkron saat online</span>
          </div>
        )}
        {pendingCount > 0 && isOnline && (
          <div className="flex items-center justify-between gap-2.5 px-4 py-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-sm">
            <div className="flex items-center gap-2">
              <RefreshCw className={cn("w-4 h-4 shrink-0", syncing && "animate-spin")} />
              <span>{pendingCount} laporan menunggu sinkronisasi</span>
            </div>
            <button onClick={syncQueue} disabled={syncing} className="text-xs font-semibold underline">
              {syncing ? "Menyinkronkan..." : "Sinkronkan"}
            </button>
          </div>
        )}
        {syncMsg && (
          <div className="px-4 py-2.5 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm flex items-center gap-2">
            <Check className="w-4 h-4" />
            {syncMsg}
          </div>
        )}

        {/* Project selector */}
        {projects.length > 1 && (
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="w-full px-4 py-3 text-sm font-medium border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-400"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
            ))}
          </select>
        )}

        {/* WBS item cards */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2.5">
            Pekerjaan Aktif
            {currentProject && <span className="ml-1 normal-case font-normal text-gray-400">— {currentProject.name}</span>}
          </p>

          {filteredItems.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
              <ClipboardList className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">
                Tidak ada WBS aktif hari ini.<br />
                <span className="text-xs">Pastikan tanggal WBS mencakup hari ini.</span>
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredItems.map((item) => {
                const form = itemForms[item.id];
                if (!form) return null;
                const latestReport = latestByWbs.get(item.id) ?? null;
                const todayReports = todayByWbs[item.id] ?? [];
                const latestTodayReport = todayReports[0] ?? null;

                const wbsHistory = historyByWbs[item.id] ?? [];

                return (
                  <WbsCard
                    key={item.id}
                    item={item}
                    form={form}
                    latestReport={latestReport}
                    latestTodayReport={latestTodayReport}
                    todayCount={todayReports.length}
                    history={wbsHistory}
                    today={today}
                    onOpen={() => setActiveItemId(item.id)}
                    onEditReport={(report) => handleEditReport(report, item.id)}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Sheet Overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/50 transition-opacity duration-300",
          activeItemId ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={closeSheet}
      />

      {/* Bottom Sheet */}
      <div
        ref={sheetRef}
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-2xl transition-transform duration-300 ease-out flex flex-col",
          "max-h-[92dvh]",
          activeItemId ? "translate-y-0" : "translate-y-full"
        )}
      >
        {activeItem && activeForm && (
          <>
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-gray-300" />
            </div>

            {/* Sheet header */}
            <div className="flex items-start justify-between px-5 py-3 border-b border-gray-100 shrink-0">
              <div className="min-w-0 pr-3">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <span className="font-mono text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                    {activeItem.code}
                  </span>
                  {editingReport ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">
                      <Edit2 className="w-2.5 h-2.5" />
                      Edit — {editingReport.report_date === today
                        ? `Hari ini ${formatTime(editingReport.created_at)}`
                        : formatShortDate(editingReport.report_date)}
                    </span>
                  ) : (todayByWbs[activeItem.id]?.length ?? 0) > 0 && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-brand-50 text-brand-600 border border-brand-200">
                      {todayByWbs[activeItem.id].length} laporan hari ini
                    </span>
                  )}
                </div>
                <p className="font-semibold text-gray-900 text-sm leading-snug">{activeItem.name}</p>
              </div>
              <button
                onClick={closeSheet}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">

              {/* Server error */}
              {activeForm.status === "error" && activeForm.errorMsg && (
                <div className="px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>{activeForm.errorMsg}</span>
                </div>
              )}

              {/* Kondisi Lapangan */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Kondisi Lapangan</p>

                {/* Weather */}
                <div className="grid grid-cols-4 gap-2">
                  {WEATHER_OPTIONS.map(({ value, label, icon: Icon, color }) => (
                    <button
                      key={value}
                      onClick={() => setWeather(value)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-xs font-medium",
                        weather === value ? color + " border-current" : "border-gray-100 text-gray-400 hover:border-gray-200 bg-white"
                      )}
                    >
                      <Icon className="w-5 h-5" />
                      {label}
                    </button>
                  ))}
                </div>

                {/* Workers */}
                <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2 text-sm text-gray-700 font-medium">
                    <Users className="w-4 h-4 text-gray-400" />
                    Jumlah Pekerja
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setLaborCount((c) => Math.max(0, c - 1))}
                      className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-gray-200 hover:bg-gray-100 transition-colors"
                    >
                      <Minus className="w-4 h-4 text-gray-600" />
                    </button>
                    <span className="text-xl font-bold text-gray-900 min-w-[2rem] text-center tabular-nums">
                      {laborCount}
                    </span>
                    <button
                      onClick={() => setLaborCount((c) => c + 1)}
                      className="w-9 h-9 flex items-center justify-center rounded-full bg-brand-50 border border-brand-200 hover:bg-brand-100 transition-colors"
                    >
                      <Plus className="w-4 h-4 text-brand-600" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Progress */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Progress Baru</p>
                  <span className="text-2xl font-bold text-brand-600 tabular-nums">
                    {activeForm.newProgress.toFixed(0)}%
                  </span>
                </div>

                {/* Reference bar */}
                <div className="space-y-1">
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-500 rounded-full transition-all duration-200"
                      style={{ width: `${activeForm.newProgress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-400">
                    <span>Sebelumnya: {latestKnownProgress.toFixed(0)}%</span>
                    <span>Target: {activeItem.planned_progress.toFixed(0)}%</span>
                  </div>
                </div>

                {/* Slider */}
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={activeForm.newProgress}
                  onChange={(e) => setItemField(activeItem.id, "newProgress", Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-brand-500"
                />

                {/* Steppers */}
                <div className="flex gap-2">
                  {[-10, -5, +5, +10, +25].map((delta) => (
                    <button
                      key={delta}
                      onClick={() => adjustProgress(activeItem.id, delta)}
                      className={cn(
                        "flex-1 py-2 text-xs font-semibold rounded-lg border transition-colors",
                        delta < 0
                          ? "border-gray-200 text-gray-600 hover:bg-gray-50 bg-white"
                          : "border-brand-100 text-brand-600 bg-brand-50 hover:bg-brand-100"
                      )}
                    >
                      {delta > 0 ? `+${delta}%` : `${delta}%`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Catatan Lapangan
                </label>
                <textarea
                  rows={3}
                  value={activeForm.notes}
                  onChange={(e) => setItemField(activeItem.id, "notes", e.target.value)}
                  placeholder="Kendala, catatan pekerjaan, hambatan..."
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent resize-none"
                />
              </div>

              {/* Photos */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Foto Progres</p>
                {/* Existing photos when editing */}
                {editingReport && editingReport.photos.length > 0 && (
                  <div className="mb-2">
                    <p className="text-[10px] text-gray-400 mb-1.5">Foto yang sudah ada:</p>
                    <div className="flex gap-2 flex-wrap">
                      {editingReport.photos.map((ph) => (
                        <button
                          key={ph.id}
                          onClick={() => setLightboxUrl(ph.public_url)}
                          className="group shrink-0"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={ph.public_url}
                            alt={ph.caption ?? ""}
                            className="w-20 h-20 object-cover rounded-xl border border-gray-200 group-hover:opacity-80 transition-opacity"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {/* New photos added this session */}
                {activeForm.photos.length > 0 && (
                  <div className="flex gap-2 flex-wrap mb-3">
                    {activeForm.photos.map((photo) => (
                      <div key={photo.id} className="relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo.public_url}
                          alt={photo.caption}
                          className="w-20 h-20 object-cover rounded-xl border border-gray-200"
                        />
                        <button
                          onClick={() => setItemForms((prev) => ({
                            ...prev,
                            [activeItem.id]: {
                              ...prev[activeItem.id],
                              photos: prev[activeItem.id].photos.filter((p) => p.id !== photo.id),
                            },
                          }))}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white shadow"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => setPhotoTarget(activeItem.id)}
                  disabled={!activeForm.reportId}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl border transition-colors w-full justify-center",
                    activeForm.reportId
                      ? "border-brand-200 text-brand-600 bg-brand-50 hover:bg-brand-100"
                      : "border-gray-200 text-gray-400 cursor-not-allowed bg-gray-50"
                  )}
                >
                  <Camera className="w-4 h-4" />
                  {activeForm.reportId ? "Tambah Foto Progres" : "Simpan laporan dulu untuk foto"}
                </button>
              </div>

              {/* Riwayat Laporan */}
              {activeHistory.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2.5">
                    Riwayat — {activeHistory.length} laporan
                  </p>
                  <div className="space-y-2">
                    {activeHistory.map((h, idx) => {
                      const olderEntry = activeHistory[idx + 1];
                      const delta = olderEntry ? h.actual_progress - olderEntry.actual_progress : null;
                      const isToday = h.report_date === today;
                      const W = WEATHER_DISPLAY[h.weather] ?? WEATHER_DISPLAY.berawan;

                      return (
                        <div key={h.id} className="bg-gray-50 rounded-xl px-3 py-3 space-y-2">
                          {/* Line 1: status dot + time + delta + progress + status label */}
                          <div className="flex items-center gap-2">
                            <HistoryStatusDot isApproved={h.is_approved} />
                            <span className="text-xs font-medium text-gray-600">
                              {isToday
                                ? `Hari ini ${formatTime(h.created_at)}`
                                : `${formatShortDate(h.report_date)} ${formatTime(h.created_at)}`
                              }
                            </span>
                            {delta !== null && delta !== 0 && (
                              <span className={cn("text-[10px] font-bold",
                                delta > 0 ? "text-green-500" : "text-red-500"
                              )}>
                                {delta > 0 ? `+${delta.toFixed(0)}` : delta.toFixed(0)}%
                              </span>
                            )}
                            <span className="text-sm font-bold text-gray-800 tabular-nums ml-auto">
                              {h.actual_progress.toFixed(0)}%
                            </span>
                            <span className={cn("text-[10px] font-semibold shrink-0",
                              h.is_approved === true  ? "text-green-600" :
                              h.is_approved === false ? "text-red-500"   : "text-yellow-600"
                            )}>
                              {h.is_approved === true ? "Disetujui" : h.is_approved === false ? "Ditolak" : "Menunggu"}
                            </span>
                          </div>
                          {/* Line 2: weather + workers + notes */}
                          <div className="flex items-center gap-1.5 text-[10px] text-gray-400 flex-wrap">
                            <W.Icon className={cn("w-3 h-3 shrink-0", W.cls)} />
                            <span>{W.label}</span>
                            <span className="text-gray-300">·</span>
                            <Users className="w-3 h-3 shrink-0" />
                            <span>{h.labor_count} orang</span>
                            {h.notes && (
                              <>
                                <span className="text-gray-300">·</span>
                                <span className="italic">{h.notes}</span>
                              </>
                            )}
                          </div>
                          {/* Photos — tap to lightbox */}
                          {h.photos.length > 0 && (
                            <div className="flex gap-2 flex-wrap">
                              {h.photos.map((ph) => (
                                <button
                                  key={ph.id}
                                  onClick={() => setLightboxUrl(ph.public_url)}
                                  className="group shrink-0"
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={ph.public_url}
                                    alt={ph.caption ?? ""}
                                    className="w-16 h-16 object-cover rounded-xl border border-gray-200 group-hover:opacity-80 transition-opacity"
                                  />
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Spacer so submit button is reachable */}
              <div className="h-2" />
            </div>

            {/* Sticky submit */}
            <div className="px-5 py-4 border-t border-gray-100 shrink-0 bg-white">
              <button
                onClick={() => handleSubmitItem(activeItem.id)}
                disabled={activeForm.status === "submitting"}
                className={cn(
                  "w-full flex items-center justify-center gap-2 py-4 text-sm font-bold rounded-2xl transition-colors",
                  activeForm.status === "submitting"
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : isOnline
                    ? "bg-brand-500 hover:bg-brand-600 text-white shadow-brand-sm"
                    : "bg-orange-500 hover:bg-orange-600 text-white"
                )}
              >
                {activeForm.status === "submitting" ? (
                  <><span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> Menyimpan...</>
                ) : editTargetReportId ? (
                  <><Edit2 className="w-4 h-4" /> Perbarui Laporan</>
                ) : isOnline ? (
                  <><Check className="w-4 h-4" /> Kirim Laporan</>
                ) : (
                  <><WifiOff className="w-4 h-4" /> Simpan Offline</>
                )}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxUrl(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxUrl}
            alt="Foto laporan"
            className="max-w-full max-h-full rounded-xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 w-9 h-9 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Photo Capture Modal */}
      {photoTarget && (
        <PhotoCapture
          reportId={itemForms[photoTarget]?.reportId ?? ""}
          projectName={currentProject?.name ?? ""}
          today={today}
          tenantId={tenantId}
          isOnline={isOnline}
          onUploaded={(photo) => {
            setItemForms((prev) => ({
              ...prev,
              [photoTarget]: {
                ...prev[photoTarget],
                photos: [...prev[photoTarget].photos, photo],
              },
            }));
            setPhotoTarget(null);
          }}
          onOfflineSaved={(localId, blob) => {
            offlineDB.reportPhotos.add({
              id: localId,
              report_local_id: itemForms[photoTarget]?.reportId ?? photoTarget,
              image_blob: blob,
              caption: null,
              _sync_status: "pending",
            });
            setPhotoTarget(null);
          }}
          onClose={() => setPhotoTarget(null)}
        />
      )}
    </>
  );
}

// ─── WBS Summary Card ──────────────────────────────────────

interface WbsCardProps {
  item: ReportWbsItem;
  form: ItemForm;
  latestReport: SubmittedReport | null;
  latestTodayReport: SubmittedReport | null;
  todayCount: number;
  history: SubmittedReport[];
  today: string;
  onOpen: () => void;
  onEditReport: (report: SubmittedReport) => void;
}

function WbsCard({ item, form, latestReport, latestTodayReport, todayCount, history, today, onOpen, onEditReport }: WbsCardProps) {
  const displayProgress = latestReport?.actual_progress ?? item.actual_progress;
  const isRejected = latestTodayReport?.is_approved === false;
  const isPending  = latestTodayReport?.is_approved === null;
  const isApproved = latestTodayReport?.is_approved === true;

  const borderColor =
    form.status === "offline_saved"  ? "border-blue-200 bg-blue-50/30"      :
    isRejected                        ? "border-red-200 bg-red-50/20"        :
    isPending && todayCount > 0       ? "border-yellow-200 bg-yellow-50/20"  :
    isApproved                        ? "border-green-200 bg-green-50/30"    :
    "border-gray-100 bg-white";

  return (
    <div className={cn("rounded-2xl border shadow-sm overflow-hidden transition-all", borderColor)}>

      {/* ── Clickable main area ── */}
      <button
        onClick={onOpen}
        className="w-full text-left px-4 py-4 flex items-start gap-3 hover:bg-black/[0.02] transition-colors"
      >
        <div className="flex-1 min-w-0">
          {/* Code + status chip */}
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-mono text-[10px] text-gray-400 bg-white border border-gray-200 px-1.5 py-0.5 rounded shrink-0">
              {item.code}
            </span>
            {form.status === "offline_saved" && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
                <WifiOff className="w-2.5 h-2.5" /> Offline
              </span>
            )}
            {todayCount > 0 && (
              <span className={cn(
                "inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                isRejected ? "bg-red-100 text-red-700"     :
                isApproved ? "bg-green-100 text-green-700"  :
                             "bg-yellow-50 text-yellow-700"
              )}>
                {isRejected ? <><XCircle className="w-2.5 h-2.5" /> Ditolak</>     :
                 isApproved ? <><CheckCircle className="w-2.5 h-2.5" /> Disetujui</> :
                              <><Clock className="w-2.5 h-2.5" /> {todayCount} laporan</>}
              </span>
            )}
          </div>

          {/* Name */}
          <p className="font-semibold text-gray-900 text-sm leading-snug mb-2">{item.name}</p>

          {/* Progress bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-gray-400">
              <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Aktual</span>
              <span className="font-semibold text-gray-600">
                <span className="text-brand-600">{displayProgress.toFixed(0)}%</span>
                <span className="text-gray-300 mx-1">/</span>
                {item.planned_progress.toFixed(0)}% target
              </span>
            </div>
            <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="absolute top-0 bottom-0 w-0.5 bg-gray-300" style={{ left: `${item.planned_progress}%` }} />
              <div
                className={cn("h-full rounded-full transition-all",
                  isRejected ? "bg-red-400" : isApproved ? "bg-green-500" : "bg-brand-500"
                )}
                style={{ width: `${displayProgress}%` }}
              />
            </div>
          </div>

          {/* Rejection note */}
          {isRejected && latestTodayReport?.rejection_note && (
            <div className="mt-2 flex items-start gap-1.5 text-xs text-red-600">
              <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
              <span className="line-clamp-2">{latestTodayReport.rejection_note}</span>
            </div>
          )}
        </div>

        {/* CTA */}
        <div className={cn(
          "shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors mt-0.5",
          form.status === "offline_saved" ? "bg-gray-100 text-gray-500" :
          isRejected                       ? "bg-red-50 text-red-600"    :
          todayCount > 0                   ? "bg-gray-100 text-gray-600" :
          "bg-brand-500 text-white"
        )}>
          {form.status === "offline_saved" ? "Offline" :
           isRejected ? "Perbaiki" : todayCount > 0 ? "Tambah" : "Laporkan"}
          <ChevronRight className="w-3.5 h-3.5" />
        </div>
      </button>

      {/* ── Riwayat (outside button so photos/interactive elements are valid) ── */}
      {history.length > 0 && (
        <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-2">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
            Riwayat {history.length > 7 ? "(7 terbaru)" : `(${history.length})`}
          </p>
          {history.slice(0, 7).map((h, idx) => {
            const olderH = history[idx + 1];
            const delta = olderH ? h.actual_progress - olderH.actual_progress : null;
            const W = WEATHER_DISPLAY[h.weather] ?? WEATHER_DISPLAY.berawan;
            const canEdit = h.is_approved === null || h.is_approved === false;
            return (
              <div key={h.id} className="bg-white border border-gray-100 rounded-xl px-3 py-2.5 space-y-1.5">
                {/* Line 1: status dot + time + delta + progress + status label + edit button */}
                <div className="flex items-center gap-1.5 text-xs">
                  <span className={cn("w-1.5 h-1.5 rounded-full shrink-0",
                    h.is_approved === true  ? "bg-green-400" :
                    h.is_approved === false ? "bg-red-400"   : "bg-yellow-400"
                  )} />
                  <span className="text-gray-500 tabular-nums shrink-0">
                    {h.report_date === today ? formatTime(h.created_at) : formatShortDate(h.report_date)}
                  </span>
                  {delta !== null && delta !== 0 && (
                    <span className={cn("text-[10px] font-bold shrink-0",
                      delta > 0 ? "text-green-500" : "text-red-400"
                    )}>
                      {delta > 0 ? `+${delta.toFixed(0)}%` : `${delta.toFixed(0)}%`}
                    </span>
                  )}
                  <span className="font-bold text-gray-800 tabular-nums ml-auto shrink-0">
                    {h.actual_progress.toFixed(0)}%
                  </span>
                  <span className={cn("text-[10px] font-semibold shrink-0",
                    h.is_approved === true  ? "text-green-600" :
                    h.is_approved === false ? "text-red-500"   : "text-yellow-600"
                  )}>
                    {h.is_approved === true ? "Disetujui" : h.is_approved === false ? "Ditolak" : "Menunggu"}
                  </span>
                  {canEdit && (
                    <button
                      onClick={() => onEditReport(h)}
                      className="w-5 h-5 flex items-center justify-center rounded bg-gray-100 hover:bg-amber-100 text-gray-400 hover:text-amber-600 transition-colors shrink-0"
                      title="Edit laporan"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
                {/* Line 2: weather + workers + notes */}
                <div className="flex items-center gap-1.5 text-[10px] text-gray-400 flex-wrap">
                  <W.Icon className={cn("w-3 h-3 shrink-0", W.cls)} />
                  <span>{W.label}</span>
                  <span className="text-gray-200">·</span>
                  <Users className="w-3 h-3 shrink-0" />
                  <span>{h.labor_count} orang</span>
                  {h.notes && (
                    <>
                      <span className="text-gray-200">·</span>
                      <span className="italic line-clamp-1 min-w-0">{h.notes}</span>
                    </>
                  )}
                </div>
                {/* Line 3: photo thumbnails */}
                {h.photos.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap pt-0.5">
                    {h.photos.slice(0, 5).map((ph) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={ph.id}
                        src={ph.public_url}
                        alt={ph.caption ?? ""}
                        className="w-14 h-14 object-cover rounded-lg border border-gray-200"
                      />
                    ))}
                    {h.photos.length > 5 && (
                      <div className="w-14 h-14 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                        <span className="text-[10px] text-gray-400 font-medium">+{h.photos.length - 5}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────

function HistoryStatusDot({ isApproved }: { isApproved: boolean | null }) {
  if (isApproved === true)  return <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" title="Disetujui" />;
  if (isApproved === false) return <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" title="Ditolak" />;
  return <span className="w-2 h-2 rounded-full bg-yellow-400 shrink-0" title="Menunggu" />;
}
