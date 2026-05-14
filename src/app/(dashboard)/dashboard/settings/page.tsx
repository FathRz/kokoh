import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import SettingsTabs from "./SettingsTabs";
import type { PerumahanRow } from "./PerumahanTab";

export type ProfileRow = {
  id: string;
  full_name: string;
  role: string;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  email?: string;
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

  const profiles = (rawMembers ?? []) as ProfileRow[];

  let members = profiles;
  try {
    const admin = createAdminClient();
    const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const emailMap = new Map(users.map((u) => [u.id, u.email ?? ""]));
    members = profiles.map((p) => ({ ...p, email: emailMap.get(p.id) ?? "" }));
  } catch {
    // fallback tanpa email
  }

  // Fetch perumahan + blok + active project info
  const { data: rawPerumahan } = await supabase
    .from("perumahan")
    .select("id, name")
    .eq("tenant_id", tenant.id)
    .order("name");

  const { data: rawBlok } = await supabase
    .from("blok")
    .select("id, nomor, perumahan_id")
    .eq("tenant_id", tenant.id)
    .order("nomor");

  // Fetch projects that have blok_id assigned to show blok usage
  const { data: rawProjects } = await supabase
    .from("projects")
    .select("id, name, status, blok_id")
    .eq("tenant_id", tenant.id)
    .not("blok_id", "is", null);

  type BlokUsage = { id: string; nomor: string; perumahan_id: string };
  type ProjectUsage = { id: string; name: string; status: string; blok_id: string };

  const blokList = (rawBlok ?? []) as BlokUsage[];
  const projectList = (rawProjects ?? []) as ProjectUsage[];
  const projectByBlok = new Map(projectList.map((p) => [p.blok_id, p]));

  const perumahan: PerumahanRow[] = (rawPerumahan ?? []).map((p) => ({
    id: (p as unknown as { id: string }).id,
    name: (p as unknown as { name: string }).name,
    blok: blokList
      .filter((b) => b.perumahan_id === (p as unknown as { id: string }).id)
      .map((b) => ({
        id: b.id,
        nomor: b.nomor,
        perumahan_id: b.perumahan_id,
        project: projectByBlok.get(b.id) ?? null,
      })),
  }));

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
        perumahan={perumahan}
      />
    </div>
  );
}
