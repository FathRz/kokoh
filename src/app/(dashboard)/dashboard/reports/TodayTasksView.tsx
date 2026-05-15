"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Sun, Cloud, CloudRain, Zap,
  Plus, Minus, Check, AlertCircle, WifiOff, RefreshCw,
  ClipboardList, Camera, X, ChevronDown, ChevronUp, Users,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { submitDailyReport, saveReportPhoto } from "./actions";
import { offlineDB, type OfflineDailyReport } from "@/lib/db/offline";
import type { ReportProject, ReportWbsItem, SubmittedReport, ReportPhoto } from "./page";
import PhotoCapture from "./PhotoCapture";
import { createClient } from "@/lib/supabase/client";

const WEATHER_OPTIONS = [
  { value: "cerah", label: "Cerah", icon: Sun, color: "text-yellow-500 bg-yellow-50 border-yellow-200" },
  { value: "berawan", label: "Berawan", icon: Cloud, color: "text-gray-500 bg-gray-50 border-gray-200" },
  { value: "hujan_ringan", label: "Hujan", icon: CloudRain, color: "text-blue-500 bg-blue-50 border-blue-200" },
  { value: "hujan_lebat", label: "Deras", icon: Zap, color: "text-indigo-500 bg-indigo-50 border-indigo-200" },
] as const;

type ItemStatus = "idle" | "submitting" | "success" | "error" | "offline_saved";
type PhotoEntry = ReportPhoto & { caption: string };

