-- ============================================================
-- KOKOH - Perumahan, Blok Master Data & Project Documents
-- Migration: 008_perumahan_blok_docs.sql
-- ============================================================

-- ─── Master: Perumahan ─────────────────────────────────────

CREATE TABLE perumahan (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, name)
);

-- ─── Master: Blok ──────────────────────────────────────────

CREATE TABLE blok (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  perumahan_id  UUID NOT NULL REFERENCES perumahan(id) ON DELETE CASCADE,
  nomor         TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(perumahan_id, nomor)
);

-- ─── Extend Projects ───────────────────────────────────────

ALTER TABLE projects
  ADD COLUMN perumahan_id UUID REFERENCES perumahan(id) ON DELETE SET NULL,
  ADD COLUMN blok_id      UUID REFERENCES blok(id) ON DELETE SET NULL;

-- ─── Project Files (DED & Design Rumah) ────────────────────

CREATE TABLE project_files (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type          TEXT NOT NULL CHECK (type IN ('ded', 'design_rumah')),
  file_name     TEXT NOT NULL,
  storage_path  TEXT NOT NULL,
  file_size     INTEGER,
  uploaded_by   UUID NOT NULL REFERENCES profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Indexes ───────────────────────────────────────────────

CREATE INDEX idx_perumahan_tenant ON perumahan(tenant_id);
CREATE INDEX idx_blok_perumahan ON blok(perumahan_id);
CREATE INDEX idx_blok_tenant ON blok(tenant_id);
CREATE INDEX idx_project_files_project ON project_files(project_id);

-- ─── RLS ───────────────────────────────────────────────────

ALTER TABLE perumahan ENABLE ROW LEVEL SECURITY;
ALTER TABLE blok ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_tenant_perumahan" ON perumahan
  FOR SELECT USING (is_superadmin() OR tenant_id = get_tenant_id());

CREATE POLICY "pm_manage_perumahan" ON perumahan
  FOR ALL USING (
    is_superadmin() OR (
      tenant_id = get_tenant_id() AND has_role('project_manager')
    )
  );

CREATE POLICY "read_tenant_blok" ON blok
  FOR SELECT USING (is_superadmin() OR tenant_id = get_tenant_id());

CREATE POLICY "pm_manage_blok" ON blok
  FOR ALL USING (
    is_superadmin() OR (
      tenant_id = get_tenant_id() AND has_role('project_manager')
    )
  );

CREATE POLICY "read_tenant_project_files" ON project_files
  FOR SELECT USING (is_superadmin() OR tenant_id = get_tenant_id());

CREATE POLICY "pm_manage_project_files" ON project_files
  FOR ALL USING (
    is_superadmin() OR (
      tenant_id = get_tenant_id() AND has_role('project_manager')
    )
  );

-- ─── Storage: project-docs bucket ─────────────────────────
-- Path structure: {tenant_id}/{project_id}/{type}/{filename}

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-docs',
  'project-docs',
  FALSE,
  20971520, -- 20MB
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ]
) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "read_tenant_project_docs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'project-docs' AND
    auth.uid() IS NOT NULL AND
    (storage.foldername(name))[1] = get_tenant_id()::TEXT
  );

CREATE POLICY "authenticated_upload_project_docs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'project-docs' AND
    auth.uid() IS NOT NULL AND
    (storage.foldername(name))[1] = get_tenant_id()::TEXT
  );

CREATE POLICY "authenticated_delete_project_docs"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'project-docs' AND
    auth.uid() IS NOT NULL AND
    (storage.foldername(name))[1] = get_tenant_id()::TEXT
  );
