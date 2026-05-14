"use client";

import { useState } from "react";
import { Save, Crown } from "lucide-react";
import { updateTenant } from "./actions";
import type { TenantRow } from "./page";

const PLAN_LABELS: Record<string, { label: string; color: string }> = {
  lite: { label: "Lite", color: "bg-gray-100 text-gray-600" },
  pro: { label: "Pro", color: "bg-brand-50 text-brand-600" },
};

interface Props {
  tenant: TenantRow;
}

export default function TenantTab({ tenant }: Props) {
  const [name, setName] = useState(tenant.name);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const plan = PLAN_LABELS[tenant.plan] ?? { label: tenant.plan, color: "bg-gray-100 text-gray-600" };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const result = await updateTenant({ name });
    setSaving(false);
    if (result?.error) {
      setMessage({ type: "error", text: result.error });
    } else {
      setMessage({ type: "success", text: "Informasi perusahaan berhasil disimpan" });
    }
  }

  return (
    <div className="max-w-xl">
      <h2 className="text-base font-semibold text-gray-800 mb-1">Informasi Perusahaan</h2>
      <p className="text-sm text-gray-400 mb-6">Pengaturan umum untuk tenant perusahaan Anda</p>

      {/* Plan info card */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center">
            <Crown className="w-4 h-4 text-brand-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">
              Paket{" "}
              <span className={`inline-flex items-center px-2 py-0.5 text-xs font-bold rounded-full ${plan.color}`}>
                {plan.label}
              </span>
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {tenant.max_projects === null
                ? "Proyek tidak terbatas"
                : `Maksimum ${tenant.max_projects} proyek aktif`}
            </p>
          </div>
        </div>
        {tenant.plan === "lite" && (
          <button className="text-xs font-semibold text-brand-500 hover:text-brand-600 hover:underline transition-colors">
            Upgrade ke Pro →
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Nama Perusahaan */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Nama Perusahaan <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition-all"
            placeholder="PT. Nama Perusahaan"
          />
        </div>

        {/* Slug (read-only) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Slug Tenant</label>
          <input
            type="text"
            value={tenant.slug}
            disabled
            className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-400 cursor-not-allowed font-mono"
          />
          <p className="text-xs text-gray-400 mt-1">Identifikasi unik perusahaan, tidak dapat diubah</p>
        </div>

        {/* Feedback */}
        {message && (
          <div className={`px-4 py-3 rounded-lg text-sm font-medium border ${
            message.type === "success"
              ? "bg-green-50 text-green-700 border-green-200"
              : "bg-red-50 text-red-700 border-red-200"
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
