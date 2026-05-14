function Bone({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-gray-200 ${className ?? ""}`} />;
}

export default function ProjectDetailLoading() {
  return (
    <div className="space-y-5">
      {/* Back link */}
      <Bone className="h-4 w-32" />

      {/* Title area */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Bone className="h-8 w-64" />
          <Bone className="h-3.5 w-24" />
          <Bone className="h-4 w-40" />
        </div>
        <Bone className="h-7 w-20 rounded-full shrink-0" />
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <Bone key={i} className="h-10 w-28 rounded-b-none" />
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-2">
            <Bone className="h-3 w-28" />
            <Bone className="h-6 w-20" />
            <Bone className="h-3 w-32" />
          </div>
        ))}
      </div>

      {/* Table card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <Bone className="h-4 w-56" />
          <Bone className="h-8 w-28 rounded-lg" />
        </div>
        <div className="divide-y divide-gray-50">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="px-4 py-3.5 flex items-center gap-4">
              <Bone className="h-5 w-16 rounded" />
              <Bone className="h-4 flex-1" />
              <Bone className="h-4 w-24" />
              <Bone className="h-4 w-12" />
              <Bone className="h-4 w-20" />
              <Bone className="h-4 w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