interface ItemForm {
  newProgress: number;
  notes: string;
  status: ItemStatus;
  errorMsg: string;
  expanded: boolean;
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

export default function TodayTasksView({
  userId, tenantId, projects, todayWbsItems, submittedToday, reportHistory, today,
}: Props) {
  const router = useRouter();
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id ?? "");
  const [weather, setWeather] = useState<string>("cerah");
  const [laborCount, setLaborCount] = useState(1);
  const [isOnline, setIsOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [photoTarget, setPhotoTarget] = useState<string | null>(null); // wbs_item_id
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const submittedMap = new Map(submittedToday.map((r) => [r.wbs_item_id ?? "__project__", r]));

  // Group full history by wbs_item_id, sorted newest first
  const historyByWbs = reportHistory.reduce<Record<string, SubmittedReport[]>>((acc, r) => {
    const key = r.wbs_item_id ?? "__project__";
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  const filteredItems = todayWbsItems.filter((item) => item.project_id === selectedProjectId);

  // Initialise item forms
  const [itemForms, setItemForms] = useState<Record<string, ItemForm>>(() => {
    const map: Record<string, ItemForm> = {};
    for (const item of todayWbsItems) {
      const submitted = submittedMap.get(item.id);
      map[item.id] = {
        newProgress: submitted ? submitted.actual_progress : item.actual_progress,
        notes: submitted?.notes ?? "",
        status: submitted ? (submitted.is_approved === false ? "error" : "success") : "idle",
        errorMsg: submitted?.rejection_note ?? "",
        expanded: !submitted,
        photos: [],
        reportId: submitted?.id ?? null,
      };
      if (submitted) {
        setWeather(submitted.weather);
        setLaborCount(submitted.labor_count);
      }
    }
    return map;
  });

  function setItemField<K extends keyof ItemForm>(id: string, key: K, value: ItemForm[K]) {
    setItemForms((prev) => ({ ...prev, [id]: { ...prev[id], [key]: value } }));
  }

  // Online/offline detection
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

  // Count pending offline items on mount
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
          await offlineDB.dailyReports.update(item.id, {
            _sync_status: "synced",
            _server_id: result.id,
          });

          // Sync offline photos
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
            } catch { /* skip failed photo */ }
          }
          synced++;
        } else {
          await offlineDB.dailyReports.update(item.id, {
            _sync_status: "error",
            _sync_error: result.error,
          });
        }
      }

      const remainingPending = await offlineDB.dailyReports
        .where("_sync_status").equals("pending").count();
      setPendingCount(remainingPending);
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
      // Save to IndexedDB
      const localId = crypto.randomUUID();
      await offlineDB.dailyReports.add({
        id: localId,
        ...payload,
        tenant_id: tenantId,
        created_by: userId,
        _sync_status: "pending",
      } as OfflineDailyReport);
      setPendingCount((c) => c + 1);
      setItemField(wbsItemId, "status", "offline_saved");
      setItemField(wbsItemId, "expanded", false);
      return;
    }

    const result = await submitDailyReport(payload);
    if (result?.error) {
      setItemField(wbsItemId, "status", "error");
      setItemField(wbsItemId, "errorMsg", result.error);
    } else {
      setItemField(wbsItemId, "status", "success");
      setItemField(wbsItemId, "reportId", result.id ?? null);
      setItemField(wbsItemId, "expanded", false);
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
    <div className="max-w-lg mx-auto space-y-4 pb-24 md:pb-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Laporan Harian</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {new Date(today).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* Offline/Sync Banner */}
      {!isOnline && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-orange-50 border border-orange-200 text-orange-700 text-sm">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span className="font-medium">Mode Offline</span>
          <span className="text-orange-500">— data tersimpan lokal &amp; disinkronkan saat online</span>
        </div>
      )}
      {pendingCount > 0 && isOnline && (
        <div className="flex items-center justify-between gap-2.5 px-4 py-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-sm">
          <div className="flex items-center gap-2">
            <RefreshCw className={cn("w-4 h-4 shrink-0", syncing && "animate-spin")} />
            <span>{pendingCount} laporan menunggu sinkronisasi</span>
          </div>
          <button
            onClick={syncQueue}
            disabled={syncing}
            className="text-xs font-semibold underline"
          >
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

      {/* Project Selector */}
      {projects.length > 1 && (
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Proyek</label>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="w-full px-4 py-3 text-sm font-medium border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-400"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
            ))}
          </select>
        </div>
      )}

      {/* Session: Weather + Workers */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Kondisi Lapangan Hari Ini</p>

        {/* Weather */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Cuaca</p>
          <div className="grid grid-cols-4 gap-2">
            {WEATHER_OPTIONS.map(({ value, label, icon: Icon, color }) => (
              <button
                key={value}
                onClick={() => setWeather(value)}
                className={cn(
                  "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-xs font-medium",
                  weather === value ? color + " border-current" : "border-gray-100 text-gray-500 hover:border-gray-200"
                )}
              >
                <Icon className="w-5 h-5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Labor */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Jumlah Pekerja</p>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setLaborCount((c) => Math.max(0, c - 1))}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors text-gray-700"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="text-2xl font-bold text-gray-900 min-w-[3rem] text-center tabular-nums">
              {laborCount}
            </span>
            <button
              onClick={() => setLaborCount((c) => c + 1)}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-brand-100 hover:bg-brand-200 transition-colors text-brand-700"
            >
              <Plus className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-400">orang</span>
          </div>
        </div>
      </div>

      {/* WBS Item Cards */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Pekerjaan Hari Ini
          {currentProject && <span className="ml-1 text-gray-400">— {currentProject.name}</span>}
        </p>

        {filteredItems.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-sm text-gray-400">
            Tidak ada item WBS aktif hari ini untuk proyek ini.<br />
            Pastikan tanggal WBS mencakup hari ini.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItems.map((item) => {
              const form = itemForms[item.id];
              if (!form) return null;
              const prevProgress = item.actual_progress;
              const wbsHistory = historyByWbs[item.id] ?? [];
              // Past reports: exclude today's to avoid duplicate with form state
              const pastReports = wbsHistory.filter((h) => h.report_date !== today);

              return (
                <div
                  key={item.id}
                  className={cn(
                    "bg-white rounded-xl border shadow-sm overflow-hidden transition-all",
                    form.status === "success" ? "border-green-200" :
                    form.status === "offline_saved" ? "border-blue-200" :
                    form.status === "error" ? "border-red-200" :
                    "border-gray-100"
                  )}
                >
                  {/* Card Header */}
                  <button
                    className="w-full flex items-center justify-between px-4 py-3.5 text-left"
                    onClick={() => setItemField(item.id, "expanded", !form.expanded)}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded shrink-0">
                          {item.code}
                        </span>
                        <StatusBadge status={form.status} />
                        {pastReports.length > 0 && (
                          <span className="text-[10px] text-gray-400 bg-gray-50 border border-gray-200 px-1.5 py-0.5 rounded-full shrink-0">
                            {pastReports.length} laporan lalu
                          </span>
                        )}
                      </div>
                      <p className="font-semibold text-gray-800 mt-1 text-sm leading-snug">{item.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Progress terkini: {prevProgress.toFixed(1)}%
                        {form.newProgress !== prevProgress && (
                          <span className="text-brand-500 font-medium"> → {form.newProgress.toFixed(1)}%</span>
                        )}
                      </p>
                    </div>
                    {form.expanded
                      ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0 ml-2" />
                      : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 ml-2" />
                    }
                  </button>

                  {form.status === "error" && form.errorMsg && (
                    <div className="mx-4 mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      {form.errorMsg}
                    </div>
                  )}

                  {form.expanded && (
                    <div className="px-4 pb-4 space-y-4 border-t border-gray-50 pt-4">
                      {/* Progress Slider + Steppers */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium text-gray-700">Progress Baru</p>
                          <span className="text-lg font-bold text-brand-600 tabular-nums">
                            {form.newProgress.toFixed(0)}%
                          </span>
                        </div>

                        {/* Slider */}
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={1}
                          value={form.newProgress}
                          onChange={(e) => setItemField(item.id, "newProgress", Number(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-brand-500"
                        />

                        {/* Stepper Buttons */}
                        <div className="flex gap-2 mt-3 flex-wrap">
                          {[-10, -5, +5, +10, +25].map((delta) => (
                            <button
                              key={delta}
                              onClick={() => adjustProgress(item.id, delta)}
                              className={cn(
                                "flex-1 min-w-[3.5rem] py-2 text-xs font-semibold rounded-lg border transition-colors",
                                delta < 0
                                  ? "border-gray-200 text-gray-600 hover:bg-gray-50"
                                  : "border-brand-100 text-brand-600 bg-brand-50 hover:bg-brand-100"
                              )}
                            >
                              {delta > 0 ? `+${delta}%` : `${delta}%`}
                            </button>
                          ))}
                        </div>

                        {/* Previous progress reference */}
                        <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-gray-300 rounded-full" style={{ width: `${prevProgress}%` }} />
                          </div>
                          <span>sebelumnya {prevProgress.toFixed(0)}%</span>
                        </div>
                      </div>

                      {/* Notes */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Catatan Lapangan
                        </label>
                        <textarea
                          rows={2}
                          value={form.notes}
                          onChange={(e) => setItemField(item.id, "notes", e.target.value)}
                          placeholder="Kendala, catatan pekerjaan..."
                          className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent resize-none"
                        />
                      </div>

                      {/* Photos */}
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Foto Progres</p>
                        {form.photos.length > 0 && (
                          <div className="flex gap-2 flex-wrap mb-2">
                            {form.photos.map((photo) => (
                              <div key={photo.id} className="relative">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={photo.public_url}
                                  alt={photo.caption}
                                  className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                                />
                                <button
                                  onClick={() => setItemForms((prev) => ({
                                    ...prev,
                                    [item.id]: {
                                      ...prev[item.id],
                                      photos: prev[item.id].photos.filter((p) => p.id !== photo.id),
                                    },
                                  }))}
                                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white shadow"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        <button
                          onClick={() => setPhotoTarget(item.id)}
                          disabled={!form.reportId && form.status !== "success"}
                          className={cn(
                            "flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border transition-colors",
                            form.reportId
                              ? "border-brand-200 text-brand-600 bg-brand-50 hover:bg-brand-100"
                              : "border-gray-200 text-gray-400 cursor-not-allowed"
                          )}
                        >
                          <Camera className="w-4 h-4" />
                          Ambil Foto
                          {!form.reportId && (
                            <span className="text-xs">(simpan dulu)</span>
                          )}
                        </button>
                      </div>

                      {/* Progress History */}
                      {wbsHistory.length > 0 && (
                        <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 space-y-3">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            Riwayat Progress
                          </p>
                          <div className="space-y-3">
                            {wbsHistory.slice(0, 7).map((h, idx) => (
                              <div
                                key={h.id}
                                className={cn(
                                  "space-y-2",
                                  idx < Math.min(wbsHistory.length, 7) - 1 && "pb-3 border-b border-gray-200"
                                )}
                              >
                                {/* Date + progress bar row */}
                                <div className="flex items-center gap-2.5 text-xs">
                                  <span className={cn(
                                    "shrink-0 w-[72px] tabular-nums",
                                    h.report_date === today ? "text-brand-600 font-semibold" : "text-gray-500"
                                  )}>
                                    {h.report_date === today
                                      ? "Hari ini"
                                      : new Date(h.report_date + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "short" })
                                    }
                                  </span>
                                  <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                      className="h-full rounded-full transition-all"
                                      style={{
                                        width: `${h.actual_progress}%`,
                                        backgroundColor: h.is_approved === true ? "#22c55e" : h.is_approved === false ? "#f87171" : "#60a5fa",
                                      }}
                                    />
                                  </div>
                                  <span className="font-semibold text-gray-700 w-8 text-right tabular-nums shrink-0">
                                    {h.actual_progress.toFixed(0)}%
                                  </span>
                                  <HistoryStatusDot status={h.is_approved} />
                                </div>

                                {/* Weather + Labor */}
                                <div className="flex items-center gap-3 pl-[84px]">
                                  <WeatherChip weather={h.weather} />
                                  <span className="flex items-center gap-1 text-xs text-gray-500">
                                    <Users className="w-3 h-3 shrink-0" />
                                    {h.labor_count} orang
                                  </span>
                                </div>

                                {/* Notes */}
                                {h.notes && (
                                  <p className="text-xs text-gray-500 leading-relaxed pl-[84px] italic">
                                    &ldquo;{h.notes}&rdquo;
                                  </p>
                                )}

                                {/* Photos */}
                                {h.photos.length > 0 && (
                                  <div className="flex gap-1.5 flex-wrap pl-[84px]">
                                    {h.photos.map((ph) => (
                                      <button
                                        key={ph.id}
                                        onClick={() => setLightboxUrl(ph.public_url)}
                                        className="w-14 h-14 rounded-lg overflow-hidden border border-gray-200 shrink-0 hover:opacity-80 transition-opacity"
                                      >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                          src={ph.public_url}
                                          alt={ph.caption ?? "Foto laporan"}
                                          className="w-full h-full object-cover"
                                        />
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                          <div className="flex gap-3 pt-1 text-[10px] text-gray-400">
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Disetujui</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" /> Menunggu</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> Ditolak</span>
                          </div>
                        </div>
                      )}

                      {/* Submit */}
                      <button
                        onClick={() => handleSubmitItem(item.id)}
                        disabled={form.status === "submitting"}
                        className={cn(
                          "w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold rounded-xl transition-colors",
                          form.status === "submitting"
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                            : isOnline
                            ? "bg-brand-500 hover:bg-brand-600 text-white"
                            : "bg-orange-500 hover:bg-orange-600 text-white"
                        )}
                      >
                        {form.status === "submitting" ? (
                          <><span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> Menyimpan...</>
                        ) : isOnline ? (
                          <><Check className="w-4 h-4" /> Simpan Progress</>
                        ) : (
                          <><WifiOff className="w-4 h-4" /> Simpan Offline</>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
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
    </div>
  );
}

const WEATHER_MAP: Record<string, { label: string; Icon: React.ElementType; cls: string }> = {
  cerah:       { label: "Cerah",  Icon: Sun,       cls: "text-yellow-600 bg-yellow-50" },
  berawan:     { label: "Berawan", Icon: Cloud,     cls: "text-gray-500 bg-gray-100" },
  hujan_ringan:{ label: "Hujan",  Icon: CloudRain,  cls: "text-blue-600 bg-blue-50" },
  hujan_lebat: { label: "Deras",  Icon: Zap,        cls: "text-indigo-600 bg-indigo-50" },
};

function WeatherChip({ weather }: { weather: string }) {
  const w = WEATHER_MAP[weather] ?? { label: weather, Icon: Cloud, cls: "text-gray-500 bg-gray-100" };
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full", w.cls)}>
      <w.Icon className="w-3 h-3 shrink-0" />
      {w.label}
    </span>
  );
}

function HistoryStatusDot({ status }: { status: boolean | null }) {
  if (status === true) return <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" title="Disetujui" />;
  if (status === false) return <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" title="Ditolak" />;
  return <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" title="Menunggu persetujuan" />;
}

function StatusBadge({ status }: { status: ItemStatus }) {
  if (status === "success") return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">
      <Check className="w-2.5 h-2.5" /> Tersimpan
    </span>
  );
  if (status === "offline_saved") return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
      <WifiOff className="w-2.5 h-2.5" /> Offline
    </span>
  );
  if (status === "error") return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">
      <AlertCircle className="w-2.5 h-2.5" /> Ditolak
    </span>
  );
  return null;
}
