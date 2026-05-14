"use client";

import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";

const progressData = [
  { month: "Jan", rencana: 10, realisasi: 8 },
  { month: "Feb", rencana: 22, realisasi: 18 },
  { month: "Mar", rencana: 35, realisasi: 30 },
  { month: "Apr", rencana: 48, realisasi: 42 },
  { month: "Mei", rencana: 60, realisasi: 55 },
  { month: "Jun", rencana: 72, realisasi: 65 },
  { month: "Jul", rencana: 82, realisasi: 74 },
  { month: "Agu", rencana: 90, realisasi: 80 },
];

const laporanData = [
  { day: "Sen", count: 3 },
  { day: "Sel", count: 5 },
  { day: "Rab", count: 4 },
  { day: "Kam", count: 7 },
  { day: "Jum", count: 6 },
  { day: "Sab", count: 2 },
  { day: "Min", count: 1 },
];

export default function DashboardCharts() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* S-Curve Progress */}
      <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="font-semibold text-gray-800">Kurva-S Progress Proyek</h2>
            <p className="text-xs text-gray-400 mt-0.5">Rencana vs Realisasi (%)</p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-gray-500">
              <span className="w-3 h-0.5 bg-blue-500 inline-block rounded" />
              Rencana
            </span>
            <span className="flex items-center gap-1.5 text-gray-500">
              <span className="w-3 h-0.5 bg-orange-400 inline-block rounded" />
              Realisasi
            </span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={progressData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRencana" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.12} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorRealisasi" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={0.12} />
                <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} unit="%" />
            <Tooltip
              contentStyle={{ borderRadius: 10, border: "1px solid #f0f0f0", fontSize: 12 }}
              formatter={(val) => [`${val}%`]}
            />
            <Area type="monotone" dataKey="rencana" stroke="#3b82f6" strokeWidth={2} fill="url(#colorRencana)" dot={false} />
            <Area type="monotone" dataKey="realisasi" stroke="#f97316" strokeWidth={2} fill="url(#colorRealisasi)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Laporan per Hari */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="mb-4">
          <h2 className="font-semibold text-gray-800">Laporan Lapangan</h2>
          <p className="text-xs text-gray-400 mt-0.5">Minggu ini</p>
        </div>
        <div className="flex items-end gap-1 mb-3">
          <p className="text-3xl font-bold text-gray-900">
            {laporanData.reduce((s, d) => s + d.count, 0)}
          </p>
          <span className="text-sm text-green-500 font-semibold mb-1">+3.85%</span>
        </div>
        <p className="text-xs text-gray-400 mb-4">dari minggu lalu</p>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={laporanData} margin={{ top: 0, right: 0, left: -30, bottom: 0 }} barSize={14}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ borderRadius: 10, border: "1px solid #f0f0f0", fontSize: 12 }}
              formatter={(val) => [`${val} laporan`]}
            />
            <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
