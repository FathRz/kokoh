"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const PATH = "/dashboard/reports";

type Ctx = { userId: string; tenantId: string; role: string };
type CtxResult = Ctx | { error: string };

async function getCtx(): Promise<CtxResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Tidak terautentikasi" };
  const { data } = await supabase
    .from("profiles")
    .select("tenant_id, role")
    .eq("id", user.id)
    .single();
  const p = data as unknown as { tenant_id: string; role: string } | null;
  if (!p?.tenant_id) return { error: "Profil tidak ditemukan" };
  return { userId: user.id, tenantId: p.tenant_id, role: p.role };
}

export async function submitDailyReport(data: {
  project_id: string;
  wbs_item_id: string | null;
  report_date: string;
  actual_progress: number;
  labor_count: number;
  weather: string;
  notes: string;
}) {
  const ctx = await getCtx();
  if ("error" in ctx) return { error: ctx.error };

  const supabase = await createClient();

  const { data: report, error } = await supabase
    .from("daily_reports")
    .insert({
      project_id: data.project_id,
      wbs_item_id: data.wbs_item_id || null,
      tenant_id: ctx.tenantId,
      created_by: ctx.userId,
      report_date: data.report_date,
      actual_progress: data.actual_progress,
      labor_count: data.labor_count,
      weather: data.weather,
      notes: data.notes || null,
    } as never)
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath(PATH);
  return { success: true, id: (report as unknown as { id: string }).id };
}

export async function updateDailyReport(reportId: string, data: {
  actual_progress: number;
  labor_count: number;
  weather: string;
  notes: string;
}) {
  const ctx = await getCtx();
  if ("error" in ctx) return { error: ctx.error };

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("daily_reports")
    .select("id, is_approved, created_by")
    .eq("id", reportId)
    .eq("tenant_id", ctx.tenantId)
    .single();

  const ex = existing as unknown as { id: string; is_approved: boolean | null; created_by: string } | null;
  if (!ex) return { error: "Laporan tidak ditemukan" };
  if (ex.created_by !== ctx.userId) return { error: "Tidak dapat mengedit laporan orang lain" };
  if (ex.is_approved === true) return { error: "Laporan sudah disetujui dan tidak dapat diubah" };

  const { error } = await supabase
    .from("daily_reports")
    .update({
      actual_progress: data.actual_progress,
      labor_count: data.labor_count,
      weather: data.weather,
      notes: data.notes || null,
      is_approved: null,
      approved_by: null,
      approved_at: null,
      rejection_note: null,
    } as never)
    .eq("id", reportId)
    .eq("tenant_id", ctx.tenantId);

  if (error) return { error: error.message };
  revalidatePath(PATH);
  return { success: true };
}

export async function approveReport(reportId: string) {
  const ctx = await getCtx();
  if ("error" in ctx) return { error: ctx.error };
  if (!["project_manager", "tenant_owner", "superadmin"].includes(ctx.role)) {
    return { error: "Tidak memiliki akses" };
  }

  const supabase = await createClient();

  const { data: rawReport } = await supabase
    .from("daily_reports")
    .select("id, wbs_item_id, actual_progress, project_id")
    .eq("id", reportId)
    .eq("tenant_id", ctx.tenantId)
    .single();

  const r = rawReport as unknown as {
    id: string; wbs_item_id: string | null; actual_progress: number; project_id: string;
  } | null;
  if (!r) return { error: "Laporan tidak ditemukan" };

  const { error } = await supabase
    .from("daily_reports")
    .update({
      is_approved: true,
      approved_by: ctx.userId,
      approved_at: new Date().toISOString(),
      rejection_note: null,
    } as never)
    .eq("id", reportId)
    .eq("tenant_id", ctx.tenantId);

  if (error) return { error: error.message };

  // S-Curve sync: update wbs_items.actual_progress
  if (r.wbs_item_id) {
    await supabase
      .from("wbs_items")
      .update({ actual_progress: r.actual_progress } as never)
      .eq("id", r.wbs_item_id)
      .eq("tenant_id", ctx.tenantId);
  }

  revalidatePath(PATH);
  revalidatePath(`/dashboard/projects/${r.project_id}`);
  return { success: true };
}

