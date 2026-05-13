-- ============================================================
-- KOKOH - Seed Data: Master Data Material
-- ============================================================

-- Superadmin tenant (sistem)
INSERT INTO tenants (id, name, slug, plan, max_projects, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Kokoh System',
  'kokoh-system',
  'pro',
  NULL,
  TRUE
)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- Contoh material master (material umum konstruksi Indonesia)
-- Ini akan menjadi referensi per tenant yang bisa diedit
-- ============================================================

-- Tenant harus punya materialsnya sendiri (per tenant_id)
-- Seed ini hanya sebagai panduan / template awal
