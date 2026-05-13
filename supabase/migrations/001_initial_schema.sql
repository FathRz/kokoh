-- ============================================================
-- KOKOH - Initial Database Schema
-- Migration: 001_initial_schema.sql
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgsodium";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM (
  'superadmin',
  'tenant_owner',
  'project_manager',
  'site_manager',
  'logistik',
  'finance',
  'sales_admin'
);

CREATE TYPE project_status AS ENUM (
  'planning',
  'active',
  'on_hold',
  'completed',
  'cancelled'
);

CREATE TYPE material_request_status AS ENUM (
  'pending',
  'approved',
  'rejected',
  'fulfilled'
);

CREATE TYPE purchase_order_status AS ENUM (
  'draft',
  'sent',
  'confirmed',
  'received',
  'cancelled'
);

CREATE TYPE unit_status AS ENUM (
  'available',
  'booking',
  'sold'
);

CREATE TYPE weather_condition AS ENUM (
  'cerah',
  'berawan',
  'hujan_ringan',
  'hujan_lebat'
);

CREATE TYPE subscription_plan AS ENUM (
  'lite',
  'pro'
);

-- ============================================================
-- TABLE: tenants
-- ============================================================

CREATE TABLE tenants (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  plan          subscription_plan NOT NULL DEFAULT 'lite',
  max_projects  INTEGER, -- NULL = unlimited (pro)
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: profiles
-- ============================================================

CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL,
  role        user_role NOT NULL DEFAULT 'site_manager',
  phone       TEXT,
  avatar_url  TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: projects
-- ============================================================

CREATE TABLE projects (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  code          TEXT NOT NULL,
  location      TEXT,
  status        project_status NOT NULL DEFAULT 'planning',
  start_date    DATE,
  end_date      DATE,
  budget_total  NUMERIC(18,2) NOT NULL DEFAULT 0,
  description   TEXT,
  created_by    UUID NOT NULL REFERENCES profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, code)
);

-- ============================================================
-- TABLE: wbs_items (Work Breakdown Structure)
-- ============================================================

CREATE TABLE wbs_items (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id        UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  code              TEXT NOT NULL,
  parent_id         UUID REFERENCES wbs_items(id) ON DELETE SET NULL,
  budget_amount     NUMERIC(18,2) NOT NULL DEFAULT 0,
  cost_weight       NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (cost_weight >= 0 AND cost_weight <= 100),
  planned_progress  NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (planned_progress >= 0 AND planned_progress <= 100),
  actual_progress   NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (actual_progress >= 0 AND actual_progress <= 100),
  order_index       INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, code)
);

-- ============================================================
-- TABLE: daily_logs
-- ============================================================

CREATE TABLE daily_logs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  log_date      DATE NOT NULL,
  weather       weather_condition NOT NULL,
  worker_count  INTEGER NOT NULL DEFAULT 0 CHECK (worker_count >= 0),
  notes         TEXT,
  obstacles     TEXT,
  created_by    UUID NOT NULL REFERENCES profiles(id),
  synced_at     TIMESTAMPTZ, -- NULL = belum disync dari offline
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, log_date)
);

-- ============================================================
-- TABLE: progress_photos
-- ============================================================

CREATE TABLE progress_photos (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  daily_log_id  UUID NOT NULL REFERENCES daily_logs(id) ON DELETE CASCADE,
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  storage_path  TEXT NOT NULL,
  caption       TEXT,
  latitude      DOUBLE PRECISION,
  longitude     DOUBLE PRECISION,
  taken_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: materials (Master Data)
-- ============================================================

CREATE TABLE materials (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  unit            TEXT NOT NULL, -- satuan: kg, m3, buah, dll
  category        TEXT,
  price_per_unit  NUMERIC(18,2) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, name, unit)
);

-- ============================================================
-- TABLE: inventory (Stok per proyek)
-- ============================================================

CREATE TABLE inventory (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id        UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  material_id       UUID NOT NULL REFERENCES materials(id) ON DELETE RESTRICT,
  quantity_on_hand  NUMERIC(12,3) NOT NULL DEFAULT 0,
  minimum_stock     NUMERIC(12,3) NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, material_id)
);

-- ============================================================
-- TABLE: material_requests (MR)
-- ============================================================

