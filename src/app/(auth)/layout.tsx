export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      {/* Left: Form */}
      <div className="flex-1 flex flex-col bg-white px-8 py-10">
        {/* Logo di kiri atas (mobile + desktop) */}
        {/* <div className="mb-8">
          <img
            src="./kokoh-logo.png"
            alt="Kokoh - Management Kontraktor"
            className="h-30 w-auto object-contain"
          />
        </div> */}

        {/* Form centered */}
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-md">{children}</div>
        </div>

        {/* Footer */}
        <p className="text-xs text-gray-400 text-center mt-6">
          &copy; {new Date().getFullYear()} Kokoh Management Kontraktor. All rights reserved.
        </p>
      </div>

      {/* Right: Branding panel */}
      <div className="hidden lg:flex flex-1 relative bg-[#1C2A5E] items-center justify-center overflow-hidden">
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)
            `,
            backgroundSize: "48px 48px",
          }}
        />

        {/* Floating squares decoration */}
        <div className="absolute top-20 right-24 w-20 h-20 bg-white/5 rounded-2xl rotate-12" />
        <div className="absolute top-40 right-12 w-12 h-12 bg-white/5 rounded-xl -rotate-6" />
        <div className="absolute bottom-32 left-16 w-16 h-16 bg-white/5 rounded-2xl rotate-45" />
        <div className="absolute bottom-20 right-20 w-24 h-24 bg-white/5 rounded-3xl -rotate-12" />
        <div className="absolute top-1/3 left-8 w-10 h-10 bg-white/5 rounded-lg rotate-6" />

        {/* Center content */}
        <div className="relative z-10 text-center px-12 flex flex-col items-center">
          {/* Logo besar di panel kanan */}
          <div className="mb-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="./kokoh-logo.png"
              alt="Kokoh - Management Kontraktor"
              className="h-80 w-auto object-contain drop-shadow-2xl"
            />
          </div>

          <p className="text-blue-200/80 text-sm max-w-xs mx-auto leading-relaxed">
            Sinkronisasi real-time antara kantor pusat dan lapangan, bahkan
            tanpa koneksi internet.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2 justify-center mt-8">
            {["Offline-First", "Multi-Tenant", "Real-time Sync"].map((f) => (
              <span
                key={f}
                className="px-3 py-1 bg-white/10 text-blue-100 text-xs rounded-full border border-white/10"
              >
                {f}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
