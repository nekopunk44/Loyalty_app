-- ==================== Property photos & widened columns ====================
-- Админ-CRUD номеров: полноценная галерея + поля приходят с фронта в свободном
-- виде, поэтому переводим image/price на TEXT (URL-ы и форматированные строки).
-- photos — массив относительных путей к файлам в /uploads/properties/<id>/.
-- Created: 2026-06-04

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]'::jsonb NOT NULL;

ALTER TABLE properties
  ALTER COLUMN image TYPE TEXT,
  ALTER COLUMN price TYPE TEXT;
