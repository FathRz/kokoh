import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DailyReportPage from "./DailyReportPage";

export type ReportProject = { id: string; name: string; code: string };

export type ReportWbsItem = {
  id: string;
  name: string;
  code: string;
  project_id: string;
  actual_progress: number;
  planned_progress: number;
  start_date: string | null;
  end_date: string | null;
};

export type ReportPhoto = {
  id: string;
  storage_path: string;
  public_url: string;
  caption: string | null;
};

export type SubmittedReport = {
  id: string;
  wbs_item_id: string | null;
  report_date: string;
  created_at: string;
  actual_progress: number;
  labor_count: number;
  weather: string;
  notes: string | null;
  is_approved: boolean | null;
  rejection_note: string | null;
  photos: ReportPhoto[];
};

export type AdminReport = {
  id: string;
  project_id: string;
  project_name: string;
  wbs_item_id: string | null;
  wbs_item_name: string | null;
  report_date: string;
  created_at: string;
  actual_progress: number;
  labor_count: number;
  weather: string;
  notes: string | null;
  is_approved: boolean | null;
  rejection_note: string | null;
  created_by: string;
  created_by_name: string;
  photos: { id: string; storage_path: string; caption: string | null; public_url: string }[];
};

export default async function ReportsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: rawProfile } = await supabase
    .from("profiles")
    .select("tenant_id, role, full_name")
    .eq("id", user.id)
    .single();

  const profile = rawProfile as unknown as { tenant_id: string; role: string; full_name: string } | null;
  if (!profile) redirect("/login");

  const today = new Date().toISOString().split("T")[0];
  const isSiteManager = profile.role === "site_manager";

  // Projects: site_manager sees only assigned; others see all active
  let projects: ReportProject[] = [];
  if (isSiteManager) {
    const { data } = await supabase
      .from("projects")
      .select("id, name, code")
      .eq("tenant_id", profile.tenant_id)
      .eq("site_manager_id", user.id)
      .in("status", ["active", "planning"])
      .order("name");
    projects = (data ?? []).map((p) => ({
      id: (p as unknown as ReportProject).id,
      name: (p as unknown as ReportProject).name,
      code: (p as unknown as ReportProject).code,
    }));
  } else {
    const { data } = await supabase
      .from("projects")
      .select("id, name, code")
      .eq("tenant_id", profile.tenant_id)
      .in("status", ["active", "planning"])
      .order("name");
    projects = (data ?? []).map((p) => ({
      id: (p as unknown as ReportProject).id,
      name: (p as unknown as ReportProject).name,
      code: (p as unknown as ReportProject).code,
    }));
  }

  // WBS items active today — fetched for all roles so mobile TodayTasksView works for everyone
  let todayWbsItems: ReportWbsItem[] = [];
  if (projects.length > 0) {
    const projectIds = projects.map((p) => p.id);
    const { data: allWbs } = await supabase
      .from("wbs_items")
      .select("id, name, code, project_id, actual_progress, planned_progress, start_date, end_date")
      .in("project_id", projectIds)
      .eq("tenant_id", profile.tenant_id)
      .order("order_index");

    todayWbsItems = (allWbs ?? []).filter((item) => {
      const i = item as unknown as ReportWbsItem;
      // Items with no dates are always considered active
      if (!i.start_date && !i.end_date) return true;
      // Items with only one date set: include them
      if (!i.start_date || !i.end_date) return true;
      // Date range check (ISO strings compare correctly as strings)
      return i.start_date <= today && i.end_date >= today;
    }) as unknown as ReportWbsItem[];
  }

  // Fetch this user's reports for the last 30 days — used for form init (today) + history display
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const { data: rawHistory } = await supabase
    .from("daily_reports")
    .select("id, wbs_item_id, report_date, created_at, actual_progress, labor_count, weather, notes, is_approved, rejection_note, daily_report_photos(id, storage_path, caption)")
    .eq("tenant_id", profile.tenant_id)
    .eq("created_by", user.id)
    .gte("report_date", thirtyDaysAgo)
    .order("report_date", { ascending: false })
    .order("created_at", { ascending: false });

  type RawHistoryItem = {
    id: string; wbs_item_id: string | null; report_date: string; created_at: string;
    actual_progress: number; labor_count: number; weather: string;
    notes: string | null; is_approved: boolean | null; rejection_note: string | null;
    daily_report_photos: { id: string; storage_path: string; caption: string | null }[];
  };

  const reportHistory: SubmittedReport[] = (rawHistory ?? []).map((r) => {
    const item = r as unknown as RawHistoryItem;
    return {
      id: item.id,
      wbs_item_id: item.wbs_item_id,
      report_date: item.report_date,
      created_at: item.created_at,
      actual_progress: item.actual_progress,
      labor_count: item.labor_count,
      weather: item.weather,
      notes: item.notes,
      is_approved: item.is_approved,
      rejection_note: item.rejection_note,
      photos: (item.daily_report_photos ?? []).map((ph) => ({
        id: ph.id,
        storage_path: ph.storage_path,
        caption: ph.caption,
        public_url: supabase.storage.from("progress-photos").getPublicUrl(ph.storage_path).data.publicUrl,
      })),
    };
  });

  const submittedToday = reportHistory.filter((r) => r.report_date === today);

  // Admin: recent reports across all projects (last 30 days, max 100)
  let adminReports: AdminReport[] = [];
  if (!isSiteManager) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const { data: rawReports } = await supabase
      .from("daily_reports")
      .select(`
        id, project_id, wbs_item_id, report_date, actual_progress,
        labor_count, weather, notes, is_approved, rejection_note, created_by, created_at,
        projects(name),
        wbs_items(name),
        profiles!created_by(full_name),
        daily_report_photos(id, storage_path, caption)
      `)
      .eq("tenant_id", profile.tenant_id)
      .gte("report_date", thirtyDaysAgo)
      .order("report_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(100);

    type RawReport = {
      id: string; project_id: string; wbs_item_id: string | null; report_date: string; created_at: string;
      actual_progress: number; labor_count: number; weather: string; notes: string | null;
      is_approved: boolean | null; rejection_note: string | null; created_by: string;
      projects: { name: string } | null;
      wbs_items: { name: string } | null;
      profiles: { full_name: string } | null;
      daily_report_photos: { id: string; storage_path: string; caption: string | null }[];
    };

    adminReports = (rawReports ?? []).map((r) => {
      const report = r as unknown as RawReport;
      const photos = (report.daily_report_photos ?? []).map((ph) => ({
        id: ph.id,
        storage_path: ph.storage_path,
        caption: ph.caption,
        public_url: supabase.storage
          .from("progress-photos")
          .getPublicUrl(ph.storage_path).data.publicUrl,
      }));
      return {
        id: report.id,
        project_id: report.project_id,
        project_name: report.projects?.name ?? "—",
        wbs_item_id: report.wbs_item_id,
        wbs_item_name: report.wbs_items?.name ?? null,
        report_date: report.report_date,
        created_at: report.created_at,
        actual_progress: report.actual_progress,
        labor_count: report.labor_count,
        weather: report.weather,
        notes: report.notes,
        is_approved: report.is_approved,
        rejection_note: report.rejection_note,
        created_by: report.created_by,
        created_by_name: report.profiles?.full_name ?? "—",
        photos,
      };
    });
  }

  return (
    <DailyReportPage
      userId={user.id}
      userRole={profile.role}
      tenantId={profile.tenant_id}
      projects={projects}
      todayWbsItems={todayWbsItems}
      submittedToday={submittedToday}
      reportHistory={reportHistory}
      adminReports={adminReports}
      today={today}
    />
  );
}
