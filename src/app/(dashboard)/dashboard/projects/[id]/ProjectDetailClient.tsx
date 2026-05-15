"use client";

import { useState } from "react";
import { ChevronLeft, Info, ListTree, FileText } from "lucide-react";
import Link from "next/link";
import { ProjectDetail, WbsItem, ProjectFile, PerumahanOpt, BlokOpt, MemberOpt } from "./page";
import ProjectInfoTab from "./ProjectInfoTab";
import WbsTab from "./WbsTab";
import DocumentsTab from "./DocumentsTab";

type TabId = "info" | "wbs" | "documents";

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "info", label: "Info Proyek", icon: Info },
  { id: "wbs", label: "RAP / WBS", icon: ListTree },
  { id: "documents", label: "Dokumen", icon: FileText },
];

const STATUS_LABELS: Record<string, string> = {
  planning: "Perencanaan",
  active: "Aktif",
  on_hold: "Ditunda",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

const STATUS_COLORS: Record<string, string> = {
  planning: "bg-blue-50 text-blue-700 border border-blue-200",
  active: "bg-green-50 text-green-700 border border-green-200",
  on_hold: "bg-yellow-50 text-yellow-700 border border-yellow-200",
  completed: "bg-gray-50 text-gray-700 border border-gray-200",
  cancelled: "bg-red-50 text-red-700 border border-red-200",
};

interface Props {
  project: ProjectDetail;
  wbsItems: WbsItem[];
  projectFiles: ProjectFile[];
  tenantId: string;
  perumahanOptions: PerumahanOpt[];
  blokOptions: BlokOpt[];
  memberOptions: MemberOpt[];
}

export default function ProjectDetailClient({ project, wbsItems, projectFiles, tenantId, perumahanOptions, blokOptions, memberOptions }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("info");

  return (
    <div className="space-y-5">
      {/* Breadcrumb + Title */}
      <div>
        <Link
          href="/dashboard/projects"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-600 transition-colors mb-3"
        >
          <ChevronLeft className="w-4 h-4" />
          Kembali ke Proyek
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            <p className="text-sm text-gray-400 font-mono mt-0.5">{project.code}</p>
            {project.perumahan_name && (
              <p className="text-sm text-gray-500 mt-1">
                {project.perumahan_name}{project.blok_nomor ? ` · Blok ${project.blok_nomor}` : ""}
              </p>
            )}
          </div>
          <span
            className={`mt-1 shrink-0 px-3 py-1 text-sm font-medium rounded-full ${STATUS_COLORS[project.status] ?? STATUS_COLORS.planning}`}
          >
            {STATUS_LABELS[project.status] ?? project.status}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
                  isActive
                    ? "border-brand-500 text-brand-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {tab.id === "documents" && projectFiles.length > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.5 text-xs bg-brand-100 text-brand-600 rounded-full">
                    {projectFiles.length}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "info" && (
          <ProjectInfoTab
            project={project}
            perumahanOptions={perumahanOptions}
            blokOptions={blokOptions}
            memberOptions={memberOptions}
          />
        )}
        {activeTab === "wbs" && <WbsTab project={project} wbsItems={wbsItems} />}
        {activeTab === "documents" && (
          <DocumentsTab
            projectId={project.id}
            tenantId={tenantId}
            files={projectFiles}
          />
        )}
      </div>
    </div>
  );
}
