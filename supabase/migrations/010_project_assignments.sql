-- Add PM and Site Manager assignment to projects
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS pm_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS site_manager_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
