import { createClient } from "@/lib/supabase/server";
import DashboardCharts from "./DashboardCharts";

export default async function DashboardPage() {
  const supabase = await createClient();

  const [projectsRes, mrRes, unitsRes, logsRes, allProjectsRes] = await Promise.all([
    supabase.from("projects").select("id").eq("status", "active"),
    supabase.from("material_requests").select("id").eq("status", "pending"),
    supabase.from("property_units").select("id").eq("status", "available"),
    supabase.from("daily_logs").select("id, log_date, projects(name)").order("log_date", { ascending: false }).limit(5),
    supabase.from("projects").select("id, status, budget_total"),
  ]);

  type LogRow = { id: string; log_date: string; projects: { name: string } | null };
  type ProjectRow = { id: string; status: string; budget_total: number };
  const logs = (logsRes.data ?? []) as unknown as LogRow[];
  const allProjects = (allProjectsRes.data ?? []) as unknown as ProjectRow[];
  const todayStr = new Date().toISOString().split("T")[0];

  const stats = [
    {
      label: "Total Anggaran",
      value: new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0, notation: "compact" })
        .format(allProjects.reduce((s, p) => s + (p.budget_total ?? 0), 0)),
      change: null,
      changeLabel: "dari semua proyek",
      positive: true,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Proyek Aktif",
      value: projectsRes.data?.length ?? 0,
      change: null,
      changeLabel: "proyek berjalan",
      positive: true,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "MR Pending",
      value: mrRes.data?.length ?? 0,
      change: null,
      changeLabel: "menunggu approval",
      positive: false,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
    {
      label: "Unit Tersedia",
      value: unitsRes.data?.length ?? 0,
      change: null,
      changeLabel: "siap dipasarkan",
      positive: true,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {new Date().toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-sm text-gray-500 mb-3">{stat.label}</p>
            <p className="text-3xl font-bold text-gray-900 mb-2">{stat.value}</p>
            <div className="flex items-center gap-1.5">
              <span className={`inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-full ${stat.positive ? "text-green-700 bg-green-100" : "text-orange-700 bg-orange-100"}`}>
                {stat.positive ? (
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" /></svg>
                ) : (
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" /></svg>
                )}
              </span>
              <span className="text-xs text-gray-400">{stat.changeLabel}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <DashboardCharts />

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Laporan Terbaru */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-800">Laporan Lapangan Terbaru</h2>
              <p className="text-xs text-gray-400 mt-0.5">5 laporan terakhir</p>
            </div>
            <a href="/dashboard/reports" className="text-xs text-blue-500 hover:text-blue-600 font-medium">Lihat semua →</a>
          </div>
          <div className="divide-y divide-gray-50">
            {logs.length > 0 ? logs.map((log) => (
              <div key={log.id} className="px-5 py-3.5 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{log.projects?.name ?? "—"}</p>
                  <p className="text-xs text-gray-400">{new Date(log.log_date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</p>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${log.log_date === todayStr ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                  {log.log_date === todayStr ? "Hari ini" : "Lalu"}
                </span>
              </div>
            )) : (
              <div className="px-5 py-10 text-center">
                <p className="text-sm text-gray-400">Belum ada laporan lapangan.</p>
                <a href="/dashboard/reports" className="text-sm text-blue-500 font-medium mt-1 inline-block">Buat laporan pertama →</a>
              </div>
            )}
          </div>
        </div>

        {/* Aksi Cepat */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Aksi Cepat</h2>
            <p className="text-xs text-gray-400 mt-0.5">Pintasan menu yang sering digunakan</p>
          </div>
          <div className="p-4 grid grid-cols-2 gap-3">
            {[
              { href: "/dashboard/projects", label: "Buat Proyek", desc: "Tambah proyek baru", color: "bg-blue-50 text-blue-600", icon: <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /> },
              { href: "/dashboard/reports", label: "Laporan Harian", desc: "Input laporan lapangan", color: "bg-green-50 text-green-600", icon: <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" /> },
              { href: "/dashboard/logistics", label: "Material Request", desc: "Ajukan permintaan material", color: "bg-orange-50 text-orange-600", icon: <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /> },
              { href: "/dashboard/crm", label: "Unit Properti", desc: "Kelola unit & booking", color: "bg-purple-50 text-purple-600", icon: <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /> },
            ].map((action) => (
              <a key={action.href} href={action.href}
                className="flex items-start gap-3 p-4 rounded-xl border border-gray-100 hover:border-blue-200 hover:shadow-sm transition-all group"
              >
                <div className={`p-2 rounded-lg ${action.color} flex-shrink-0`}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>{action.icon}</svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800 group-hover:text-blue-700">{action.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{action.desc}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
