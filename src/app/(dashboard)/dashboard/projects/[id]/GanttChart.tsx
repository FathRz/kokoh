"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { WbsItem, ProjectDetail } from "./page";

// ─── Constants ─────────────────────────────────────────────────
const LABEL_W = 210; // px for sticky left label column
const DAY_W: Record<Zoom, number> = { week: 22, month: 5 };
const ROW_H = 46;
const HEADER_H = 38;

// ─── Types ─────────────────────────────────────────────────────
type Zoom = "week" | "month";
type ItemStatus = "completed" | "late" | "active" | "pending";

const STATUS_STYLES: Record<ItemStatus, { track: string; fill: string; badge: string; label: string }> = {
  completed: { track: "bg-green-100", fill: "bg-green-500", badge: "bg-green-100 text-green-700 border-green-200", label: "Selesai" },
  late:      { track: "bg-red-100",   fill: "bg-red-500",   badge: "bg-red-100 text-red-700 border-red-200",       label: "Terlambat" },
  active:    { track: "bg-brand-100", fill: "bg-brand-500", badge: "bg-brand-50 text-brand-700 border-brand-200",  label: "Berjalan" },
  pending:   { track: "bg-gray-100",  fill: "bg-gray-400",  badge: "bg-gray-100 text-gray-500 border-gray-200",    label: "Menunggu" },
};

// ─── Date utils ────────────────────────────────────────────────
function parseDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getStatus(item: WbsItem): ItemStatus {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  if (item.actual_progress >= 100) return "completed";
  if (item.end_date && parseDate(item.end_date) < today) return "late";
  if (item.actual_progress > 0) return "active";
  if (item.start_date && parseDate(item.start_date) <= today) return "active";
  return "pending";
}

// ─── Timeline range ─────────────────────────────────────────────
function getRange(project: ProjectDetail, items: WbsItem[]): { start: Date; end: Date } {
  let start: Date | null = project.start_date ? parseDate(project.start_date) : null;
  let end: Date | null   = project.end_date   ? parseDate(project.end_date)   : null;

  for (const item of items) {
    if (item.start_date) {
      const d = parseDate(item.start_date);
      if (!start || d < start) start = d;
    }
    if (item.end_date) {
      const d = parseDate(item.end_date);
      if (!end || d > end) end = d;
    }
  }

  const today = new Date(); today.setHours(0, 0, 0, 0);
  if (!start) start = new Date(today.getFullYear(), today.getMonth(), 1);
  if (!end || end <= start) end = addDays(start, 90);

  // Small padding so bars at the edge aren't clipped
  return { start: addDays(start, -1), end: addDays(end, 7) };
}

// ─── Header ticks ───────────────────────────────────────────────
interface Tick { label: string; subLabel?: string; offset: number; width: number }

function generateTicks(rangeStart: Date, totalDays: number, dayW: number, zoom: Zoom): Tick[] {
  const ticks: Tick[] = [];

  if (zoom === "week") {
    let d = 0;
    while (d < totalDays) {
      const date = addDays(rangeStart, d);
      const span = Math.min(7, totalDays - d);
      ticks.push({
        label: date.toLocaleDateString("id-ID", { day: "numeric", month: "short" }),
        offset: d,
        width: span * dayW,
      });
      d += 7;
    }
  } else {
    let cur = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
    const rangeEnd = addDays(rangeStart, totalDays - 1);
    while (cur <= rangeEnd) {
      const monthEnd = new Date(cur.getFullYear(), cur.getMonth() + 1, 0);
      const clampStart = cur < rangeStart ? rangeStart : cur;
      const clampEnd   = monthEnd > rangeEnd ? rangeEnd : monthEnd;
      const offset = daysBetween(rangeStart, clampStart);
      const days   = daysBetween(clampStart, clampEnd) + 1;
      if (days > 0) {
        ticks.push({
          label: cur.toLocaleDateString("id-ID", { month: "long" }),
          subLabel: String(cur.getFullYear()),
          offset: Math.max(0, offset),
          width: days * dayW,
        });
      }
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    }
  }

  return ticks;
}

// ─── Props ──────────────────────────────────────────────────────
interface Props {
  project: ProjectDetail;
  items: WbsItem[];
  isPending: boolean;
  onAdd: (startDate?: string, endDate?: string) => void;
  onEdit: (item: WbsItem) => void;
}

