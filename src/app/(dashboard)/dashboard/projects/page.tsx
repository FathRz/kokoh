import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProjectsClient from "./ProjectsClient";

export type ProjectRow = {
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
  progress?: number;
  perumahan_name?: string | null;
  blok_nomor?: string | null;
};

export type PerumahanOption = { id: string; name: string };
export type BlokOption = { id: string; nomor: string; perumahan_id: string; taken: boolean };

export default async function ProjectsPage() {
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

  const { data: rawProjects } = await supabase
    .from("projects")
    .select("id, name, code, location, status, start_date, end_date, budget_total, description, created_at, blok_id, perumahan(name), blok(nomor)")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  type RawProject = {
    id: string; name: string; code: string; location: string | null;
    status: string; start_date: string | null; end_date: string | null;
    budget_total: number; description: string | null; created_at: string;
    blok_id: string | null;
    perumahan: { name: string } | null;
    blok: { nomor: string } | null;
  };

  const rawList = (rawProjects ?? []) as unknown as RawProject[];

  // Progress from WBS
  const projectIds = rawList.map((p) => p.id);
  let progressMap: Record<string, number> = {};
  if (projectIds.length > 0) {
    const { data: wbsData } = await supabase
      .from("wbs_items")
      .select("project_id, cost_weight, actual_progress")
      .in("project_id", projectIds);

    if (wbsData) {
      const grouped: Record<string, { weight: number; progress: number }[]> = {};
      for (const row of wbsData as unknown as { project_id: string; cost_weight: number; actual_progress: number }[]) {
        if (!grouped[row.project_id]) grouped[row.project_id] = [];
        grouped[row.project_id].push({ weight: row.cost_weight, progress: row.actual_progress });
      }
      for (const [pid, items] of Object.entries(grouped)) {
        const totalWeight = items.reduce((s, i) => s + i.weight, 0);
        const weighted = items.reduce((s, i) => s + (i.weight * i.progress) / 100, 0);
        progressMap[pid] = totalWeight > 0 ? Math.round((weighted / totalWeight) * 100) : 0;
      }
    }
  }

  const projects: ProjectRow[] = rawList.map((p) => ({
    id: p.id, name: p.name, code: p.code, location: p.location,
    status: p.status, start_date: p.start_date, end_date: p.end_date,
    budget_total: p.budget_total, description: p.description, created_at: p.created_at,
    progress: progressMap[p.id] ?? 0,
    perumahan_name: p.perumahan?.name ?? null,
    blok_nomor: p.blok?.nomor ?? null,
  }));

  // Perumahan + blok options for create modal
  const { data: rawPerumahan } = await supabase
    .from("perumahan")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .order("name");

  const { data: rawBlok } = await supabase
    .from("blok")
    .select("id, nomor, perumahan_id")
    .eq("tenant_id", tenantId)
    .order("nomor");

  // Blok taken by active/completed projects
  const { data: rawTakenBlok } = await supabase
    .from("projects")
    .select("blok_id")
    .eq("tenant_id", tenantId)
    .in("status", ["active", "completed"])
    .not("blok_id", "is", null);

  const takenBlokIds = new Set(
    (rawTakenBlok ?? []).map((p) => (p as unknown as { blok_id: string }).blok_id)
  );

  const perumahanOptions: PerumahanOption[] = (rawPerumahan ?? []).map(
    (p) => ({ id: (p as unknown as { id: string }).id, name: (p as unknown as { name: string }).name })
  );

  const blokOptions: BlokOption[] = (rawBlok ?? []).map((b) => {
    const bb = b as unknown as { id: string; nomor: string; perumahan_id: string };
    return { id: bb.id, nomor: bb.nomor, perumahan_id: bb.perumahan_id, taken: takenBlokIds.has(bb.id) };
  });

  return (
    <ProjectsClient
      projects={projects}
      perumahanOptions={perumahanOptions}
      blokOptions={blokOptions}
    />
  );
}
