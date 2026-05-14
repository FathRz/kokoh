-- ============================================================
-- KOKOH - Invite Member Support
-- Migration: 007_invite_member_support.sql
-- Update handle_new_user to create profile for invited members
-- ============================================================

DROP TRIGGER IF EXISTS trg_on_new_user ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id    UUID;
  v_company_name TEXT;
  v_full_name    TEXT;
  v_role         user_role;
  v_slug         TEXT;
  v_base_slug    TEXT;
  v_counter      INTEGER := 0;
BEGIN
  v_company_name := TRIM(COALESCE(NEW.raw_user_meta_data->>'company_name', ''));
  v_full_name    := TRIM(COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)));

  -- Kasus 1: Self-registration (ada company_name) → buat tenant baru sebagai owner
  IF v_company_name != '' THEN
    v_base_slug := LOWER(REGEXP_REPLACE(v_company_name, '[^a-zA-Z0-9]+', '-', 'g'));
    v_base_slug := TRIM(BOTH '-' FROM v_base_slug);
    IF v_base_slug = '' THEN v_base_slug := 'tenant'; END IF;

    v_slug := v_base_slug;
    WHILE EXISTS (SELECT 1 FROM tenants WHERE slug = v_slug) LOOP
      v_counter := v_counter + 1;
      v_slug := v_base_slug || '-' || v_counter;
    END LOOP;

    INSERT INTO tenants (name, slug, plan, max_projects, is_active)
    VALUES (v_company_name, v_slug, 'lite', 2, TRUE)
    RETURNING id INTO v_tenant_id;

    INSERT INTO profiles (id, tenant_id, full_name, role, is_active)
    VALUES (NEW.id, v_tenant_id, v_full_name, 'tenant_owner', TRUE);

  -- Kasus 2: Invited member (ada tenant_id di metadata) → bergabung ke tenant existing
  ELSIF NEW.raw_user_meta_data->>'tenant_id' IS NOT NULL THEN
    v_tenant_id := (NEW.raw_user_meta_data->>'tenant_id')::UUID;

    BEGIN
      v_role := (NEW.raw_user_meta_data->>'role')::user_role;
    EXCEPTION WHEN OTHERS THEN
      v_role := 'site_manager';
    END;

    -- Pastikan tenant ada dan aktif
    IF EXISTS (SELECT 1 FROM tenants WHERE id = v_tenant_id AND is_active = TRUE) THEN
      INSERT INTO profiles (id, tenant_id, full_name, role, is_active)
      VALUES (NEW.id, v_tenant_id, v_full_name, v_role, TRUE)
      ON CONFLICT (id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user error for %: % %', NEW.id, SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_on_new_user
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
