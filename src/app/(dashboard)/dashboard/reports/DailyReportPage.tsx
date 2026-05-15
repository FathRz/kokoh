"use client";

import { type AdminReport, type ReportProject, type ReportWbsItem, type SubmittedReport } from "./page";
import TodayTasksView from "./TodayTasksView";
import AdminReportsView from "./AdminReportsView";

interface Props {
  userId: string;
  userRole: string;
  tenantId: string;
  projects: ReportProject[];
  todayWbsItems: ReportWbsItem[];
  submittedToday: SubmittedReport[];
  reportHistory: SubmittedReport[];
  adminReports: AdminReport[];
  today: string;
}

export default function DailyReportPage({
  userId,
  userRole,
  tenantId,
  projects,
  todayWbsItems,
  submittedToday,
  reportHistory,
  adminReports,
  today,
}: Props) {
  const isSiteManager = userRole === "site_manager";

  return (
    <>
      {/* Mobile view (< md): always TodayTasksView */}
      <div className={isSiteManager ? "block" : "block md:hidden"}>
        <TodayTasksView
          userId={userId}
          tenantId={tenantId}
          projects={projects}
          todayWbsItems={todayWbsItems}
          submittedToday={submittedToday}
          reportHistory={reportHistory}
          today={today}
        />
      </div>

      {/* Desktop view (>= md): AdminReportsView for PM/owner */}
      {!isSiteManager && (
        <div className="hidden md:block">
          <AdminReportsView
            userRole={userRole}
            projects={projects}
            adminReports={adminReports}
            today={today}
          />
        </div>
      )}
    </>
  );
}
