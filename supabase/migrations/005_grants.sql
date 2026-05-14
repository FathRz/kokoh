-- ============================================================
-- KOKOH - Grant Permissions
-- Migration: 005_grants.sql
-- Jalankan ini jika tabel tidak bisa diakses oleh service_role
-- ============================================================

-- Izinkan akses ke schema public
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Grant semua tabel ke role Supabase
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;

-- Grant semua sequence (untuk UUID dan auto-increment)
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- Grant semua functions
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- Pastikan grant ini berlaku untuk tabel yang dibuat di masa depan
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;
