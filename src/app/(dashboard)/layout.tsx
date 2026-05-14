import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardShell from "@/components/dashboard/DashboardShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  type ProfileRow = { full_name: string; role: string; tenants: { name: string } | null };
  const { data: rawProfile } = await supabase
    .from("profiles")
    .select("full_name, role, tenants(name)")
    .eq("id", user.id)
    .single();
  const profile = rawProfile as unknown as ProfileRow | null;

  const fullName = profile?.full_name ?? user.email ?? "Pengguna";
  const role = profile?.role ?? "tenant_owner";
  const tenantName = profile?.tenants?.name ?? "Perusahaan Anda";

  return (
    <DashboardShell
      fullName={fullName}
      email={user.email ?? ""}
      role={role}
      tenantName={tenantName}
    >
      {children}
    </DashboardShell>
  );
}