export async function revokeApproval(reportId: string) {
  const ctx = await getCtx();
  if ("error" in ctx) return { error: ctx.error };
  if (!["project_manager", "tenant_owner", "superadmin"].includes(ctx.role)) {
    return { error: "Tidak memiliki akses" };
  }

  const supabase = await createClient();

  const { data: rawReport } = await supabase
    .from("daily_reports")
    .select("id, wbs_item_id, project_id, is_approved")
    .eq("id", reportId)
    .eq("tenant_id", ctx.tenantId)
    .single();

  const r = rawReport as unknown as {
    id: string; wbs_item_id: string | null; project_id: string; is_approved: boolean | null;
  } | null;
  if (!r) return { error: "Laporan tidak ditemukan" };
  if (r.is_approved !== true) return { error: "Hanya laporan yang sudah disetujui yang bisa dibatalkan" };

  // Revert to pending
  const { error } = await supabase
    .from("daily_reports")
    .update({
      is_approved: null,
      approved_by: null,
      approved_at: null,
      rejection_note: null,
    } as never)
    .eq("id", reportId)
    .eq("tenant_id", ctx.tenantId);

  if (error) return { error: error.message };

  // S-Curve re-sync: find latest remaining approved report for this WBS
  if (r.wbs_item_id) {
    const { data: latestApproved } = await supabase
      .from("daily_reports")
      .select("actual_progress, report_date")
      .eq("wbs_item_id", r.wbs_item_id)
      .eq("tenant_id", ctx.tenantId)
      .eq("is_approved", true)
      .order("report_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    const la = latestApproved as unknown as { actual_progress: number } | null;
    await supabase
      .from("wbs_items")
      .update({ actual_progress: la?.actual_progress ?? 0 } as never)
      .eq("id", r.wbs_item_id)
      .eq("tenant_id", ctx.tenantId);
  }

  revalidatePath(PATH);
  revalidatePath(`/dashboard/projects/${r.project_id}`);
  return { success: true };
}

export async function approveBulk(reportIds: string[]) {
  if (!reportIds.length) return { success: true, count: 0 };
  const ctx = await getCtx();
  if ("error" in ctx) return { error: ctx.error };
  if (!["project_manager", "tenant_owner", "superadmin"].includes(ctx.role)) {
    return { error: "Tidak memiliki akses" };
  }

  const supabase = await createClient();

  // Fetch only pending reports that belong to this tenant
  const { data: rawReports } = await supabase
    .from("daily_reports")
    .select("id, wbs_item_id, actual_progress, project_id, report_date")
    .in("id", reportIds)
    .eq("tenant_id", ctx.tenantId)
    .is("is_approved", null);

  const reports = rawReports as unknown as {
    id: string; wbs_item_id: string | null;
    actual_progress: number; project_id: string; report_date: string;
  }[];

  if (!reports.length) return { success: true, count: 0 };

  const { error } = await supabase
    .from("daily_reports")
    .update({
      is_approved: true,
      approved_by: ctx.userId,
      approved_at: new Date().toISOString(),
      rejection_note: null,
    } as never)
    .in("id", reports.map((r) => r.id))
    .eq("tenant_id", ctx.tenantId);

  if (error) return { error: error.message };

  // S-Curve sync: per WBS, apply the latest (newest date) approved progress
  const wbsLatest = new Map<string, { progress: number; projectId: string }>();
  for (const r of [...reports].sort((a, b) => a.report_date.localeCompare(b.report_date))) {
    if (r.wbs_item_id) {
      wbsLatest.set(r.wbs_item_id, { progress: r.actual_progress, projectId: r.project_id });
    }
  }

  const projectIds = new Set<string>();
  for (const [wbsId, { progress, projectId }] of wbsLatest) {
    await supabase
      .from("wbs_items")
      .update({ actual_progress: progress } as never)
      .eq("id", wbsId)
      .eq("tenant_id", ctx.tenantId);
    projectIds.add(projectId);
  }

  for (const pid of projectIds) revalidatePath(`/dashboard/projects/${pid}`);
  revalidatePath(PATH);
  return { success: true, count: reports.length };
}

export async function rejectReport(reportId: string, rejectionNote: string) {
  const ctx = await getCtx();
  if ("error" in ctx) return { error: ctx.error };
  if (!["project_manager", "tenant_owner", "superadmin"].includes(ctx.role)) {
    return { error: "Tidak memiliki akses" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("daily_reports")
    .update({
      is_approved: false,
      approved_by: ctx.userId,
      approved_at: new Date().toISOString(),
      rejection_note: rejectionNote.trim() || "Laporan ditolak",
    } as never)
    .eq("id", reportId)
    .eq("tenant_id", ctx.tenantId);

  if (error) return { error: error.message };
  revalidatePath(PATH);
  return { success: true };
}

export async function saveReportPhoto(reportId: string, storagePath: string, caption: string) {
  const ctx = await getCtx();
  if ("error" in ctx) return { error: ctx.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from("daily_report_photos")
    .insert({
      report_id: reportId,
      tenant_id: ctx.tenantId,
      storage_path: storagePath,
      caption: caption || null,
    } as never);

  if (error) return { error: error.message };
  revalidatePath(PATH);
  return { success: true };
}

export async function deleteReportPhoto(photoId: string, storagePath: string) {
  const ctx = await getCtx();
  if ("error" in ctx) return { error: ctx.error };

  const supabase = await createClient();
  await supabase.storage.from("progress-photos").remove([storagePath]);

  const { error } = await supabase
    .from("daily_report_photos")
    .delete()
    .eq("id", photoId)
    .eq("tenant_id", ctx.tenantId);

  if (error) return { error: error.message };
  revalidatePath(PATH);
  return { success: true };
}
