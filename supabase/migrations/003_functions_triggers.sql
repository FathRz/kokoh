-- ============================================================
-- KOKOH - Functions & Triggers
-- Migration: 003_functions_triggers.sql
-- ============================================================

-- ============================================================
-- TRIGGER: updated_at auto-update
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_wbs_items_updated_at
  BEFORE UPDATE ON wbs_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_daily_logs_updated_at
  BEFORE UPDATE ON daily_logs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_materials_updated_at
  BEFORE UPDATE ON materials
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_inventory_updated_at
  BEFORE UPDATE ON inventory
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_material_requests_updated_at
  BEFORE UPDATE ON material_requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_purchase_orders_updated_at
  BEFORE UPDATE ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_property_units_updated_at
  BEFORE UPDATE ON property_units
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_consumers_updated_at
  BEFORE UPDATE ON consumers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_unit_bookings_updated_at
  BEFORE UPDATE ON unit_bookings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- TRIGGER: auto-create profile saat user baru mendaftar
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id UUID;
  v_company_name TEXT;
  v_slug TEXT;
BEGIN
  -- Ambil data dari metadata pendaftaran
  v_company_name := NEW.raw_user_meta_data->>'company_name';

  IF v_company_name IS NOT NULL AND v_company_name != '' THEN
    -- Buat tenant baru (self-registration sebagai tenant_owner)
    v_slug := LOWER(REGEXP_REPLACE(v_company_name, '[^a-zA-Z0-9]', '-', 'g'));
    v_slug := v_slug || '-' || SUBSTR(gen_random_uuid()::TEXT, 1, 8);

    INSERT INTO tenants (name, slug, plan, max_projects)
    VALUES (v_company_name, v_slug, 'lite', 2)
    RETURNING id INTO v_tenant_id;

    -- Buat profil sebagai tenant_owner
    INSERT INTO profiles (id, tenant_id, full_name, role)
    VALUES (
      NEW.id,
      v_tenant_id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
      'tenant_owner'
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_on_new_user
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- TRIGGER: Audit Log untuk perubahan penting
-- ============================================================

CREATE OR REPLACE FUNCTION write_audit_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id UUID;
  v_record_id TEXT;
  v_old_data JSONB;
  v_new_data JSONB;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_tenant_id := OLD.tenant_id;
    v_record_id := OLD.id::TEXT;
    v_old_data  := to_jsonb(OLD);
    v_new_data  := NULL;
  ELSIF TG_OP = 'INSERT' THEN
    v_tenant_id := NEW.tenant_id;
    v_record_id := NEW.id::TEXT;
    v_old_data  := NULL;
    v_new_data  := to_jsonb(NEW);
  ELSE
    v_tenant_id := NEW.tenant_id;
    v_record_id := NEW.id::TEXT;
    v_old_data  := to_jsonb(OLD);
    v_new_data  := to_jsonb(NEW);
  END IF;

  INSERT INTO audit_logs (tenant_id, user_id, action, table_name, record_id, old_data, new_data)
  VALUES (v_tenant_id, COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'), TG_OP, TG_TABLE_NAME, v_record_id, v_old_data, v_new_data);

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Pasang audit log pada tabel-tabel kritikal
CREATE TRIGGER trg_audit_projects
  AFTER INSERT OR UPDATE OR DELETE ON projects
  FOR EACH ROW EXECUTE FUNCTION write_audit_log();

CREATE TRIGGER trg_audit_material_requests
  AFTER INSERT OR UPDATE OR DELETE ON material_requests
  FOR EACH ROW EXECUTE FUNCTION write_audit_log();

CREATE TRIGGER trg_audit_purchase_orders
  AFTER INSERT OR UPDATE OR DELETE ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION write_audit_log();

CREATE TRIGGER trg_audit_unit_bookings
  AFTER INSERT OR UPDATE OR DELETE ON unit_bookings
  FOR EACH ROW EXECUTE FUNCTION write_audit_log();

CREATE TRIGGER trg_audit_inventory
  AFTER UPDATE ON inventory
  FOR EACH ROW EXECUTE FUNCTION write_audit_log();

-- ============================================================
-- FUNCTION: Hitung S-Curve progress total proyek
-- ============================================================

CREATE OR REPLACE FUNCTION calculate_project_progress(p_project_id UUID)
RETURNS NUMERIC
LANGUAGE SQL
STABLE
AS $$
  -- Rumus: Σ (actual_progress / 100 * cost_weight)
  -- Hasil dalam persen (0-100)
  SELECT COALESCE(
    SUM((actual_progress / 100.0) * cost_weight),
    0
  )
  FROM wbs_items
  WHERE project_id = p_project_id
    AND parent_id IS NULL; -- hanya item level 1 untuk bobot total
$$;

-- ============================================================
-- FUNCTION: Cek apakah proyek melewati limit paket tenant
-- ============================================================

CREATE OR REPLACE FUNCTION check_project_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_tenant tenants%ROWTYPE;
  v_count INTEGER;
BEGIN
  SELECT * INTO v_tenant FROM tenants WHERE id = NEW.tenant_id;

  -- Paket pro tidak ada limit
  IF v_tenant.max_projects IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM projects
  WHERE tenant_id = NEW.tenant_id
    AND status NOT IN ('cancelled');

  IF v_count >= v_tenant.max_projects THEN
    RAISE EXCEPTION 'Batas maksimum proyek (%) telah tercapai untuk paket %.',
      v_tenant.max_projects, v_tenant.plan
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_project_limit
  BEFORE INSERT ON projects
  FOR EACH ROW EXECUTE FUNCTION check_project_limit();

-- ============================================================
-- FUNCTION: Update status unit otomatis saat booking
-- ============================================================

CREATE OR REPLACE FUNCTION update_unit_status_on_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE property_units SET status = 'booking' WHERE id = NEW.unit_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE property_units SET status = 'available' WHERE id = OLD.unit_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_unit_status_on_booking
  AFTER INSERT OR DELETE ON unit_bookings
  FOR EACH ROW EXECUTE FUNCTION update_unit_status_on_booking();

-- ============================================================
-- FUNCTION: Notifikasi stok minimum inventory
-- ============================================================

CREATE OR REPLACE FUNCTION notify_low_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.quantity_on_hand <= NEW.minimum_stock AND
     (OLD.quantity_on_hand IS NULL OR OLD.quantity_on_hand > OLD.minimum_stock) THEN
    PERFORM pg_notify(
      'low_stock',
      json_build_object(
        'inventory_id', NEW.id,
        'project_id', NEW.project_id,
        'tenant_id', NEW.tenant_id,
        'material_id', NEW.material_id,
        'quantity_on_hand', NEW.quantity_on_hand,
        'minimum_stock', NEW.minimum_stock
      )::TEXT
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_low_stock
  AFTER UPDATE OF quantity_on_hand ON inventory
  FOR EACH ROW EXECUTE FUNCTION notify_low_stock();
