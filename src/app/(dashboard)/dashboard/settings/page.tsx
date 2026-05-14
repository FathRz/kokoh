import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SettingsTabs from "./SettingsTabs";

export type ProfileRow = {
  id: string;
  full_name: string;
  role: string;
  phone: string | null;
  is_active: boolean;
  created_at: string;
};

export type TenantRow = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  max_projects: number | null;
};

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  type ProfileWithTenant = ProfileRow & { tenants: TenantRow | null };

  const { data: rawProfile } = await supabase
    .from("profiles")
    .select("id, full_name, role, phone, is_active, created_at, tenants(id, name, slug, plan, max_projects)")
    .eq("id", user.id)
    .single();

  if (!rawProfile) redirect("/login");

  const myProfile = rawProfile as unknown as ProfileWithTenant;
  const tenant = myProfile.tenants!;
  const isOwner = myProfile.role === "tenant_owner";

  const { data: rawMembers } = await supabase
    .from("profiles")
    .select("id, full_name, role, phone, is_active, created_at")
    .eq("tenant_id", tenant.id)
    .order("created_at", { ascending: true });

  const members = (rawMembers ?? []) as ProfileRow[];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pengaturan</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Kelola profil, tim, dan informasi perusahaan
        </p>
      </div>

      <SettingsTabs
        userId={user.id}
        email={user.email ?? ""}
        myProfile={{
          id: myProfile.id,
          full_name: myProfile.full_name,
          role: myProfile.role,
          phone: myProfile.phone,
          is_active: myProfile.is_active,
          created_at: myProfile.created_at,
        }}
        members={members}
        tenant={tenant}
        isOwner={isOwner}
      />
    </div>
  );
}
