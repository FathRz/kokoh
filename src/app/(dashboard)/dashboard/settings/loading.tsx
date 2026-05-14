function Bone({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-gray-200 ${className ?? ""}`} />;
}

export default function SettingsLoading() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Title */}
      <div className="space-y-2">
        <Bone className="h-8 w-36" />
        <Bone className="h-4 w-64" />
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 border-b border-gray-200 pb-0">
        {Array.from({ length: 4 }).map((_, i) => (
          <Bone key={i} className="h-9 w-24 rounded-b-none" />
        ))}
      </div>

      {/* Profile card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">
        <Bone className="h-5 w-32" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Bone className="h-3.5 w-20" />
              <Bone className="h-10 w-full rounded-lg" />
            </div>
          ))}
        </div>
        <div className="flex justify-end">
          <Bone className="h-10 w-28 rounded-lg" />
        </div>
      </div>

      {/* Secondary card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
        <Bone className="h-5 w-28" />
        <div className="divide-y divide-gray-50">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="py-3.5 flex items-center gap-3">
              <Bone className="w-9 h-9 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Bone className="h-3.5 w-40" />
                <Bone className="h-3 w-24" />
              </div>
              <Bone className="h-6 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
