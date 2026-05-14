-- Add start_date and end_date to wbs_items
ALTER TABLE wbs_items
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE;
