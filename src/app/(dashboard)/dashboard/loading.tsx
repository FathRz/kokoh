function Bone({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-gray-200 ${className ?? ""}`} />;
}

export default function DashboardLoading() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Title */}
      <div className="space-y-2">
        <Bone className="h-8 w-32" />
        <Bone className="h-4 w-56" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
            <Bone className="h-4 w-28" />
            <Bone className="h-8 w-20" />
            <Bone className="h-3 w-32" />
          </div>
        ))}
      </div>

      {/* Charts placeholder */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <Bone className="h-5 w-40 mb-4" />
        <Bone className="h-48 w-full" />
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100">
              <Bone className="h-5 w-40" />
            </div>
            <div className="divide-y divide-gray-50">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="px-5 py-3.5 flex items-center gap-3">
                  <Bone className="w-9 h-9 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Bone className="h-3.5 w-3/4" />
                    <Bone className="h-3 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
