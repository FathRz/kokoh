"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { updateProfile } from "./actions";
import type { ProfileRow } from "./page";

const ROLE_LABELS: Record<string, string> = {
  superadmin: "Super Admin",
  tenant_owner: "Owner",
  project_manager: "Project Manager",
  site_manager: "Site Manager",
  logistik: "Logistik",
  finance: "Finance",
  sales_admin: "Sales Admin",
};

interface Props {
  userId: string;
  email: string;
  profile: ProfileRow;
}

export default function ProfileTab({ email, profile }: Props) {
  const [fullName, setFullName] = useState(profile.full_name);
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const initials = profile.full_name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const result = await updateProfile({ full_name: fullName, phone });
    setSaving(false);
    if (result?.error) {
      setMessage({ type: "error", text: result.error });
    } else {
      setMessage({ type: "success", text: "Profil berhasil disimpan" });
    }
  }

  return (
    <div className="max-w-xl">
      <h2 className="text-base font-semibold text-gray-800 mb-1">Profil Saya</h2>
      <p className="text-sm text-gray-400 mb-6">Informasi akun dan identitas Anda</p>

      {/* Avatar */}
      <div className="flex items-center gap-4 mb-8 pb-6 border-b border-gray-100">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
          {initials}
        </div>
        <div>
          <p className="font-semibold text-gray-800">{profile.full_name}</p>
          <p className="text-sm text-gray-400">{ROLE_LABELS[profile.role] ?? profile.role}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Nama Lengkap */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Nama Lengkap <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition-all"
            placeholder="Masukkan nama lengkap"
          />
        </div>

        {/* Email (read-only) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
          <input
            type="email"
            value={email}
            disabled
            className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-400 cursor-not-allowed"
          />
          <p className="text-xs text-gray-400 mt-1">Email tidak dapat diubah</p>
        </div>

        {/* Nomor Telepon */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Nomor Telepon</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition-all"
            placeholder="+62 812-3456-7890"
          />
        </div>

        {/* Role (read-only) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Role</label>
          <input
            type="text"
            value={ROLE_LABELS[profile.role] ?? profile.role}
            disabled
            className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-400 cursor-not-allowed"
          />
          <p className="text-xs text-gray-400 mt-1">Role hanya dapat diubah oleh Owner</p>
        </div>

        {/* Feedback */}
        {message && (
          <div className={`px-4 py-3 rounded-lg text-sm font-medium ${
            message.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}>
            {message.text}
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            {saving ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
        </div>
      </form>
    </div>
  );
}
