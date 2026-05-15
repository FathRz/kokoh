import Dexie, { type Table } from "dexie";
import type { WeatherCondition } from "@/types/database";

export interface OfflineDailyLog {
  id: string;
  project_id: string;
  tenant_id: string;
  log_date: string;
  weather: WeatherCondition;
  worker_count: number;
  notes: string | null;
  obstacles: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  _sync_status: "pending" | "synced" | "error";
  _sync_error?: string;
}

export interface OfflineProgressPhoto {
  id: string;
  daily_log_id: string;
  tenant_id: string;
  image_blob: Blob;
  caption: string | null;
  latitude: number | null;
  longitude: number | null;
  taken_at: string;
  _sync_status: "pending" | "synced" | "error";
}

export interface OfflineDailyReport {
  id: string;             // local UUID (crypto.randomUUID())
  project_id: string;
  wbs_item_id: string | null;
  tenant_id: string;
  created_by: string;
  report_date: string;
  actual_progress: number;
  labor_count: number;
  weather: string;
  notes: string | null;
  _sync_status: "pending" | "synced" | "error";
  _sync_error?: string;
  _server_id?: string;    // set after successful sync
}

export interface OfflineReportPhoto {
  id: string;             // local UUID
  report_local_id: string; // matches OfflineDailyReport.id
  image_blob: Blob;
  caption: string | null;
  _sync_status: "pending" | "synced" | "error";
}

export class KokohDB extends Dexie {
  dailyLogs!: Table<OfflineDailyLog>;
  progressPhotos!: Table<OfflineProgressPhoto>;
  dailyReports!: Table<OfflineDailyReport>;
  reportPhotos!: Table<OfflineReportPhoto>;

  constructor() {
    super("kokoh_offline");

    this.version(1).stores({
      dailyLogs: "id, project_id, tenant_id, log_date, _sync_status",
      progressPhotos: "id, daily_log_id, tenant_id, _sync_status",
    });

    this.version(2).stores({
      dailyLogs: "id, project_id, tenant_id, log_date, _sync_status",
      progressPhotos: "id, daily_log_id, tenant_id, _sync_status",
      dailyReports: "id, project_id, wbs_item_id, tenant_id, report_date, _sync_status",
      reportPhotos: "id, report_local_id, _sync_status",
    });
  }
}

export const offlineDB = new KokohDB();
