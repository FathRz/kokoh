"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const SETTINGS_PATH = "/dashboard/settings";
type ProfileLookup = { tenant_id: string; role: string } | null;

// ─── Perumahan ─────────────────────────────────────────────

export async function createPerumahan(name: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Tidak terautentikasi" };

  const { data: rawProfile } = await supabase.from("profiles").select("tenant_id, role").eq("id", user.id).single();
  const profile = rawProfile as unknown as ProfileLookup;
  if (!profile) return { error: "Profil tidak ditemukan" };

  const trimmed = name.trim();
  if (!trimmed) return { error: "Nama perumahan wajib diisi" };

  const { error } = await supabase.from("perumahan").insert({ tenant_id: profile.tenant_id, name: trimmed } as never);
  if (error) return { error: error.message };
  revalidatePath(SETTINGS_PATH);
  return { success: true };
}

export async function deletePerumahan(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Tidak terautentikasi" };

  const { data: rawProfile } = await supabase.from("profiles").select("tenant_id, role").eq("id", user.id).single();
  const profile = rawProfile as unknown as ProfileLookup;
  if (!profile) return { error: "Profil tidak ditemukan" };

  const { error } = await supabase.from("perumahan").delete().eq("id", id).eq("tenant_id", profile.tenant_id);
  if (error) return { error: error.message };
  revalidatePath(SETTINGS_PATH);
  return { success: true };
}

// ─── Blok ──────────────────────────────────────────────────

export async function createBlok(perumahanId: string, nomor: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Tidak terautentikasi" };

  const { data: rawProfile } = await supabase.from("profiles").select("tenant_id, role").eq("id", user.id).single();
  const profile = rawProfile as unknown as ProfileLookup;
  if (!profile) return { error: "Profil tidak ditemukan" };

  const trimmed = nomor.trim();
  if (!trimmed) return { error: "Nomor blok wajib diisi" };

  const { error } = await supabase.from("blok").insert({
    tenant_id: profile.tenant_id,
    perumahan_id: perumahanId,
    nomor: trimmed,
  } as never);
  if (error) return { error: error.message };
  revalidatePath(SETTINGS_PATH);
  return { success: true };
}

export async function deleteBlok(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Tidak terautentikasi" };

  const { data: rawProfile } = await supabase.from("profiles").select("tenant_id, role").eq("id", user.id).single();
  const profile = rawProfile as unknown as ProfileLookup;
  if (!profile) return { error: "Profil tidak ditemukan" };

  const { error } = await supabase.from("blok").delete().eq("id", id).eq("tenant_id", profile.tenant_id);
  if (error) return { error: error.message };
  revalidatePath(SETTINGS_PATH);
  return { success: true };
}

// ─── Profil ────────────────────────────────────────────────

export async function updateProfile(data: { full_name: string; phone: string }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Tidak terautentikasi" };

  const full_name = data.full_name.trim();
  if (!full_name) return { error: "Nama lengkap wajib diisi" };

  const { error } = await supabase
    .from("profiles")
    .update({ full_name, phone: data.phone.trim() || null } as never)
    .eq("id", user.id);

  if (error) return { error: error.message };
  revalidatePath(SETTINGS_PATH);
  return { success: true };
}

// ─── Tambah Anggota ────────────────────────────────────────

export async function createMember(data: {
  email: string;
  full_name: string;
  role: string;
  password: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Tidak terautentikasi" };

  const { data: rawProfile } = await supabase
    .from("profiles")
    .select("tenant_id, role")
    .eq("id", user.id)
    .single();

  const profile = rawProfile as unknown as ProfileLookup;
  if (!profile || profile.role !== "tenant_owner") {
    return { error: "Hanya Owner yang dapat menambah anggota" };
  }

  const email = data.email.trim().toLowerCase();
  const full_name = data.full_name.trim();
  if (!email || !full_name) return { error: "Email dan nama wajib diisi" };
  if (data.password.length < 8) return { error: "Password minimal 8 karakter" };

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.createUser({
    email,
    password: data.password,
    email_confirm: true,
    user_metadata: { tenant_id: profile.tenant_id, role: data.role, full_name },
  });

  if (error) return { error: error.message };
  revalidatePath(SETTINGS_PATH);
  return { success: true };
}

// ─── Reset Password Anggota ────────────────────────────────

export async function resetMemberPassword(profileId: string, newPassword: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Tidak terautentikasi" };

  const { data: rawProfile } = await supabase
    .from("profiles")
    .select("tenant_id, role")
    .eq("id", user.id)
    .single();

  const myProfile = rawProfile as unknown as ProfileLookup;
  if (!myProfile || myProfile.role !== "tenant_owner") {
    return { error: "Hanya Owner yang dapat mereset password anggota" };
  }
  if (profileId === user.id) {
    return { error: "Gunakan fitur 'Ubah Password' untuk akun sendiri" };
  }
  if (newPassword.length < 8) {
    return { error: "Password minimal 8 karakter" };
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(profileId, { password: newPassword });

  if (error) return { error: error.message };
  return { success: true };
}

// ─── Update Member (role / status) ─────────────────────────

export async function updateMember(profileId: string, data: {
  full_name?: string;
  role?: string;
  is_active?: boolean;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Tidak terautentikasi" };

  const { data: rawProfile } = await supabase
    .from("profiles")
    .select("tenant_id, role")
    .eq("id", user.id)
    .single();

  const myProfile = rawProfile as unknown as ProfileLookup;
  if (!myProfile || myProfile.role !== "tenant_owner") {
    return { error: "Hanya Owner yang dapat mengubah anggota" };
  }

  if (profileId === user.id && data.is_active === false) {
    return { error: "Tidak dapat menonaktifkan akun sendiri" };
  }
  if (profileId === user.id && data.role && data.role !== "tenant_owner") {
    return { error: "Tidak dapat mengubah role akun sendiri" };
  }

  const updates: Record<string, unknown> = {};
  if (data.full_name !== undefined) updates.full_name = data.full_name.trim();
  if (data.role !== undefined) updates.role = data.role;
  if (data.is_active !== undefined) updates.is_active = data.is_active;

  const { error } = await supabase
    .from("profiles")
    .update(updates as never)
    .eq("id", profileId)
    .eq("tenant_id", myProfile.tenant_id);

  if (error) return { error: error.message };
  revalidatePath(SETTINGS_PATH);
  return { success: true };
}

// ─── Update Tenant ─────────────────────────────────────────

export async function updateTenant(data: { name: string }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Tidak terautentikasi" };

  const { data: rawProfile } = await supabase
    .from("profiles")
    .select("tenant_id, role")
    .eq("id", user.id)
    .single();

  const profile = rawProfile as unknown as ProfileLookup;
  if (!profile || profile.role !== "tenant_owner") {
    return { error: "Hanya Owner yang dapat mengubah pengaturan perusahaan" };
  }

  const name = data.name.trim();
  if (!name) return { error: "Nama perusahaan wajib diisi" };

  const { error } = await supabase
    .from("tenants")
    .update({ name } as never)
    .eq("id", profile.tenant_id);

  if (error) return { error: error.message };
  revalidatePath(SETTINGS_PATH);
  return { success: true };
}
