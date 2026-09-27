-- 029: per-photo label + free-text comment on customer request photos
ALTER TABLE job_images ADD COLUMN IF NOT EXISTS label VARCHAR(60), ADD COLUMN IF NOT EXISTS note TEXT;
