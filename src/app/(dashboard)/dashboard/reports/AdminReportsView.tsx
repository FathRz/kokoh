"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Sun, Cloud, CloudRain, Zap, Check, X, ChevronDown, ChevronUp,
  Users, Filter, CheckCircle, Clock, XCircle, TrendingUp,
  ClipboardList, CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { approveReport, approveBulk, rejectReport } from "./actions";
import type { AdminReport, ReportProject } from "./page";

const WEATHER_LABELS: Record<string, { label: string; Icon: React.ElementType; color: string }> = {
  cerah:        { label: "Cerah",   Icon: Sun,       color: "text-yellow-500" },
  berawan:      { label: "Berawan", Icon: Cloud,     color: "text-gray-500"   },
  hujan_ringan: { label: "Hujan",   Icon: CloudRain, color: "text-blue-500"   },
  hujan_lebat:  { label: "Deras",   Icon: Zap,       color: "text-indigo-500" },
};

function formatDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

interface Props {
  userRole: string;
  projects: ReportProject[];
  adminReports: AdminReport[];
  today: string;
}

export default function AdminReportsView({ userRole, projects, adminReports, today }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [filterProject, setFilterProject] = useState("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  const canApprove = ["project_manager", "tenant_owner", "superadmin"].includes(userRole);

  const filtered = adminReports.filter((r) => {
    if (filterProject !== "all" && r.project_id !== filterProject) return false;
    if (filterStatus === "pending" && r.is_approved !== null) return false;
    if (filterStatus === "approved" && r.is_approved !== true) return false;
    if (filterStatus === "rejected" && r.is_approved !== false) return false;
    return true;
  });

  // Group by date, newest first
  const byDate = filtered.reduce<Record<string, AdminReport[]>>((acc, r) => {
    if (!acc[r.report_date]) acc[r.report_date] = [];
    acc[r.report_date].push(r);
    return acc;
  }, {});
  const sortedDates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));

  // Stats (always based on today regardless of filter)
  const todayAll = adminReports.filter((r) => r.report_date === today);
  const stats = {
    total:    todayAll.length,
    pending:  todayAll.filter((r) => r.is_approved === null).length,
    approved: todayAll.filter((r) => r.is_approved === true).length,
    rejected: todayAll.filter((r) => r.is_approved === false).length,
  };

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function handleApprove(reportId: string) {
    setActionLoading(true);
    setActionMsg(null);
    const result = await approveReport(reportId);
    setActionLoading(false);
    if (result?.error) {
      setActionMsg({ type: "error", text: result.error });
    } else {
      setActionMsg({ type: "success", text: "Laporan disetujui — progres WBS diperbarui" });
      refresh();
    }
  }

  async function handleBulkApprove(ids: string[], label: string) {
    setActionLoading(true);
    setActionMsg(null);
    const result = await approveBulk(ids);
    setActionLoading(false);
    if (result?.error) {
      setActionMsg({ type: "error", text: result.error });
    } else {
      setActionMsg({ type: "success", text: `${result.count} laporan disetujui — ${label}` });
      refresh();
    }
  }

  async function handleReject() {
    if (!rejectTarget) return;
    setActionLoading(true);
    const result = await rejectReport(rejectTarget, rejectNote);
    setActionLoading(false);
    if (result?.error) {
      setActionMsg({ type: "error", text: result.error });
    } else {
      setActionMsg({ type: "success", text: "Laporan ditolak" });
      setRejectTarget(null);
      setRejectNote("");
      refresh();
    }
  }

  return (
    <>
      <div className="space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Laporan Harian</h1>
          <p className="text-sm text-gray-500 mt-0.5">Kelola dan setujui laporan dari Site Manager</p>
        </div>

        {/* Stats (today) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Hari Ini", value: stats.total,    icon: ClipboardList, color: "text-gray-700"   },
            { label: "Menunggu",       value: stats.pending,  icon: Clock,         color: "text-yellow-600" },
            { label: "Disetujui",      value: stats.approved, icon: CheckCircle,   color: "text-green-600"  },
            { label: "Ditolak",        value: stats.rejected, icon: XCircle,       color: "text-red-500"    },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
              <s.icon className={cn("w-5 h-5 shrink-0", s.color)} />
              <div>
                <p className="text-xs text-gray-500 font-medium">{s.label}</p>
                <p className={cn("text-xl font-bold", s.color)}>{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Action feedback */}
        {actionMsg && (
          <div className={cn(
            "px-4 py-3 rounded-xl text-sm font-medium border flex items-center gap-2",
            actionMsg.type === "success"
              ? "bg-green-50 text-green-700 border-green-200"
              : "bg-red-50 text-red-700 border-red-200"
          )}>
            {actionMsg.type === "success" ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
            {actionMsg.text}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-semibold text-gray-700">Filter</span>
          </div>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="min-w-[180px]">
              <label className="block text-xs text-gray-500 font-medium mb-1">Proyek</label>
              <select
                value={filterProject}
                onChange={(e) => setFilterProject(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white"
              >
                <option value="all">Semua Proyek</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 font-medium mb-1">Status</label>
              <div className="flex gap-1.5 flex-wrap">
                {(["all", "pending", "approved", "rejected"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilterStatus(s)}
                    className={cn(
                      "px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors",
                      filterStatus === s
                        ? "bg-brand-500 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    )}
                  >
                    {s === "all" ? "Semua" : s === "pending" ? "Menunggu" : s === "approved" ? "Disetujui" : "Ditolak"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Reports — grouped by date */}
        {sortedDates.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm text-center py-16">
            <ClipboardList className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400">Tidak ada laporan yang sesuai filter</p>
          </div>
        ) : (
          <div className="space-y-4 relative">
            {isPending && (
              <div className="absolute inset-0 z-10 bg-white/60 flex items-center justify-center rounded-xl">
                <div className="w-5 h-5 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
              </div>
            )}

            {sortedDates.map((date) => {
              const dayReports = byDate[date];
              const pendingIds = dayReports.filter((r) => r.is_approved === null).map((r) => r.id);
              const isToday = date === today;

              // Group by WBS item within the day (for "approve all per WBS" action)
              const byWbs = dayReports.reduce<Record<string, AdminReport[]>>((acc, r) => {
                const key = r.wbs_item_id ?? r.id;
                if (!acc[key]) acc[key] = [];
                acc[key].push(r);
                return acc;
              }, {});

              return (
                <div key={date} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  {/* Date header */}
                  <div className={cn(
                    "flex items-center justify-between px-5 py-3.5 border-b border-gray-100",
                    isToday && "bg-brand-50/50"
                  )}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <CalendarDays className={cn("w-4 h-4 shrink-0", isToday ? "text-brand-500" : "text-gray-400")} />
                      <div className="min-w-0">
                        <span className={cn("text-sm font-semibold", isToday ? "text-brand-700" : "text-gray-800")}>
                          {isToday ? "Hari ini — " : ""}{formatDate(date)}
                        </span>
                        <span className="ml-2 text-xs text-gray-400">
                          {dayReports.length} laporan{pendingIds.length > 0 && ` · ${pendingIds.length} menunggu`}
                        </span>
                      </div>
                    </div>
                    {canApprove && pendingIds.length > 0 && (
                      <button
                        onClick={() => handleBulkApprove(pendingIds, `persetujuan massal ${formatDate(date)}`)}
                        disabled={actionLoading}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50 shrink-0 ml-3"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Setujui Semua ({pendingIds.length})
                      </button>
                    )}
                  </div>

                  {/* Report rows */}
                  <div className="divide-y divide-gray-50">
                    {Object.entries(byWbs).map(([wbsKey, wbsReports]) => {
                      const wbsPendingIds = wbsReports.filter((r) => r.is_approved === null).map((r) => r.id);
                      const hasMultiplePending = wbsPendingIds.length > 1;

                      return (
                        <div key={wbsKey}>
                          {/* WBS sub-header (only if >1 report for same WBS in same day) */}
                          {hasMultiplePending && (
                            <div className="flex items-center justify-between px-5 py-2 bg-gray-50/70">
                              <span className="text-xs text-gray-500 font-medium">
                                {wbsReports[0].wbs_item_name ?? "Tanpa WBS"} — {wbsPendingIds.length} pending
                              </span>
                              {canApprove && (
                                <button
                                  onClick={() => handleBulkApprove(wbsPendingIds, `WBS ${wbsReports[0].wbs_item_name ?? ""}`)}
                                  disabled={actionLoading}
                                  className="text-xs font-semibold text-green-700 hover:text-green-800 underline underline-offset-2 disabled:opacity-50"
                                >
                                  Setujui semua WBS ini
                                </button>
                              )}
                            </div>
                          )}

                          {/* Individual report rows */}
                          {wbsReports.map((report) => {
                            const W = WEATHER_LABELS[report.weather] ?? WEATHER_LABELS.berawan;
                            const isExpanded = expandedRow === report.id;
                            const hasDetail = report.photos.length > 0 || !!report.notes;

                            return (
                              <div key={report.id}>
                                <div className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50/50 transition-colors">
                                  {/* WBS name */}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-800 truncate">
                                      {report.wbs_item_name ?? <span className="italic text-gray-400">Tanpa WBS</span>}
                                    </p>
                                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                      <Users className="w-3 h-3" />{report.created_by_name}
                                      <span className="mx-1">·</span>
                                      <W.Icon className={cn("w-3 h-3", W.color)} />
                                      <span className={W.color}>{W.label}</span>
                                      <span className="mx-1">·</span>
                                      {report.labor_count} orang
                                    </p>
                                  </div>

                                  {/* Progress */}
                                  <div className="w-20 shrink-0 text-right">
                                    <p className="text-sm font-bold text-brand-600">{report.actual_progress.toFixed(0)}%</p>
                                    <div className="h-1.5 bg-gray-100 rounded-full mt-1">
                                      <div className="h-full bg-brand-500 rounded-full" style={{ width: `${report.actual_progress}%` }} />
                                    </div>
                                  </div>

                                  {/* Status */}
                                  <div className="w-24 shrink-0">
                                    <ApprovalBadge isApproved={report.is_approved} />
                                  </div>

                                  {/* Actions */}
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {canApprove && report.is_approved === null && (
                                      <>
                                        <button
                                          onClick={() => handleApprove(report.id)}
                                          disabled={actionLoading}
                                          title="Setujui"
                                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors disabled:opacity-50"
                                        >
                                          <Check className="w-4 h-4" />
                                        </button>
                                        <button
                                          onClick={() => { setRejectTarget(report.id); setRejectNote(""); setActionMsg(null); }}
                                          disabled={actionLoading}
                                          title="Tolak"
                                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors disabled:opacity-50"
                                        >
                                          <X className="w-4 h-4" />
                                        </button>
                                      </>
                                    )}
                                    {hasDetail && (
                                      <button
                                        onClick={() => setExpandedRow(isExpanded ? null : report.id)}
                                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors relative"
                                      >
                                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                        {report.photos.length > 0 && (
                                          <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-500 rounded-full text-[9px] text-white flex items-center justify-center font-bold">
                                            {report.photos.length}
                                          </span>
                                        )}
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Rejection note */}
                                {report.is_approved === false && report.rejection_note && (
                                  <div className="mx-5 mb-3 px-3 py-2 bg-red-50 border border-red-100 rounded-lg text-xs text-red-600 flex items-start gap-1.5">
                                    <XCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                    {report.rejection_note}
                                  </div>
                                )}

                                {/* Expanded: notes + photos */}
                                {isExpanded && (
                                  <div className="px-5 pb-4 space-y-3 border-t border-gray-50 pt-3">
                                    {report.notes && (
                                      <div className="flex items-start gap-1.5 text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                                        <TrendingUp className="w-3.5 h-3.5 mt-0.5 shrink-0 text-gray-400" />
                                        {report.notes}
                                      </div>
                                    )}
                                    {report.photos.length > 0 && (
                                      <div className="flex gap-2 flex-wrap">
                                        {report.photos.map((photo) => (
                                          <button
                                            key={photo.id}
                                            onClick={() => setLightboxUrl(photo.public_url)}
                                            className="relative group"
                                          >
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                              src={photo.public_url}
                                              alt={photo.caption ?? ""}
                                              className="w-20 h-20 object-cover rounded-lg border border-gray-200 group-hover:opacity-80 transition-opacity"
                                            />
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxUrl}
            alt="Foto progres"
            className="max-w-full max-h-full object-contain rounded-xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Reject Modal */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-1">Tolak Laporan</h3>
            <p className="text-sm text-gray-500 mb-4">Berikan alasan penolakan agar Site Manager dapat memperbaiki laporan.</p>
            <textarea
              rows={3}
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="Contoh: Progress tidak sesuai foto dokumentasi..."
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 resize-none mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => setRejectTarget(null)}
                className="flex-1 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading}
                className="flex-1 py-2.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors disabled:opacity-60"
              >
                {actionLoading ? "Menolak..." : "Tolak Laporan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ApprovalBadge({ isApproved }: { isApproved: boolean | null }) {
  if (isApproved === true) return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">
      <CheckCircle className="w-3 h-3" /> Disetujui
    </span>
  );
  if (isApproved === false) return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-red-50 text-red-600 border border-red-200">
      <XCircle className="w-3 h-3" /> Ditolak
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200">
      <Clock className="w-3 h-3" /> Menunggu
    </span>
  );
}
