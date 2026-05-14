"use client";

import { useState } from "react";
import { FolderPlus, MapPin, Calendar, TrendingUp, Folder, Search, Home } from "lucide-react";
import { ProjectRow, PerumahanOption, BlokOption } from "./page";
import CreateProjectModal from "./CreateProjectModal";

const STATUS_LABELS: Record<string, string> = {
  planning: "Perencanaan",
  active: "Aktif",
  on_hold: "Ditunda",
  completed: "Selesai",
};

const STATUS_COLORS: Record<string, string> = {
  planning: "bg-blue-50 text-blue-700 border border-blue-200",
  active: "bg-green-50 text-green-700 border border-green-200",
  on_hold: "bg-yellow-50 text-yellow-700 border border-yellow-200",
  completed: "bg-gray-50 text-gray-700 border border-gray-200",
};

function formatRupiah(n: number) {
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)}M`;
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(0)}jt`;
  if (n >= 1_000) return `Rp ${(n / 1_000).toFixed(0)}rb`;
  return `Rp ${n}`;
}

function formatDate(d: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

interface Props {
  projects: ProjectRow[];
  perumahanOptions: PerumahanOption[];
  blokOptions: BlokOption[];
}

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "Semua" },
  { value: "planning", label: "Perencanaan" },
  { value: "active", label: "Aktif" },
  { value: "on_hold", label: "Ditunda" },
  { value: "completed", label: "Selesai" },
];

export default function ProjectsClient({ projects, perumahanOptions, blokOptions }: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  const stats = {
    total: projects.length,
    active: projects.filter((p) => p.status === "active").length,
    planning: projects.filter((p) => p.status === "planning").length,
    completed: projects.filter((p) => p.status === "completed").length,
  };

  const filtered = projects.filter((p) => {
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.code.toLowerCase().includes(q) ||
      (p.location ?? "").toLowerCase().includes(q) ||
      (p.perumahan_name ?? "").toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  return (
    <>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Proyek</h1>
            <p className="text-sm text-gray-500 mt-0.5">Kelola semua proyek konstruksi</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-lg transition-colors"
          >
            <FolderPlus className="w-4 h-4" />
            Buat Proyek
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Proyek", value: stats.total, color: "text-gray-900" },
            { label: "Aktif", value: stats.active, color: "text-green-600" },
            { label: "Perencanaan", value: stats.planning, color: "text-blue-600" },
            { label: "Selesai", value: stats.completed, color: "text-gray-500" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
              <p className="text-xs text-gray-500 font-medium">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, kode, perumahan..."
              className="w-full pl-9 pr-3.5 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {STATUS_FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setStatusFilter(opt.value)}
                className={`px-3.5 py-2 text-sm font-medium rounded-lg transition-colors ${
                  statusFilter === opt.value
                    ? "bg-brand-500 text-white"
                    : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Project Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <Folder className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-gray-500 text-sm font-medium">
              {projects.length === 0 ? "Belum ada proyek" : "Tidak ada proyek yang sesuai filter"}
            </p>
            {projects.length === 0 && (
              <button
                onClick={() => setShowCreate(true)}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-brand-600 hover:text-brand-700"
              >
                <FolderPlus className="w-4 h-4" />
                Buat proyek pertama
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateProjectModal
          onClose={() => setShowCreate(false)}
          perumahanOptions={perumahanOptions}
          blokOptions={blokOptions}
        />
      )}
    </>
  );
}

function ProjectCard({ project }: { project: ProjectRow }) {
  const progress = project.progress ?? 0;

  return (
    <a
      href={`/dashboard/projects/${project.id}`}
      className="block bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-brand-200 transition-all group p-5"
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900 text-sm leading-snug group-hover:text-brand-600 transition-colors line-clamp-2">
            {project.name}
          </h3>
          <p className="text-xs text-gray-400 font-mono mt-0.5">{project.code}</p>
        </div>
        <span className={`shrink-0 px-2.5 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[project.status] ?? STATUS_COLORS.planning}`}>
          {STATUS_LABELS[project.status] ?? project.status}
        </span>
      </div>

      {/* Perumahan + Blok */}
      {project.perumahan_name && (
        <div className="flex items-center gap-1.5 mb-2">
          <Home className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <span className="text-xs text-gray-500 truncate">
            {project.perumahan_name}{project.blok_nomor ? ` · Blok ${project.blok_nomor}` : ""}
          </span>
        </div>
      )}

      {/* Location */}
      {project.location && (
        <div className="flex items-center gap-1.5 mb-3">
          <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <span className="text-xs text-gray-500 truncate">{project.location}</span>
        </div>
      )}

      {/* Progress */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-gray-500 mb-1.5">
          <div className="flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Progress</span>
          </div>
          <span className="font-medium text-gray-700">{progress}%</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-500 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-50">
        <span className="text-sm font-semibold text-gray-800">
          {formatRupiah(project.budget_total)}
        </span>
        {project.end_date && (
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Calendar className="w-3.5 h-3.5" />
            <span>{formatDate(project.end_date)}</span>
          </div>
        )}
      </div>
    </a>
  );
}
