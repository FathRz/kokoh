-- ============================================================
-- KOKOH - Fix Storage: progress-photos bucket & policies
-- Migration: 012_fix_storage_photos.sql
-- ============================================================
-- Root causes fixed:
-- 1. Bucket was private (public = FALSE) but code uses getPublicUrl()
--    which generates /object/public/ URLs — these return 400 on private buckets.
--    Fix: set public = TRUE so getPublicUrl() works correctly.
-- 2. No UPDATE policy — offline sync uses upsert: true which needs UPDATE.
--    Fix: add progress_photos_update policy.
-- 3. Old DELETE policy restricted to has_role('site_manager').
--    Fix: allow any authenticated tenant member to delete.
-- ============================================================

-- Make bucket public so getPublicUrl() generates accessible URLs
UPDATE storage.buckets
SET public = TRUE
WHERE id = 'progress-photos';

-- Drop old policies
DROP POLICY IF EXISTS "authenticated_read_own_tenant_photos" ON storage.objects;
DROP POLICY IF EXISTS "site_manager_upload_photos" ON storage.objects;
DROP POLICY IF EXISTS "site_manager_delete_own_photos" ON storage.objects;

-- SELECT: any authenticated tenant member can read their tenant's photos
CREATE POLICY "progress_photos_select"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'progress-photos'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = get_tenant_id()::TEXT
  );

-- INSERT: any authenticated tenant member can upload
CREATE POLICY "progress_photos_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'progress-photos'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = get_tenant_id()::TEXT
  );

-- UPDATE: needed for upsert: true used in offline sync re-upload
CREATE POLICY "progress_photos_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'progress-photos'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = get_tenant_id()::TEXT
  )
  WITH CHECK (
    bucket_id = 'progress-photos'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = get_tenant_id()::TEXT
  );

-- DELETE: any authenticated tenant member can delete
CREATE POLICY "progress_photos_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'progress-photos'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = get_tenant_id()::TEXT
  );
