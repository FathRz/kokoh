-- ============================================================
-- KOKOH - Fix trigger handle_new_user
-- Migration: 006_fix_handle_new_user.sql
-- ============================================================

-- Drop trigger & function lama
DROP TRIGGER IF EXISTS trg_on_new_user ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Buat ulang dengan exception handling yang proper
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id   UUID;
  v_company_name TEXT;
  v_full_name    TEXT;
  v_slug         TEXT;
  v_base_slug    TEXT;
  v_counter      INTEGER := 0;
BEGIN
  -- Ambil data dari metadata pendaftaran
  v_company_name := TRIM(COALESCE(NEW.raw_user_meta_data->>'company_name', ''));
  v_full_name    := TRIM(COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)));

  -- Hanya buat tenant jika company_name diisi (self-registration)
  IF v_company_name != '' THEN
    -- Generate slug yang unik
    v_base_slug := LOWER(REGEXP_REPLACE(v_company_name, '[^a-zA-Z0-9]+', '-', 'g'));
    v_base_slug := TRIM(BOTH '-' FROM v_base_slug);
    IF v_base_slug = '' THEN
      v_base_slug := 'tenant';
    END IF;

    v_slug := v_base_slug;
    -- Loop untuk pastikan slug unik
    WHILE EXISTS (SELECT 1 FROM tenants WHERE slug = v_slug) LOOP
      v_counter := v_counter + 1;
      v_slug := v_base_slug || '-' || v_counter;
    END LOOP;

    -- Buat tenant baru (paket lite, maks 2 proyek)
    INSERT INTO tenants (name, slug, plan, max_projects, is_active)
    VALUES (v_company_name, v_slug, 'lite', 2, TRUE)
    RETURNING id INTO v_tenant_id;

    -- Buat profil sebagai tenant_owner
    INSERT INTO profiles (id, tenant_id, full_name, role, is_active)
    VALUES (NEW.id, v_tenant_id, v_full_name, 'tenant_owner', TRUE);
  END IF;

  RETURN NEW;

EXCEPTION
  WHEN OTHERS THEN
    -- Log error tapi jangan gagalkan proses registrasi user
    RAISE WARNING 'handle_new_user error for %: % %', NEW.id, SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$;

-- Pasang kembali trigger
CREATE TRIGGER trg_on_new_user
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
