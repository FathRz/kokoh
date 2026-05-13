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

export class KokohDB extends Dexie {
  dailyLogs!: Table<OfflineDailyLog>;
  progressPhotos!: Table<OfflineProgressPhoto>;

  constructor() {
    super("kokoh_offline");

    this.version(1).stores({
      dailyLogs: "id, project_id, tenant_id, log_date, _sync_status",
      progressPhotos: "id, daily_log_id, tenant_id, _sync_status",
    });
  }
}

export const offlineDB = new KokohDB();
