import Link from "next/link";

export default function VerifyEmailPage() {
  return (
    <div className="w-full text-center">
      {/* Icon */}
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-orange-50 mb-6">
        <svg className="w-8 h-8 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
        </svg>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">Cek Email Anda</h1>
      <p className="text-gray-500 text-sm mb-6 leading-relaxed">
        Kami telah mengirimkan link verifikasi ke email Anda.
        Klik link tersebut untuk mengaktifkan akun dan mulai menggunakan Kokoh.
      </p>

      <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 text-left mb-6">
        <p className="text-sm text-orange-700 font-medium mb-1">Tidak menerima email?</p>
        <ul className="text-sm text-orange-600 space-y-1 list-disc list-inside">
          <li>Cek folder spam atau junk</li>
          <li>Pastikan email yang didaftarkan benar</li>
          <li>Tunggu beberapa menit</li>
        </ul>
      </div>

      <Link
        href="/login"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Kembali ke halaman masuk
      </Link>
    </div>
  );
}
