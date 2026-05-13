import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">Selamat datang, {user?.email}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { label: "Total Proyek", value: "0", icon: "🏗️", color: "bg-blue-50 text-blue-600" },
          { label: "Proyek Aktif", value: "0", icon: "⚡", color: "bg-green-50 text-green-600" },
          { label: "MR Pending", value: "0", icon: "📦", color: "bg-yellow-50 text-yellow-600" },
          { label: "Unit Tersedia", value: "0", icon: "🏘️", color: "bg-purple-50 text-purple-600" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className={`inline-flex p-2 rounded-lg ${stat.color} mb-3`}>
              <span className="text-xl">{stat.icon}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-sm text-gray-500">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Aktivitas Terbaru</h2>
        <p className="text-gray-400 text-sm">Belum ada aktivitas.</p>
      </div>
    </div>
  );
}
