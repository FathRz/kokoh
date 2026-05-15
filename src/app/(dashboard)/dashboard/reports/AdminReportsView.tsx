"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Sun, Cloud, CloudRain, Zap, Check, X, ChevronDown, ChevronUp,
  Users, Filter, CheckCircle, Clock, XCircle, TrendingUp,
  ClipboardList, RotateCcw, FolderOpen,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { approveReport, approveBulk, rejectReport, revokeApproval } from "./actions";
import type { AdminReport, ReportProject } from "./page";

const WEATHER_LABELS: Record<string, { label: string; Icon: React.ElementType; color: string }> = {
  cerah:        { label: "Cerah",   Icon: Sun,       color: "text-yellow-500" },
  berawan:      { label: "Berawan", Icon: Cloud,     color: "text-gray-500"   },
  hujan_ringan: { label: "Hujan",   Icon: CloudRain, color: "text-blue-500"   },
  hujan_lebat:  { label: "Deras",   Icon: Zap,       color: "text-indigo-500" },
};

function formatDateTime(createdAt: string, today: string) {
  const d = new Date(createdAt);
  const dateStr = d.toISOString().split("T")[0];
  const time = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  if (dateStr === today) return `Hari ini ${time}`;
  return (
    d.toLocaleDateString("id-ID", { day: "numeric", month: "short" }) + " " + time
  );
}

interface WbsGroup {
  wbsId: string | null;
  wbsName: string | null;
  projectId: string;
  projectName: string;
  reports: AdminReport[];
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
  const [revokeTarget, setRevokeTarget] = useState<string | null>(null);

  const canApprove = ["project_manager", "tenant_owner", "superadmin"].includes(userRole);

  // Stats (always based on today regardless of filter)
  const todayAll = adminReports.filter((r) => r.report_date === today);
  const stats = {
    total:    todayAll.length,
    pending:  todayAll.filter((r) => r.is_approved === null).length,
    approved: todayAll.filter((r) => r.is_approved === true).length,
    rejected: todayAll.filter((r) => r.is_approved === false).length,
  };

  // Build WBS groups with project + status filter applied at the report level
  const wbsGroups: WbsGroup[] = (() => {
    const groupMap = new Map<string, WbsGroup>();
    for (const report of adminReports) {
      if (filterProject !== "all" && report.project_id !== filterProject) continue;
      if (filterStatus === "pending"  && report.is_approved !== null)  continue;
      if (filterStatus === "approved" && report.is_approved !== true)  continue;
      if (filterStatus === "rejected" && report.is_approved !== false) continue;

      const key = `${report.project_id}__${report.wbs_item_id ?? "__none__"}`;
      if (!groupMap.has(key)) {
        groupMap.set(key, {
          wbsId: report.wbs_item_id,
          wbsName: report.wbs_item_name,
          projectId: report.project_id,
          projectName: report.project_name,
          reports: [],
        });
      }
      groupMap.get(key)!.reports.push(report);
    }
    // Sort: project name asc, then WBS name asc (null WBS last)
    return [...groupMap.values()].sort((a, b) => {
      const pc = a.projectName.localeCompare(b.projectName, "id");
      if (pc !== 0) return pc;
      return (a.wbsName ?? "￿").localeCompare(b.wbsName ?? "￿", "id");
    });
  })();

  // Group WBS groups by project for rendering
  const projectMap = new Map<string, { name: string; groups: WbsGroup[] }>();
  for (const g of wbsGroups) {
    if (!projectMap.has(g.projectId)) {
      projectMap.set(g.projectId, { name: g.projectName, groups: [] });
    }
    projectMap.get(g.projectId)!.groups.push(g);
  }

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

