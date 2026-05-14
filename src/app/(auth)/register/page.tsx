"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    companyName: "",
    fullName: "",
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agreeTerms) {
      setError("Anda harus menyetujui syarat dan ketentuan.");
      return;
    }
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          full_name: form.fullName,
          company_name: form.companyName,
        },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/verify-email");
  }

  const inputClass =
    "w-full px-4 py-3 border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all";

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-7">
        <h1 className="text-3xl font-bold text-gray-900">Daftar Akun</h1>
        <p className="text-gray-500 mt-1.5 text-sm">
          Daftarkan perusahaan Anda dan mulai kelola proyek!
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Nama Perusahaan */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Nama Perusahaan <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="companyName"
            required
            value={form.companyName}
            onChange={handleChange}
            className={inputClass}
            placeholder="PT. Konstruksi Maju"
          />
        </div>

        {/* Nama Lengkap */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Nama Lengkap <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="fullName"
            required
            value={form.fullName}
            onChange={handleChange}
            className={inputClass}
            placeholder="Budi Santoso"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            name="email"
            required
            value={form.email}
            onChange={handleChange}
            className={inputClass}
            placeholder="nama@perusahaan.com"
          />
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Password <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              required
              minLength={8}
              value={form.password}
              onChange={handleChange}
              className={inputClass + " pr-12"}
              placeholder="Min. 8 karakter"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showPassword ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </button>
          </div>
          {/* Password strength indicator */}
          {form.password.length > 0 && (
            <div className="mt-2 flex gap-1">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    form.password.length >= i * 2
                      ? form.password.length < 6
                        ? "bg-red-400"
                        : form.password.length < 10
                        ? "bg-yellow-400"
                        : "bg-green-400"
                      : "bg-gray-200"
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Agree terms */}
        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={agreeTerms}
            onChange={(e) => setAgreeTerms(e.target.checked)}
            className="w-4 h-4 mt-0.5 rounded border-gray-300 text-orange-500 focus:ring-orange-400 cursor-pointer flex-shrink-0"
          />
          <span className="text-sm text-gray-600 leading-relaxed">
            Saya menyetujui{" "}
            <span className="text-orange-500 font-medium">Syarat & Ketentuan</span>{" "}
            dan{" "}
            <span className="text-orange-500 font-medium">Kebijakan Privasi</span>{" "}
            Kokoh
          </span>
        </label>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 px-4 py-3 rounded-xl">
            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-[#1C2A5E] text-white rounded-xl font-semibold text-sm hover:bg-[#16224d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Memproses...
            </span>
          ) : (
            "Daftar Sekarang"
          )}
        </button>
      </form>

      {/* Footer */}
      <p className="text-center text-sm text-gray-500 mt-6">
        Sudah punya akun?{" "}
        <Link href="/login" className="text-orange-500 font-semibold hover:text-orange-600 transition-colors">
          Masuk
        </Link>
      </p>
    </div>
  );
}
