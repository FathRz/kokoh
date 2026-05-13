export type UserRole =
  | "superadmin"
  | "tenant_owner"
  | "project_manager"
  | "site_manager"
  | "logistik"
  | "finance"
  | "sales_admin";

export type ProjectStatus = "planning" | "active" | "on_hold" | "completed" | "cancelled";

export type MaterialRequestStatus = "pending" | "approved" | "rejected" | "fulfilled";

export type PurchaseOrderStatus = "draft" | "sent" | "confirmed" | "received" | "cancelled";

export type UnitStatus = "available" | "booking" | "sold";

export type WeatherCondition = "cerah" | "berawan" | "hujan_ringan" | "hujan_lebat";

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string;
          name: string;
          slug: string;
          plan: "lite" | "pro";
          max_projects: number | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["tenants"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["tenants"]["Insert"]>;
      };
      profiles: {
        Row: {
          id: string;
          tenant_id: string;
          full_name: string;
          role: UserRole;
          phone: string | null;
          avatar_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["profiles"]["Row"], "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      projects: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          code: string;
          location: string | null;
          status: ProjectStatus;
          start_date: string | null;
          end_date: string | null;
          budget_total: number;
          description: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["projects"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["projects"]["Insert"]>;
      };
      wbs_items: {
        Row: {
          id: string;
          project_id: string;
          tenant_id: string;
          name: string;
          code: string;
          parent_id: string | null;
          budget_amount: number;
          cost_weight: number;
          planned_progress: number;
          actual_progress: number;
          order_index: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["wbs_items"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["wbs_items"]["Insert"]>;
      };
      daily_logs: {
        Row: {
          id: string;
          project_id: string;
          tenant_id: string;
          log_date: string;
          weather: WeatherCondition;
          worker_count: number;
          notes: string | null;
          obstacles: string | null;
          created_by: string;
          synced_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["daily_logs"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["daily_logs"]["Insert"]>;
      };
      progress_photos: {
        Row: {
          id: string;
          daily_log_id: string;
          tenant_id: string;
          storage_path: string;
          caption: string | null;
          latitude: number | null;
          longitude: number | null;
          taken_at: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["progress_photos"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["progress_photos"]["Insert"]>;
      };
      materials: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          unit: string;
          category: string | null;
          price_per_unit: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["materials"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["materials"]["Insert"]>;
      };
      inventory: {
        Row: {
          id: string;
          project_id: string;
          tenant_id: string;
          material_id: string;
          quantity_on_hand: number;
          minimum_stock: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["inventory"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["inventory"]["Insert"]>;
      };
      material_requests: {
        Row: {
          id: string;
          project_id: string;
          tenant_id: string;
          wbs_item_id: string | null;
          requested_by: string;
          status: MaterialRequestStatus;
          notes: string | null;
          approved_by: string | null;
          approved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["material_requests"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["material_requests"]["Insert"]>;
      };
      purchase_orders: {
        Row: {
          id: string;
          tenant_id: string;
          project_id: string;
          material_request_id: string | null;
          po_number: string;
          supplier_name: string;
          supplier_contact: string | null;
          status: PurchaseOrderStatus;
          total_amount: number;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["purchase_orders"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["purchase_orders"]["Insert"]>;
      };
      property_units: {
        Row: {
          id: string;
          project_id: string;
          tenant_id: string;
          unit_code: string;
          type: string;
          land_area: number | null;
          building_area: number | null;
          price: number;
          status: UnitStatus;
          grid_position: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["property_units"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["property_units"]["Insert"]>;
      };
      audit_logs: {
        Row: {
          id: string;
          tenant_id: string;
          user_id: string;
          action: string;
          table_name: string;
          record_id: string;
          old_data: Record<string, unknown> | null;
          new_data: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["audit_logs"]["Row"], "id" | "created_at">;
        Update: never;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
