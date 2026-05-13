-- ============================================================
-- KOKOH - Row Level Security (RLS) Policies
-- Migration: 002_rls_policies.sql
-- ============================================================

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Mendapatkan tenant_id dari user yang sedang login
CREATE OR REPLACE FUNCTION get_tenant_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT tenant_id FROM profiles WHERE id = auth.uid();
$$;

-- Mendapatkan role dari user yang sedang login
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- Cek apakah user adalah superadmin
CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'superadmin'
  );
$$;

-- Cek apakah user memiliki role tertentu atau lebih tinggi
CREATE OR REPLACE FUNCTION has_role(required_role user_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT CASE
    WHEN is_superadmin() THEN TRUE
    WHEN required_role = 'tenant_owner' THEN get_user_role() IN ('tenant_owner')
    WHEN required_role = 'project_manager' THEN get_user_role() IN ('tenant_owner', 'project_manager')
    WHEN required_role = 'finance' THEN get_user_role() IN ('tenant_owner', 'project_manager', 'finance')
    WHEN required_role = 'logistik' THEN get_user_role() IN ('tenant_owner', 'project_manager', 'logistik', 'finance')
    WHEN required_role = 'site_manager' THEN get_user_role() IN ('tenant_owner', 'project_manager', 'site_manager', 'logistik', 'finance')
    WHEN required_role = 'sales_admin' THEN get_user_role() IN ('tenant_owner', 'sales_admin')
    ELSE FALSE
  END;
$$;

-- ============================================================
-- ENABLE RLS
-- ============================================================

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE wbs_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE consumers ENABLE ROW LEVEL SECURITY;
ALTER TABLE unit_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- TENANTS POLICIES
-- ============================================================

CREATE POLICY "superadmin_all_tenants" ON tenants
  FOR ALL USING (is_superadmin());

CREATE POLICY "tenant_owner_read_own_tenant" ON tenants
  FOR SELECT USING (id = get_tenant_id());

-- ============================================================
-- PROFILES POLICIES
-- ============================================================

CREATE POLICY "read_same_tenant_profiles" ON profiles
  FOR SELECT USING (
    is_superadmin() OR tenant_id = get_tenant_id()
  );

CREATE POLICY "tenant_owner_manage_profiles" ON profiles
  FOR ALL USING (
    is_superadmin() OR (
      tenant_id = get_tenant_id() AND has_role('tenant_owner')
    )
  );

CREATE POLICY "user_update_own_profile" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- ============================================================
-- PROJECTS POLICIES
-- ============================================================

CREATE POLICY "read_tenant_projects" ON projects
  FOR SELECT USING (
    is_superadmin() OR tenant_id = get_tenant_id()
  );

CREATE POLICY "pm_manage_projects" ON projects
  FOR ALL USING (
    is_superadmin() OR (
      tenant_id = get_tenant_id() AND has_role('project_manager')
    )
  );

-- ============================================================
-- WBS_ITEMS POLICIES
-- ============================================================

CREATE POLICY "read_tenant_wbs" ON wbs_items
  FOR SELECT USING (
    is_superadmin() OR tenant_id = get_tenant_id()
  );

CREATE POLICY "pm_manage_wbs" ON wbs_items
  FOR ALL USING (
    is_superadmin() OR (
      tenant_id = get_tenant_id() AND has_role('project_manager')
    )
  );

-- ============================================================
-- DAILY_LOGS POLICIES
-- ============================================================

CREATE POLICY "read_tenant_daily_logs" ON daily_logs
  FOR SELECT USING (
    is_superadmin() OR tenant_id = get_tenant_id()
  );

CREATE POLICY "site_manager_insert_daily_log" ON daily_logs
  FOR INSERT WITH CHECK (
    tenant_id = get_tenant_id() AND
    has_role('site_manager') AND
    created_by = auth.uid()
  );

CREATE POLICY "site_manager_update_own_log" ON daily_logs
  FOR UPDATE USING (
    tenant_id = get_tenant_id() AND
    (created_by = auth.uid() OR has_role('project_manager'))
  );

-- ============================================================
-- PROGRESS_PHOTOS POLICIES
-- ============================================================

CREATE POLICY "read_tenant_photos" ON progress_photos
  FOR SELECT USING (
    is_superadmin() OR tenant_id = get_tenant_id()
  );

CREATE POLICY "site_manager_insert_photos" ON progress_photos
  FOR INSERT WITH CHECK (
    tenant_id = get_tenant_id() AND has_role('site_manager')
  );

-- ============================================================
-- MATERIALS POLICIES
-- ============================================================

CREATE POLICY "read_tenant_materials" ON materials
  FOR SELECT USING (
    is_superadmin() OR tenant_id = get_tenant_id()
  );

CREATE POLICY "pm_manage_materials" ON materials
  FOR ALL USING (
    is_superadmin() OR (
      tenant_id = get_tenant_id() AND has_role('project_manager')
    )
  );

-- ============================================================
-- INVENTORY POLICIES
-- ============================================================

CREATE POLICY "read_tenant_inventory" ON inventory
  FOR SELECT USING (
    is_superadmin() OR tenant_id = get_tenant_id()
  );

CREATE POLICY "logistik_manage_inventory" ON inventory
  FOR ALL USING (
    is_superadmin() OR (
      tenant_id = get_tenant_id() AND has_role('logistik')
    )
  );

-- ============================================================
-- MATERIAL_REQUESTS POLICIES
-- ============================================================

CREATE POLICY "read_tenant_mr" ON material_requests
  FOR SELECT USING (
    is_superadmin() OR tenant_id = get_tenant_id()
  );

CREATE POLICY "site_manager_create_mr" ON material_requests
  FOR INSERT WITH CHECK (
    tenant_id = get_tenant_id() AND
    has_role('site_manager') AND
    requested_by = auth.uid()
  );

CREATE POLICY "pm_approve_mr" ON material_requests
  FOR UPDATE USING (
    is_superadmin() OR (
      tenant_id = get_tenant_id() AND has_role('project_manager')
    )
  );

-- ============================================================
-- MATERIAL_REQUEST_ITEMS POLICIES
-- ============================================================

CREATE POLICY "read_mr_items" ON material_request_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM material_requests mr
      WHERE mr.id = material_request_id
        AND (is_superadmin() OR mr.tenant_id = get_tenant_id())
    )
  );