CREATE TABLE material_requests (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  wbs_item_id   UUID REFERENCES wbs_items(id) ON DELETE SET NULL,
  requested_by  UUID NOT NULL REFERENCES profiles(id),
  status        material_request_status NOT NULL DEFAULT 'pending',
  notes         TEXT,
  approved_by   UUID REFERENCES profiles(id),
  approved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: material_request_items
-- ============================================================

CREATE TABLE material_request_items (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  material_request_id UUID NOT NULL REFERENCES material_requests(id) ON DELETE CASCADE,
  material_id         UUID NOT NULL REFERENCES materials(id) ON DELETE RESTRICT,
  quantity_requested  NUMERIC(12,3) NOT NULL CHECK (quantity_requested > 0),
  quantity_approved   NUMERIC(12,3),
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: purchase_orders (PO)
-- ============================================================

CREATE TABLE purchase_orders (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id          UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  material_request_id UUID REFERENCES material_requests(id) ON DELETE SET NULL,
  po_number           TEXT NOT NULL,
  supplier_name       TEXT NOT NULL,
  supplier_contact    TEXT,
  status              purchase_order_status NOT NULL DEFAULT 'draft',
  total_amount        NUMERIC(18,2) NOT NULL DEFAULT 0,
  created_by          UUID NOT NULL REFERENCES profiles(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, po_number)
);

-- ============================================================
-- TABLE: purchase_order_items
-- ============================================================

CREATE TABLE purchase_order_items (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  material_id      UUID NOT NULL REFERENCES materials(id) ON DELETE RESTRICT,
  quantity         NUMERIC(12,3) NOT NULL CHECK (quantity > 0),
  unit_price       NUMERIC(18,2) NOT NULL DEFAULT 0,
  subtotal         NUMERIC(18,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: property_units (CRM)
-- ============================================================

CREATE TABLE property_units (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  unit_code       TEXT NOT NULL,
  type            TEXT NOT NULL, -- tipe: 36/72, 45/90, dll
  land_area       NUMERIC(8,2),
  building_area   NUMERIC(8,2),
  price           NUMERIC(18,2) NOT NULL DEFAULT 0,
  status          unit_status NOT NULL DEFAULT 'available',
  grid_position   TEXT, -- posisi di siteplan, misal "A1", "B3"
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, unit_code)
);

-- ============================================================
-- TABLE: consumers (CRM - Data Konsumen dengan Enkripsi)
-- ============================================================

CREATE TABLE consumers (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  full_name      TEXT NOT NULL,
  -- kolom sensitif dienkripsi dengan pgsodium
  nik_encrypted       BYTEA, -- enkripsi NIK
  phone_encrypted     BYTEA, -- enkripsi nomor HP
  email          TEXT,
  address        TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: unit_bookings
-- ============================================================

CREATE TABLE unit_bookings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id         UUID NOT NULL REFERENCES property_units(id) ON DELETE RESTRICT,
  consumer_id     UUID NOT NULL REFERENCES consumers(id) ON DELETE RESTRICT,
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  booking_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  booking_amount  NUMERIC(18,2) NOT NULL DEFAULT 0,
  notes           TEXT,
  created_by      UUID NOT NULL REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: audit_logs
-- ============================================================

CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL,
  action      TEXT NOT NULL, -- INSERT, UPDATE, DELETE
  table_name  TEXT NOT NULL,
  record_id   TEXT NOT NULL,
  old_data    JSONB,
  new_data    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_profiles_tenant ON profiles(tenant_id);
CREATE INDEX idx_projects_tenant ON projects(tenant_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_wbs_items_project ON wbs_items(project_id);
CREATE INDEX idx_wbs_items_parent ON wbs_items(parent_id);
CREATE INDEX idx_daily_logs_project ON daily_logs(project_id);
CREATE INDEX idx_daily_logs_date ON daily_logs(log_date);
CREATE INDEX idx_daily_logs_synced ON daily_logs(synced_at) WHERE synced_at IS NULL;
CREATE INDEX idx_progress_photos_daily_log ON progress_photos(daily_log_id);
CREATE INDEX idx_inventory_project ON inventory(project_id);
CREATE INDEX idx_inventory_material ON inventory(material_id);
CREATE INDEX idx_material_requests_project ON material_requests(project_id);
CREATE INDEX idx_material_requests_status ON material_requests(status);
CREATE INDEX idx_purchase_orders_project ON purchase_orders(project_id);
CREATE INDEX idx_property_units_project ON property_units(project_id);
CREATE INDEX idx_property_units_status ON property_units(status);
CREATE INDEX idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_table ON audit_logs(table_name, record_id);
