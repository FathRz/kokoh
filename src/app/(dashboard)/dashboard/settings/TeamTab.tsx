"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, X, Pencil, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Eye, EyeOff } from "lucide-react";
import { createMember, updateMember, resetMemberPassword } from "./actions";
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

const ROLE_COLORS: Record<string, string> = {
  superadmin: "bg-purple-100 text-purple-700",
  tenant_owner: "bg-brand-50 text-brand-600",
  project_manager: "bg-blue-100 text-blue-700",
  site_manager: "bg-green-100 text-green-700",
  logistik: "bg-orange-100 text-orange-700",
  finance: "bg-yellow-100 text-yellow-700",
  sales_admin: "bg-pink-100 text-pink-700",
};

const ASSIGNABLE_ROLES = [
  { value: "project_manager", label: "Project Manager" },
  { value: "site_manager", label: "Site Manager" },
  { value: "logistik", label: "Logistik" },
  { value: "finance", label: "Finance" },
  { value: "sales_admin", label: "Sales Admin" },
];

interface Props {
  currentUserId: string;
  currentRole: string;
  members: ProfileRow[];
  tenantId: string;
  isOwner: boolean;
}

interface InviteForm {
  email: string;
  full_name: string;
  role: string;
  password: string;
}

interface EditForm {
  full_name: string;
  role: string;
  is_active: boolean;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function MemberAvatar({ name }: { name: string }) {
  const initials = name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
      {initials}
    </div>
  );
}

