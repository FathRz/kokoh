import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50">
      <div className="text-center space-y-6 px-4">
        <div className="space-y-2">
          <h1 className="text-5xl font-bold text-orange-600">Kokoh</h1>
          <p className="text-xl text-gray-600">Manajemen Proyek Konstruksi</p>
          <p className="text-gray-500 max-w-md">
            Platform SaaS untuk kontraktor dan developer perumahan Indonesia.
            Sinkronisasi real-time antara kantor dan lapangan.
          </p>
        </div>

        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="px-6 py-3 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors"
          >
            Masuk
          </Link>
          <Link
            href="/register"
            className="px-6 py-3 border border-orange-500 text-orange-500 rounded-lg font-medium hover:bg-orange-50 transition-colors"
          >
            Daftar
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-12 max-w-lg">
          {[
            { label: "Real-time Sync", icon: "⚡" },
            { label: "Offline-First", icon: "📶" },
            { label: "Multi-Tenant", icon: "🏢" },
          ].map((feature) => (
            <div
              key={feature.label}
              className="bg-white rounded-xl p-4 shadow-sm border border-orange-100 text-center"
            >
              <span className="text-2xl">{feature.icon}</span>
              <p className="text-sm font-medium text-gray-700 mt-1">
                {feature.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