// ─── Component ──────────────────────────────────────────────────
export default function GanttChart({ project, items, isPending, onAdd, onEdit }: Props) {
  const [zoom, setZoom] = useState<Zoom>("month");
  const dayW = DAY_W[zoom];

  const { start: rangeStart, end: rangeEnd } = getRange(project, items);
  const totalDays = daysBetween(rangeStart, rangeEnd) + 1;
  const totalW = totalDays * dayW;

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayOff = daysBetween(rangeStart, today);
  const showToday = todayOff >= 0 && todayOff < totalDays;

  const ticks = generateTicks(rangeStart, totalDays, dayW, zoom);

  function clickDateFromX(containerEl: HTMLDivElement, clientX: number) {
    const rect = containerEl.getBoundingClientRect();
    const x = clientX - rect.left;
    const dayOff = Math.max(0, Math.floor(x / dayW));
    return addDays(rangeStart, dayOff);
  }

  function handleTimelineClick(e: React.MouseEvent<HTMLDivElement>) {
    const clicked = clickDateFromX(e.currentTarget, e.clientX);
    const endD = addDays(clicked, 13); // 2-week default
    onAdd(toISO(clicked), toISO(endD));
  }

  return (
    <div className="relative bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {isPending && (
        <div className="absolute inset-0 z-40 bg-white/65 flex items-center justify-center rounded-xl">
          <div className="flex items-center gap-2 bg-white rounded-full px-3.5 py-2 shadow-sm border border-gray-100">
            <span className="block w-3.5 h-3.5 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
            <span className="text-xs font-medium text-gray-500">Memperbarui...</span>
          </div>
        </div>
      )}

      {/* Gantt toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-wrap gap-3">
        {/* Zoom toggle */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-medium">Skala:</span>
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            {(["week", "month"] as Zoom[]).map((z) => (
              <button
                key={z}
                onClick={() => setZoom(z)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  zoom === z ? "bg-white shadow-sm text-gray-800" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {z === "week" ? "Mingguan" : "Bulanan"}
              </button>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 flex-wrap">
          {(["active", "completed", "late", "pending"] as ItemStatus[]).map((s) => (
            <div key={s} className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-sm ${STATUS_STYLES[s].fill}`} />
              <span className="text-xs text-gray-500">{STATUS_STYLES[s].label}</span>
            </div>
          ))}
          {showToday && (
            <div className="flex items-center gap-1.5">
              <span className="w-px h-3.5 bg-red-400 inline-block" />
              <span className="text-xs text-gray-500">Hari ini</span>
            </div>
          )}
        </div>
      </div>

      {/* Scrollable Gantt body */}
      <div className="overflow-x-auto">
        <div style={{ minWidth: LABEL_W + totalW }}>

          {/* ── Header row ── */}
          <div className="flex sticky top-0 z-20 bg-gray-50 border-b border-gray-100">
            {/* Label header */}
            <div
              className="shrink-0 sticky left-0 z-30 bg-gray-50 border-r border-gray-100 flex items-center px-4"
              style={{ width: LABEL_W, height: HEADER_H }}
            >
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Pekerjaan</span>
            </div>
            {/* Time header */}
            <div className="relative flex" style={{ width: totalW, height: HEADER_H }}>
              {/* Today marker in header */}
              {showToday && (
                <div className="absolute top-0 bottom-0 w-0.5 bg-red-400 z-10" style={{ left: todayOff * dayW }} />
              )}
              {ticks.map((tick, i) => (
                <div
                  key={i}
                  className="shrink-0 border-r border-gray-100 flex flex-col justify-center px-2 overflow-hidden"
                  style={{ width: tick.width, height: HEADER_H }}
                >
                  <span className="text-xs font-medium text-gray-600 truncate leading-none">{tick.label}</span>
                  {tick.subLabel && (
                    <span className="text-[10px] text-gray-400 leading-none mt-0.5">{tick.subLabel}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ── Empty state ── */}
          {items.length === 0 && (
            <div
              className="flex items-center justify-center text-sm text-gray-400 cursor-crosshair hover:bg-brand-50/20 transition-colors"
              style={{ height: ROW_H * 3 }}
              onClick={handleTimelineClick}
            >
              Klik pada timeline untuk menambah item pertama
            </div>
          )}

          {/* ── Data rows ── */}
          {items.map((item, idx) => {
            const status = getStatus(item);
            const st = STATUS_STYLES[status];
            const rowBg = idx % 2 === 0 ? "bg-white" : "bg-gray-50/40";

            // Bar geometry
            let barLeft = 0, barWidth = 0, progressWidth = 0;
            let hasBar = false;
            if (item.start_date && item.end_date) {
              const sOff = daysBetween(rangeStart, parseDate(item.start_date));
              const eOff = daysBetween(rangeStart, parseDate(item.end_date));
              const clampS = Math.max(0, sOff);
              const clampE = Math.min(totalDays - 1, eOff);
              if (clampE >= clampS) {
                const fullDuration = eOff - sOff + 1;
                barLeft = clampS * dayW;
                barWidth = (clampE - clampS + 1) * dayW;
                progressWidth = Math.min(barWidth, (fullDuration * (item.actual_progress / 100)) * dayW);
                hasBar = true;
              }
            }

            return (
              <div
                key={item.id}
                className={`flex border-b border-gray-50 ${rowBg}`}
                style={{ height: ROW_H }}
              >
                {/* Label */}
                <div
                  className={`shrink-0 sticky left-0 z-10 ${rowBg} border-r border-gray-100 flex items-center gap-2 px-3 cursor-pointer group`}
                  style={{ width: LABEL_W }}
                  onClick={() => onEdit(item)}
                  title="Klik untuk edit"
                >
                  <span className="font-mono text-[10px] text-gray-400 bg-gray-100 px-1 py-0.5 rounded shrink-0">{item.code}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-gray-700 truncate group-hover:text-brand-600 transition-colors">{item.name}</p>
                    <p className={`text-[10px] mt-0.5 font-medium px-1.5 py-0.5 rounded-full inline-block border ${st.badge}`}>
                      {st.label}
                    </p>
                  </div>
                </div>

                {/* Timeline row */}
                <div
                  className="relative cursor-crosshair"
                  style={{ width: totalW }}
                  onClick={(e) => {
                    const clicked = clickDateFromX(e.currentTarget as HTMLDivElement, e.clientX);
                    const endD = addDays(clicked, 13);
                    onAdd(toISO(clicked), toISO(endD));
                  }}
                >
                  {/* Column grid lines */}
                  {ticks.map((tick, i) => (
                    <div
                      key={i}
                      className="absolute top-0 bottom-0 border-r border-gray-50"
                      style={{ left: tick.offset * dayW, width: tick.width }}
                    />
                  ))}

                  {/* Today marker */}
                  {showToday && (
                    <div className="absolute top-0 bottom-0 w-0.5 bg-red-300 z-10" style={{ left: todayOff * dayW }} />
                  )}

                  {/* Gantt bar */}
                  {hasBar ? (
                    <div
                      className={`absolute top-1/2 -translate-y-1/2 rounded ${st.track} overflow-hidden z-20 cursor-pointer`}
                      style={{ left: barLeft, width: barWidth, height: 24 }}
                      onClick={(e) => { e.stopPropagation(); onEdit(item); }}
                      title={`${item.name} · ${item.actual_progress.toFixed(0)}%`}
                    >
                      {/* Progress fill */}
                      <div className={`h-full ${st.fill} transition-all`} style={{ width: progressWidth }} />
                      {/* Label inside bar (only if wide enough) */}
                      {barWidth > 36 && (
                        <div className="absolute inset-0 flex items-center px-2 pointer-events-none">
                          <span className="text-[10px] font-semibold text-white drop-shadow-sm truncate">
                            {item.actual_progress.toFixed(0)}%
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex items-center pl-3">
                      <span className="text-[10px] text-gray-300 italic">Belum ada jadwal — klik untuk menambah</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* ── Add row ── */}
          <div className="flex border-t border-dashed border-gray-200 bg-white" style={{ height: ROW_H }}>
            <div
              className="shrink-0 sticky left-0 z-10 bg-white border-r border-gray-100 flex items-center px-3"
              style={{ width: LABEL_W }}
            >
              <button
                onClick={() => onAdd()}
                className="flex items-center gap-1.5 text-xs text-brand-500 hover:text-brand-600 font-medium transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Pekerjaan
              </button>
            </div>
            <div
              className="relative flex-1 cursor-crosshair hover:bg-brand-50/30 transition-colors"
              style={{ width: totalW }}
              onClick={handleTimelineClick}
            >
              {showToday && (
                <div className="absolute top-0 bottom-0 w-0.5 bg-red-300" style={{ left: todayOff * dayW }} />
              )}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-xs text-gray-300">Klik di timeline untuk menambah item dengan tanggal otomatis</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
