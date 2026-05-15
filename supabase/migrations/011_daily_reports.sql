-- ============================================================
-- KOKOH - Daily Reports Module
-- Migration: 011_daily_reports.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS daily_reports (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  wbs_item_id     UUID REFERENCES wbs_items(id) ON DELETE SET NULL,
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_by      UUID NOT NULL REFERENCES profiles(id),
  report_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  actual_progress NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (actual_progress >= 0 AND actual_progress <= 100),
  labor_count     INTEGER NOT NULL DEFAULT 0 CHECK (labor_count >= 0),
  weather         weather_condition NOT NULL DEFAULT 'cerah',
  notes           TEXT,
  -- NULL = pending, TRUE = approved, FALSE = rejected
  is_approved     BOOLEAN,
  approved_by     UUID REFERENCES profiles(id),
  approved_at     TIMESTAMPTZ,
  rejection_note  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS daily_report_photos (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id     UUID NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  storage_path  TEXT NOT NULL,
  caption       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_reports_tenant   ON daily_reports(tenant_id);
CREATE INDEX IF NOT EXISTS idx_daily_reports_project  ON daily_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_daily_reports_date     ON daily_reports(report_date);
CREATE INDEX IF NOT EXISTS idx_daily_reports_wbs      ON daily_reports(wbs_item_id);
CREATE INDEX IF NOT EXISTS idx_daily_reports_creator  ON daily_reports(created_by);
CREATE INDEX IF NOT EXISTS idx_report_photos_report   ON daily_report_photos(report_id);

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_report_photos ENABLE ROW LEVEL SECURITY;

-- All tenant members can read
CREATE POLICY "tenant read daily_reports"
  ON daily_reports FOR SELECT
  USING (tenant_id = get_tenant_id());

-- Any tenant member can insert their own reports
CREATE POLICY "tenant insert daily_reports"
  ON daily_reports FOR INSERT
  WITH CHECK (
    tenant_id = get_tenant_id()
    AND created_by = auth.uid()
  );

-- Creator can update own pending (not yet approved/rejected) reports
CREATE POLICY "creator update pending reports"
  ON daily_reports FOR UPDATE
  USING (
    created_by = auth.uid()
    AND is_approved IS NULL
  );

-- PM and owner can approve/reject any report in tenant
CREATE POLICY "pm approve reports"
  ON daily_reports FOR UPDATE
  USING (
    tenant_id = get_tenant_id()
    AND has_role('project_manager')
  );

-- Photos: read
CREATE POLICY "tenant read report photos"
  ON daily_report_photos FOR SELECT
  USING (tenant_id = get_tenant_id());

-- Photos: insert
CREATE POLICY "tenant insert report photos"
  ON daily_report_photos FOR INSERT
  WITH CHECK (tenant_id = get_tenant_id());

-- Photos: delete
CREATE POLICY "tenant delete report photos"
  ON daily_report_photos FOR DELETE
  USING (tenant_id = get_tenant_id());