CREATE POLICY "insert_mr_items" ON material_request_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM material_requests mr
      WHERE mr.id = material_request_id
        AND mr.tenant_id = get_tenant_id()
        AND mr.status = 'pending'
    )
  );

-- ============================================================
-- PURCHASE_ORDERS POLICIES
-- ============================================================

CREATE POLICY "read_tenant_po" ON purchase_orders
  FOR SELECT USING (
    is_superadmin() OR tenant_id = get_tenant_id()
  );

CREATE POLICY "finance_manage_po" ON purchase_orders
  FOR ALL USING (
    is_superadmin() OR (
      tenant_id = get_tenant_id() AND has_role('finance')
    )
  );

-- ============================================================
-- PURCHASE_ORDER_ITEMS POLICIES
-- ============================================================

CREATE POLICY "read_po_items" ON purchase_order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM purchase_orders po
      WHERE po.id = purchase_order_id
        AND (is_superadmin() OR po.tenant_id = get_tenant_id())
    )
  );

CREATE POLICY "finance_manage_po_items" ON purchase_order_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM purchase_orders po
      WHERE po.id = purchase_order_id
        AND po.tenant_id = get_tenant_id()
        AND has_role('finance')
    )
  );

-- ============================================================
-- PROPERTY_UNITS POLICIES
-- ============================================================

CREATE POLICY "read_tenant_units" ON property_units
  FOR SELECT USING (
    is_superadmin() OR tenant_id = get_tenant_id()
  );

CREATE POLICY "sales_manage_units" ON property_units
  FOR ALL USING (
    is_superadmin() OR (
      tenant_id = get_tenant_id() AND has_role('sales_admin')
    )
  );

-- ============================================================
-- CONSUMERS POLICIES (data sensitif - hanya sales & owner)
-- ============================================================

CREATE POLICY "sales_read_consumers" ON consumers
  FOR SELECT USING (
    is_superadmin() OR (
      tenant_id = get_tenant_id() AND has_role('sales_admin')
    )
  );

CREATE POLICY "sales_manage_consumers" ON consumers
  FOR ALL USING (
    is_superadmin() OR (
      tenant_id = get_tenant_id() AND has_role('sales_admin')
    )
  );

-- ============================================================
-- UNIT_BOOKINGS POLICIES
-- ============================================================

CREATE POLICY "read_tenant_bookings" ON unit_bookings
  FOR SELECT USING (
    is_superadmin() OR (
      tenant_id = get_tenant_id() AND has_role('sales_admin')
    )
  );

CREATE POLICY "sales_manage_bookings" ON unit_bookings
  FOR ALL USING (
    is_superadmin() OR (
      tenant_id = get_tenant_id() AND has_role('sales_admin')
    )
  );

-- ============================================================
-- AUDIT_LOGS POLICIES (read-only untuk non-superadmin)
-- ============================================================

CREATE POLICY "read_tenant_audit_logs" ON audit_logs
  FOR SELECT USING (
    is_superadmin() OR (
      tenant_id = get_tenant_id() AND has_role('tenant_owner')
    )
  );

CREATE POLICY "system_insert_audit_logs" ON audit_logs
  FOR INSERT WITH CHECK (TRUE); -- hanya dari trigger
