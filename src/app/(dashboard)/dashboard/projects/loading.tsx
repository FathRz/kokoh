function Bone({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-gray-200 ${className ?? ""}`} />;
}

export default function ProjectsLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Bone className="h-8 w-24" />
          <Bone className="h-4 w-48" />
        </div>
        <Bone className="h-10 w-32 rounded-lg" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm space-y-2">
            <Bone className="h-3.5 w-24" />
            <Bone className="h-8 w-12" />
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Bone className="h-9 w-72 rounded-lg" />
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Bone key={i} className="h-9 w-20 rounded-lg" />
          ))}
        </div>
      </div>

      {/* Project cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1.5 flex-1">
                <Bone className="h-4 w-3/4" />
                <Bone className="h-3 w-1/3" />
              </div>
              <Bone className="h-6 w-16 rounded-full shrink-0" />
            </div>
            <Bone className="h-3 w-1/2" />
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <Bone className="h-3 w-16" />
                <Bone className="h-3 w-8" />
              </div>
              <Bone className="h-1.5 w-full rounded-full" />
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-gray-50">
              <Bone className="h-4 w-24" />
              <Bone className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