  async function handleRevoke() {
    if (!revokeTarget) return;
    setActionLoading(true);
    const result = await revokeApproval(revokeTarget);
    setActionLoading(false);
    if (result?.error) {
      setActionMsg({ type: "error", text: result.error });
    } else {
      setActionMsg({ type: "success", text: "Persetujuan dibatalkan — laporan kembali ke status menunggu" });
      setRevokeTarget(null);
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

        {/* Reports — grouped by project > WBS */}
        {projectMap.size === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm text-center py-16">
            <ClipboardList className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400">Tidak ada laporan yang sesuai filter</p>
          </div>
        ) : (
          <div className="space-y-6 relative">
            {isPending && (
              <div className="absolute inset-0 z-10 bg-white/60 flex items-center justify-center rounded-xl">
                <div className="w-5 h-5 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
              </div>
            )}

            {[...projectMap.entries()].map(([projectId, projectData]) => (
              <div key={projectId}>
                {/* Project header */}
                <div className="flex items-center gap-2 mb-3 px-1">
                  <FolderOpen className="w-4 h-4 text-gray-400 shrink-0" />
                  <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wide">{projectData.name}</h2>
                </div>

                {/* WBS groups */}
                <div className="space-y-3">
                  {projectData.groups.map((group) => {
                    const pendingIds = group.reports.filter((r) => r.is_approved === null).map((r) => r.id);
                    const latestSubmitted = group.reports[0];
                    const latestApproved = group.reports.find((r) => r.is_approved === true);

                    return (
                      <div
                        key={`${group.projectId}__${group.wbsId ?? "none"}`}
                        className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
                      >
                        {/* WBS group header */}
                        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-gray-50/60">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-gray-800 truncate">
                              {group.wbsName ?? <span className="italic text-gray-400">Tanpa WBS</span>}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="text-xs text-gray-400">
                                {group.reports.length} laporan
                              </span>
                              {pendingIds.length > 0 && (
                                <span className="text-xs font-semibold text-yellow-700 bg-yellow-50 border border-yellow-200 px-1.5 py-0.5 rounded-full">
                                  {pendingIds.length} menunggu
                                </span>
                              )}
                              {latestApproved && latestSubmitted && (
                                <span className="text-xs text-gray-400">
                                  · Disetujui {latestApproved.actual_progress.toFixed(0)}%
                                  {latestSubmitted.actual_progress !== latestApproved.actual_progress && (
                                    <span className="text-brand-500 font-medium">
                                      {" → "}{latestSubmitted.actual_progress.toFixed(0)}% dilaporkan
                                    </span>
                                  )}
                                </span>
                              )}
                              {!latestApproved && latestSubmitted && (
                                <span className="text-xs text-gray-400">
                                  · Terkini {latestSubmitted.actual_progress.toFixed(0)}%
                                </span>
                              )}
                            </div>
                          </div>
                          {canApprove && pendingIds.length > 0 && (
                            <button
                              onClick={() => handleBulkApprove(pendingIds, group.wbsName ?? "Tanpa WBS")}
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
                          {group.reports.map((report, idx) => {
                            const olderReport = group.reports[idx + 1];
                            const delta = olderReport
                              ? report.actual_progress - olderReport.actual_progress
                              : null;
                            const W = WEATHER_LABELS[report.weather] ?? WEATHER_LABELS.berawan;
                            const isExpanded = expandedRow === report.id;
                            const hasDetail = report.photos.length > 0 || !!report.notes;

                            return (
                              <div key={report.id}>
                                <div className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50/50 transition-colors">
                                  {/* Time + reporter */}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-gray-700">
                                      {formatDateTime(report.created_at, today)}
                                    </p>
                                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5 flex-wrap">
                                      <Users className="w-3 h-3 shrink-0" />
                                      <span>{report.created_by_name}</span>
                                      <span className="mx-0.5 text-gray-200">·</span>
                                      <W.Icon className={cn("w-3 h-3 shrink-0", W.color)} />
                                      <span className={W.color}>{W.label}</span>
                                      <span className="mx-0.5 text-gray-200">·</span>
                                      <span>{report.labor_count} orang</span>
                                    </p>
                                  </div>

                                  {/* Progress + delta */}
                                  <div className="w-20 shrink-0 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      {delta !== null && delta !== 0 && (
                                        <span className={cn(
                                          "text-[10px] font-bold",
                                          delta > 0 ? "text-green-500" : "text-red-500"
                                        )}>
                                          {delta > 0 ? `+${delta.toFixed(0)}` : delta.toFixed(0)}%
                                        </span>
                                      )}
                                      <p className="text-sm font-bold text-brand-600">
                                        {report.actual_progress.toFixed(0)}%
                                      </p>
                                    </div>
                                    <div className="h-1.5 bg-gray-100 rounded-full mt-1">
                                      <div
                                        className="h-full bg-brand-500 rounded-full"
                                        style={{ width: `${report.actual_progress}%` }}
                                      />
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
                                    {canApprove && report.is_approved === true && (
                                      <button
                                        onClick={() => { setRevokeTarget(report.id); setActionMsg(null); }}
                                        disabled={actionLoading}
                                        title="Batalkan persetujuan"
                                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-orange-50 text-orange-500 hover:bg-orange-100 transition-colors disabled:opacity-50"
                                      >
                                        <RotateCcw className="w-3.5 h-3.5" />
                                      </button>
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
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
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

      {/* Revoke Modal */}
      {revokeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Batalkan Persetujuan</h3>
                <p className="text-sm text-gray-500 mt-0.5">Laporan kembali ke status menunggu</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              Progress WBS akan dikembalikan ke laporan terakhir yang masih disetujui, atau ke 0% jika tidak ada.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setRevokeTarget(null)}
                className="flex-1 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleRevoke}
                disabled={actionLoading}
                className="flex-1 py-2.5 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors disabled:opacity-60"
              >
                {actionLoading ? "Memproses..." : "Batalkan Persetujuan"}
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
