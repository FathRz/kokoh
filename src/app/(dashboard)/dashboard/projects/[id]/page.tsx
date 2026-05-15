import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProjectDetailClient from "./ProjectDetailClient";

export type WbsItem = {
  id: string;
  project_id: string;
  name: string;
  code: string;
  parent_id: string | null;
  budget_amount: number;
  cost_weight: number;
  planned_progress: number;
  actual_progress: number;
  order_index: number;
  start_date: string | null;
  end_date: string | null;
};

export type ProjectDetail = {
  id: string;
  name: string;
  code: string;
  location: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  budget_total: number;
  description: string | null;
  created_at: string;
  perumahan_id: string | null;
  blok_id: string | null;
  perumahan_name: string | null;
  blok_nomor: string | null;
  pm_id: string | null;
  pm_name: string | null;
  site_manager_id: string | null;
  site_manager_name: string | null;
};

export type ProjectFile = {
  id: string;
  type: "ded" | "design_rumah";
  file_name: string;
  storage_path: string;
  file_size: number | null;
  created_at: string;
};

export type PerumahanOpt = { id: string; name: string };
export type BlokOpt = { id: string; nomor: string; perumahan_id: string; taken: boolean };
export type MemberOpt = { id: string; full_name: string; role: string };

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: rawProfile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  const tenantId = (rawProfile as unknown as { tenant_id: string } | null)?.tenant_id;
  if (!tenantId) redirect("/login");

  const { data: rawProject } = await supabase
    .from("projects")
    .select("id, name, code, location, status, start_date, end_date, budget_total, description, created_at, perumahan_id, blok_id, pm_id, site_manager_id, perumahan(name), blok(nomor), pm_profile:profiles!pm_id(full_name), site_manager_profile:profiles!site_manager_id(full_name)")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single();

  if (!rawProject) notFound();

  type RawProject = {
    id: string; name: string; code: string; location: string | null;
    status: string; start_date: string | null; end_date: string | null;
    budget_total: number; description: string | null; created_at: string;
    perumahan_id: string | null; blok_id: string | null;
    pm_id: string | null; site_manager_id: string | null;
    perumahan: { name: string } | null;
    blok: { nomor: string } | null;
    pm_profile: { full_name: string } | null;
    site_manager_profile: { full_name: string } | null;
  };

  const rp = rawProject as unknown as RawProject;
  const project: ProjectDetail = {
    id: rp.id, name: rp.name, code: rp.code, location: rp.location,
    status: rp.status, start_date: rp.start_date, end_date: rp.end_date,
    budget_total: rp.budget_total, description: rp.description, created_at: rp.created_at,
    perumahan_id: rp.perumahan_id, blok_id: rp.blok_id,
    perumahan_name: rp.perumahan?.name ?? null,
    blok_nomor: rp.blok?.nomor ?? null,
    pm_id: rp.pm_id, pm_name: rp.pm_profile?.full_name ?? null,
    site_manager_id: rp.site_manager_id, site_manager_name: rp.site_manager_profile?.full_name ?? null,
  };

  const { data: rawWbs } = await supabase
    .from("wbs_items")
    .select("id, project_id, name, code, parent_id, budget_amount, cost_weight, planned_progress, actual_progress, order_index, start_date, end_date")
    .eq("project_id", id)
    .eq("tenant_id", tenantId)
    .order("order_index", { ascending: true });

  const wbsItems = (rawWbs ?? []) as WbsItem[];

  // Project files
  const { data: rawFiles } = await supabase
    .from("project_files")
    .select("id, type, file_name, storage_path, file_size, created_at")
    .eq("project_id", id)
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: true });

  const projectFiles = (rawFiles ?? []) as ProjectFile[];

  // Perumahan + blok options for editing
  const { data: rawPerumahan } = await supabase
    .from("perumahan").select("id, name").eq("tenant_id", tenantId).order("name");
  const { data: rawBlok } = await supabase
    .from("blok").select("id, nomor, perumahan_id").eq("tenant_id", tenantId).order("nomor");

  const { data: rawTaken } = await supabase
    .from("projects")
    .select("blok_id")
    .eq("tenant_id", tenantId)
    .in("status", ["active", "completed"])
    .not("blok_id", "is", null)
    .neq("id", id); // exclude current project from taken check

  const takenBlokIds = new Set(
    (rawTaken ?? []).map((p) => (p as unknown as { blok_id: string }).blok_id)
  );

  const perumahanOptions: PerumahanOpt[] = (rawPerumahan ?? []).map(
    (p) => ({ id: (p as unknown as { id: string }).id, name: (p as unknown as { name: string }).name })
  );
  const blokOptions: BlokOpt[] = (rawBlok ?? []).map((b) => {
    const bb = b as unknown as { id: string; nomor: string; perumahan_id: string };
    return { id: bb.id, nomor: bb.nomor, perumahan_id: bb.perumahan_id, taken: takenBlokIds.has(bb.id) };
  });

  const { data: rawMembers } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .in("role", ["project_manager", "site_manager", "tenant_owner"])
    .order("full_name");

  const memberOptions: MemberOpt[] = (rawMembers ?? []).map((m) => ({
    id: (m as unknown as { id: string }).id,
    full_name: (m as unknown as { full_name: string }).full_name,
    role: (m as unknown as { role: string }).role,
  }));

  return (
    <ProjectDetailClient
      project={project}
      wbsItems={wbsItems}
      projectFiles={projectFiles}
      tenantId={tenantId}
      perumahanOptions={perumahanOptions}
      blokOptions={blokOptions}
      memberOptions={memberOptions}
    />
  );
}
