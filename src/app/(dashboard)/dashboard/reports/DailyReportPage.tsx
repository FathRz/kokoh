"use client";

import { useState } from "react";
import { ClipboardList, ClipboardCheck } from "lucide-react";
import { type AdminReport, type ReportProject, type ReportWbsItem, type SubmittedReport } from "./page";
import TodayTasksView from "./TodayTasksView";
import AdminReportsView from "./AdminReportsView";
import { cn } from "@/lib/utils/cn";

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
  const canReview = ["project_manager", "tenant_owner", "superadmin"].includes(userRole);

  // Mobile tab state — only relevant for PM/owner on small screens
  const [mobileTab, setMobileTab] = useState<"submit" | "review">("review");

  // Site manager: always TodayTasksView only
  if (isSiteManager) {
    return (
      <TodayTasksView
        userId={userId}
        tenantId={tenantId}
        projects={projects}
        todayWbsItems={todayWbsItems}
        submittedToday={submittedToday}
        reportHistory={reportHistory}
        today={today}
      />
    );
  }

  // PM / owner: desktop shows AdminReportsView full-width;
  // mobile shows a tab toggle between TodayTasksView and AdminReportsView
  return (
    <>
      {/* Desktop */}
      <div className="hidden md:block">
        <AdminReportsView
          userRole={userRole}
          projects={projects}
          adminReports={adminReports}
          today={today}
        />
      </div>

      {/* Mobile — tab toggle for PM/owner */}
      <div className="block md:hidden">
        {/* Tab bar */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-4">
          <button
            onClick={() => setMobileTab("review")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-colors",
              mobileTab === "review"
                ? "bg-white text-brand-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            <ClipboardCheck className="w-4 h-4" />
            Review Laporan
            {adminReports.filter((r) => r.is_approved === null).length > 0 && (
              <span className="ml-0.5 px-1.5 py-0.5 text-xs bg-yellow-400 text-white rounded-full font-bold leading-none">
                {adminReports.filter((r) => r.is_approved === null).length}
              </span>
            )}
          </button>
          <button
            onClick={() => setMobileTab("submit")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-colors",
              mobileTab === "submit"
                ? "bg-white text-brand-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            <ClipboardList className="w-4 h-4" />
            Laporan Saya
          </button>
        </div>

        {/* Tab content */}
        {mobileTab === "review" ? (
          <AdminReportsView
            userRole={userRole}
            projects={projects}
            adminReports={adminReports}
            today={today}
          />
        ) : (
          <TodayTasksView
            userId={userId}
            tenantId={tenantId}
            projects={projects}
            todayWbsItems={todayWbsItems}
            submittedToday={submittedToday}
            reportHistory={reportHistory}
            today={today}
          />
        )}
      </div>
    </>
  );
}