export default function TeamTab({ currentUserId, members, isOwner }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showInvite, setShowInvite] = useState(false);
  const [editTarget, setEditTarget] = useState<ProfileRow | null>(null);

  const [inviteForm, setInviteForm] = useState<InviteForm>({ email: "", full_name: "", role: "site_manager", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [editForm, setEditForm] = useState<EditForm>({ full_name: "", role: "site_manager", is_active: true });
  const [editLoading, setEditLoading] = useState(false);
  const [editMsg, setEditMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  function openEdit(member: ProfileRow) {
    setEditTarget(member);
    setEditForm({ full_name: member.full_name, role: member.role, is_active: member.is_active });
    setEditMsg(null);
    setNewPassword("");
    setShowNewPassword(false);
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    setResetLoading(true);
    setEditMsg(null);
    const result = await resetMemberPassword(editTarget.id, newPassword);
    setResetLoading(false);
    if (result?.error) {
      setEditMsg({ type: "error", text: result.error });
    } else {
      setEditMsg({ type: "success", text: "Password berhasil direset" });
      setNewPassword("");
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteLoading(true);
    setInviteMsg(null);
    const result = await createMember(inviteForm);
    setInviteLoading(false);
    if (result?.error) {
      setInviteMsg({ type: "error", text: result.error });
    } else {
      setInviteMsg({ type: "success", text: `Akun berhasil dibuat untuk ${inviteForm.email}` });
      setInviteForm({ email: "", full_name: "", role: "site_manager", password: "" });
      startTransition(() => router.refresh());
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    setEditLoading(true);
    setEditMsg(null);
    const result = await updateMember(editTarget.id, editForm);
    setEditLoading(false);
    if (result?.error) {
      setEditMsg({ type: "error", text: result.error });
    } else {
      setEditMsg({ type: "success", text: "Anggota berhasil diperbarui" });
      startTransition(() => router.refresh());
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-base font-semibold text-gray-800 mb-1">Tim & Anggota</h2>
          <p className="text-sm text-gray-400">{members.length} anggota di perusahaan ini</p>
        </div>
        {isOwner && (
          <button
            onClick={() => { setShowInvite(true); setInviteMsg(null); }}
            className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Tambah Anggota
          </button>
        )}
      </div>

      {/* Members table */}
      <div className="relative rounded-xl border border-gray-100 overflow-hidden">
        {isPending && (
          <div className="absolute inset-0 z-10 bg-white/65 flex items-center justify-center">
            <div className="flex items-center gap-2 bg-white rounded-full px-3.5 py-2 shadow-sm border border-gray-100">
              <span className="block w-3.5 h-3.5 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
              <span className="text-xs font-medium text-gray-500">Memperbarui...</span>
            </div>
          </div>
        )}
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Anggota</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              {isOwner && <th className="px-4 py-3" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {members.map((member) => (
              <tr key={member.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <MemberAvatar name={member.full_name} />
                    <div>
                      <p className="font-medium text-gray-800">
                        {member.full_name}
                        {member.id === currentUserId && (
                          <span className="ml-2 text-[10px] font-semibold px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-full">
                            Saya
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-400">
                        Bergabung {new Date(member.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={cn("inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full", ROLE_COLORS[member.role] ?? "bg-gray-100 text-gray-600")}>
                    {member.role === "tenant_owner" && <ShieldCheck className="w-3 h-3" />}
                    {ROLE_LABELS[member.role] ?? member.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={cn("inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full",
                    member.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                  )}>
                    <span className={cn("w-1.5 h-1.5 rounded-full", member.is_active ? "bg-green-500" : "bg-gray-400")} />
                    {member.is_active ? "Aktif" : "Nonaktif"}
                  </span>
                </td>
                {isOwner && (
                  <td className="px-4 py-3 text-right">
                    {member.id !== currentUserId && (
                      <button
                        onClick={() => openEdit(member)}
                        className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Member Modal */}
      {showInvite && (
        <Modal title="Tambah Anggota" onClose={() => { setShowInvite(false); setInviteMsg(null); }}>
          <form onSubmit={handleInvite} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Nama Lengkap <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={inviteForm.full_name}
                onChange={(e) => setInviteForm((f) => ({ ...f, full_name: e.target.value }))}
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition-all"
                placeholder="Nama anggota"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                value={inviteForm.email}
                onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition-all"
                placeholder="email@perusahaan.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  value={inviteForm.password}
                  onChange={(e) => setInviteForm((f) => ({ ...f, password: e.target.value }))}
                  className="w-full px-3.5 py-2.5 pr-10 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition-all"
                  placeholder="Minimal 8 karakter"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">Bagikan password ini kepada anggota secara langsung.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Role <span className="text-red-500">*</span>
              </label>
              <select
                value={inviteForm.role}
                onChange={(e) => setInviteForm((f) => ({ ...f, role: e.target.value }))}
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition-all bg-white"
              >
                {ASSIGNABLE_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            {inviteMsg && (
              <div className={cn("px-4 py-3 rounded-lg text-sm font-medium border",
                inviteMsg.type === "success"
                  ? "bg-green-50 text-green-700 border-green-200"
                  : "bg-red-50 text-red-700 border-red-200"
              )}>
                {inviteMsg.text}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setShowInvite(false); setInviteMsg(null); }}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={inviteLoading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-lg transition-colors disabled:opacity-60"
              >
                <UserPlus className="w-4 h-4" />
                {inviteLoading ? "Menyimpan..." : "Tambah Anggota"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Member Modal */}
      {editTarget && (
        <Modal title="Edit Anggota" onClose={() => setEditTarget(null)}>
          <form onSubmit={handleEdit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Nama Lengkap <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={editForm.full_name}
                onChange={(e) => setEditForm((f) => ({ ...f, full_name: e.target.value }))}
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="text"
                value={editTarget.email ?? "—"}
                disabled
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-400 cursor-not-allowed"
              />
              <p className="text-xs text-gray-400 mt-1">Email tidak dapat diubah</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Role</label>
              <select
                value={editForm.role}
                onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition-all bg-white"
              >
                {ASSIGNABLE_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Status Akun</label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setEditForm((f) => ({ ...f, is_active: !f.is_active }))}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none",
                    editForm.is_active ? "bg-brand-500" : "bg-gray-200"
                  )}
                >
                  <span className={cn(
                    "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
                    editForm.is_active ? "translate-x-6" : "translate-x-1"
                  )} />
                </button>
                <span className="text-sm text-gray-700">
                  {editForm.is_active ? "Aktif" : "Nonaktif"}
                </span>
              </div>
              {!editForm.is_active && (
                <p className="text-xs text-orange-600 mt-2">
                  Anggota yang dinonaktifkan tidak dapat login ke sistem.
                </p>
              )}
            </div>

            {editMsg && (
              <div className={cn("px-4 py-3 rounded-lg text-sm font-medium border",
                editMsg.type === "success"
                  ? "bg-green-50 text-green-700 border-green-200"
                  : "bg-red-50 text-red-700 border-red-200"
              )}>
                {editMsg.text}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={editLoading}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-lg transition-colors disabled:opacity-60"
              >
                {editLoading ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </form>

          {/* Reset password — form terpisah agar tidak campur submit */}
          <div className="mt-6 pt-5 border-t border-gray-100">
            <p className="text-sm font-medium text-gray-700 mb-3">Reset Password</p>
            <form onSubmit={handleResetPassword} className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showNewPassword ? "text" : "password"}
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 pr-10 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition-all"
                  placeholder="Password baru (min. 8 karakter)"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <button
                type="submit"
                disabled={resetLoading || newPassword.length < 8}
                className="px-4 py-2.5 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {resetLoading ? "..." : "Reset"}
              </button>
            </form>
            <p className="text-xs text-gray-400 mt-1.5">Bagikan password baru ini langsung kepada anggota.</p>
          </div>
        </Modal>
      )}
    </div>
  );
}
