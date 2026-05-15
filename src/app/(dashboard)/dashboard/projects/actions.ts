"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const PROJECTS_PATH = "/dashboard/projects";

type CtxResult = { userId: string; tenantId: string } | { error: string };

async function getCtx(): Promise<CtxResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Tidak terautentikasi" };

  const { data } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  const tenantId = (data as unknown as { tenant_id: string } | null)?.tenant_id;
  if (!tenantId) return { error: "Profil tidak ditemukan" };

  return { userId: user.id, tenantId };
}

// ─── Proyek ────────────────────────────────────────────────

export async function createProject(data: {
  name: string;
  code: string;
  location: string;
  status: string;
  start_date: string;
  end_date: string;
  budget_total: number;
  description: string;
  perumahan_id: string | null;
  blok_id: string | null;
  pm_id: string | null;
  site_manager_id: string | null;
}) {
  const ctx = await getCtx();
  if ("error" in ctx) return { error: ctx.error };

  const supabase = await createClient();
  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      tenant_id: ctx.tenantId,
      created_by: ctx.userId,
      name: data.name.trim(),
      code: data.code.trim().toUpperCase(),
      location: data.location.trim() || null,
      status: data.status,
      start_date: data.start_date || null,
      end_date: data.end_date || null,
      budget_total: data.budget_total || 0,
      description: data.description.trim() || null,
      perumahan_id: data.perumahan_id || null,
      blok_id: data.blok_id || null,
      pm_id: data.pm_id || null,
      site_manager_id: data.site_manager_id || null,
    } as never)
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath(PROJECTS_PATH);
  return { success: true, id: (project as unknown as { id: string }).id };
}

export async function updateProject(id: string, data: {
  name?: string;
  location?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  budget_total?: number;
  description?: string;
  perumahan_id?: string | null;
  blok_id?: string | null;
  pm_id?: string | null;
  site_manager_id?: string | null;
}) {
  const ctx = await getCtx();
  if ("error" in ctx) return { error: ctx.error };

  const supabase = await createClient();
  const updates: Record<string, unknown> = {};
  if (data.name !== undefined) updates.name = data.name.trim();
  if (data.location !== undefined) updates.location = data.location.trim() || null;
  if (data.status !== undefined) updates.status = data.status;
  if (data.start_date !== undefined) updates.start_date = data.start_date || null;
  if (data.end_date !== undefined) updates.end_date = data.end_date || null;
  if (data.budget_total !== undefined) updates.budget_total = data.budget_total;
  if (data.description !== undefined) updates.description = data.description.trim() || null;
  if ("perumahan_id" in data) updates.perumahan_id = data.perumahan_id ?? null;
  if ("blok_id" in data) updates.blok_id = data.blok_id ?? null;
  if ("pm_id" in data) updates.pm_id = data.pm_id ?? null;
  if ("site_manager_id" in data) updates.site_manager_id = data.site_manager_id ?? null;

  const { error } = await supabase
    .from("projects")
    .update(updates as never)
    .eq("id", id)
    .eq("tenant_id", ctx.tenantId);

  if (error) return { error: error.message };
  revalidatePath(`${PROJECTS_PATH}/${id}`);
  revalidatePath(PROJECTS_PATH);
  return { success: true };
}

export async function deleteProject(id: string) {
  const ctx = await getCtx();
  if ("error" in ctx) return { error: ctx.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", id)
    .eq("tenant_id", ctx.tenantId);

  if (error) return { error: error.message };
  revalidatePath(PROJECTS_PATH);
  redirect(PROJECTS_PATH);
}

// ─── WBS Items ─────────────────────────────────────────────

export async function createWbsItem(projectId: string, data: {
  name: string;
  code: string;
  budget_amount: number;
  cost_weight: number;
  planned_progress: number;
  order_index: number;
  start_date?: string | null;
  end_date?: string | null;
}) {
  const ctx = await getCtx();
  if ("error" in ctx) return { error: ctx.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from("wbs_items")
    .insert({
      project_id: projectId,
      tenant_id: ctx.tenantId,
      name: data.name.trim(),
      code: data.code.trim().toUpperCase(),
      budget_amount: data.budget_amount || 0,
      cost_weight: data.cost_weight || 0,
      planned_progress: data.planned_progress || 0,
      actual_progress: 0,
      order_index: data.order_index,
      start_date: data.start_date || null,
      end_date: data.end_date || null,
    } as never);

  if (error) return { error: error.message };
  revalidatePath(`${PROJECTS_PATH}/${projectId}`);
  revalidatePath(PROJECTS_PATH);
  return { success: true };
}

export async function updateWbsItem(id: string, projectId: string, data: {
  name?: string;
  budget_amount?: number;
  cost_weight?: number;
  planned_progress?: number;
  actual_progress?: number;
  start_date?: string | null;
  end_date?: string | null;
}) {
  const ctx = await getCtx();
  if ("error" in ctx) return { error: ctx.error };

  const supabase = await createClient();
  const updates: Record<string, unknown> = {};
  if (data.name !== undefined) updates.name = data.name.trim();
  if (data.budget_amount !== undefined) updates.budget_amount = data.budget_amount;
  if (data.cost_weight !== undefined) updates.cost_weight = data.cost_weight;
  if (data.planned_progress !== undefined) updates.planned_progress = data.planned_progress;
  if (data.actual_progress !== undefined) updates.actual_progress = data.actual_progress;
  if ("start_date" in data) updates.start_date = data.start_date ?? null;
  if ("end_date" in data) updates.end_date = data.end_date ?? null;

  const { error } = await supabase
    .from("wbs_items")
    .update(updates as never)
    .eq("id", id)
    .eq("tenant_id", ctx.tenantId);

  if (error) return { error: error.message };
  revalidatePath(`${PROJECTS_PATH}/${projectId}`);
  revalidatePath(PROJECTS_PATH);
  return { success: true };
}

export async function deleteWbsItem(id: string, projectId: string) {
  const ctx = await getCtx();
  if ("error" in ctx) return { error: ctx.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from("wbs_items")
    .delete()
    .eq("id", id)
    .eq("tenant_id", ctx.tenantId);

  if (error) return { error: error.message };
  revalidatePath(`${PROJECTS_PATH}/${projectId}`);
  revalidatePath(PROJECTS_PATH);
  return { success: true };
}

// ─── Project Files ─────────────────────────────────────────

export async function saveProjectFile(projectId: string, data: {
  type: "ded" | "design_rumah";
  file_name: string;
  storage_path: string;
  file_size: number;
}) {
  const ctx = await getCtx();
  if ("error" in ctx) return { error: ctx.error };

  const supabase = await createClient();
  const { error } = await supabase.from("project_files").insert({
    project_id: projectId,
    tenant_id: ctx.tenantId,
    type: data.type,
    file_name: data.file_name,
    storage_path: data.storage_path,
    file_size: data.file_size,
    uploaded_by: ctx.userId,
  } as never);

  if (error) return { error: error.message };
  revalidatePath(`${PROJECTS_PATH}/${projectId}`);
  return { success: true };
}

export async function deleteProjectFile(fileId: string, projectId: string, storagePath: string) {
  const ctx = await getCtx();
  if ("error" in ctx) return { error: ctx.error };

  const supabase = await createClient();
  await supabase.storage.from("project-docs").remove([storagePath]);

  const { error } = await supabase
    .from("project_files")
    .delete()
    .eq("id", fileId)
    .eq("tenant_id", ctx.tenantId);

  if (error) return { error: error.message };
  revalidatePath(`${PROJECTS_PATH}/${projectId}`);
  return { success: true };
}
