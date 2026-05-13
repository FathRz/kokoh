-- ============================================================
-- KOKOH - Supabase Storage Buckets & Policies
-- Migration: 004_storage.sql
-- ============================================================

-- Bucket untuk foto progress lapangan
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'progress-photos',
  'progress-photos',
  FALSE,
  5242880, -- 5MB max per foto (setelah kompresi)
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Bucket untuk dokumen PO dan MR
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  FALSE,
  10485760, -- 10MB max
  ARRAY['application/pdf', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

-- Bucket untuk avatar profil
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  TRUE,
  1048576, -- 1MB max
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- STORAGE POLICIES: progress-photos
-- Struktur path: {tenant_id}/{project_id}/{daily_log_id}/{filename}
-- ============================================================

CREATE POLICY "authenticated_read_own_tenant_photos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'progress-photos' AND
    auth.uid() IS NOT NULL AND
    (storage.foldername(name))[1] = get_tenant_id()::TEXT
  );

CREATE POLICY "site_manager_upload_photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'progress-photos' AND
    auth.uid() IS NOT NULL AND
    (storage.foldername(name))[1] = get_tenant_id()::TEXT
  );

CREATE POLICY "site_manager_delete_own_photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'progress-photos' AND
    auth.uid() IS NOT NULL AND
    (storage.foldername(name))[1] = get_tenant_id()::TEXT AND
    has_role('site_manager')
  );

-- ============================================================
-- STORAGE POLICIES: documents
-- ============================================================

CREATE POLICY "authenticated_read_own_tenant_docs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documents' AND
    auth.uid() IS NOT NULL AND
    (storage.foldername(name))[1] = get_tenant_id()::TEXT
  );

CREATE POLICY "finance_upload_documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documents' AND
    auth.uid() IS NOT NULL AND
    (storage.foldername(name))[1] = get_tenant_id()::TEXT AND
    has_role('finance')
  );

-- ============================================================
-- STORAGE POLICIES: avatars (public bucket)
-- ============================================================

CREATE POLICY "anyone_read_avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "authenticated_upload_own_avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid() IS NOT NULL AND
    name = auth.uid()::TEXT || '/' || (storage.filename(name))
  );

CREATE POLICY "authenticated_update_own_avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars' AND
    auth.uid() IS NOT NULL AND
    name = auth.uid()::TEXT || '/' || (storage.filename(name))
  );
