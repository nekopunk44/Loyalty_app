-- ==================== Bookings DATEONLY Migration ====================
-- Конвертация bookings.check_in_date / check_out_date из STRING (DD.MM.YYYY)
-- в DATE (YYYY-MM-DD) для корректной сортировки и диапазонных запросов.
--
-- !!! ПЕРЕД НАКАТОМ:
--   1) pg_dump -Fc loyalty_app > backup_pre_dateonly.dump
--   2) Прогнать на staging-копии прода
--   3) Проверить что все existing записи имеют валидный DD.MM.YYYY:
--        SELECT id, check_in_date, check_out_date FROM bookings
--        WHERE check_in_date  !~ '^\d{2}\.\d{2}\.\d{4}$'
--           OR check_out_date !~ '^\d{2}\.\d{2}\.\d{4}$';
--   4) Деплоить новый код сервера ТОЛЬКО ПОСЛЕ накатывания этой миграции —
--      в коде модели тип меняется на DATEONLY, а конверсия в DD.MM.YYYY
--      делается на границе API (см. server/utils/dates.js — будет добавлен).
--
-- Created: 2026-05-08

BEGIN;

-- 1. Временные DATE-колонки
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS check_in_date_new  DATE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS check_out_date_new DATE;

-- 2. Конверсия данных DD.MM.YYYY -> DATE.
--    Только валидные строки. Невалидные оставляем NULL и проверим ниже.
UPDATE bookings
SET check_in_date_new = TO_DATE(check_in_date, 'DD.MM.YYYY')
WHERE check_in_date ~ '^\d{2}\.\d{2}\.\d{4}$'
  AND check_in_date_new IS NULL;

UPDATE bookings
SET check_out_date_new = TO_DATE(check_out_date, 'DD.MM.YYYY')
WHERE check_out_date ~ '^\d{2}\.\d{2}\.\d{4}$'
  AND check_out_date_new IS NULL;

-- 3. Защита от потери данных: если какая-то строка не сконвертировалась —
--    откатываем транзакцию. Дальше нужно вручную найти проблемные записи и
--    починить (или решить, что с ними делать), а потом перезапустить миграцию.
DO $$
DECLARE
  bad_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO bad_count
  FROM bookings
  WHERE check_in_date_new IS NULL OR check_out_date_new IS NULL;

  IF bad_count > 0 THEN
    RAISE EXCEPTION 'DATEONLY migration aborted: % rows have invalid date format. '
                    'Inspect with: SELECT id, check_in_date, check_out_date FROM bookings '
                    'WHERE check_in_date !~ ''^\d{2}\.\d{2}\.\d{4}$'' OR check_out_date !~ ''^\d{2}\.\d{2}\.\d{4}$'';',
                    bad_count;
  END IF;
END $$;

-- 4. Сносим старые колонки и переименовываем новые
ALTER TABLE bookings DROP COLUMN check_in_date;
ALTER TABLE bookings DROP COLUMN check_out_date;
ALTER TABLE bookings RENAME COLUMN check_in_date_new  TO check_in_date;
ALTER TABLE bookings RENAME COLUMN check_out_date_new TO check_out_date;

-- 5. NOT NULL + индексы под диапазонные запросы и сортировку
ALTER TABLE bookings ALTER COLUMN check_in_date  SET NOT NULL;
ALTER TABLE bookings ALTER COLUMN check_out_date SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_check_in_date  ON bookings(check_in_date);
CREATE INDEX IF NOT EXISTS idx_bookings_check_out_date ON bookings(check_out_date);
-- Композитный для типового запроса "брони в диапазоне для свойства"
CREATE INDEX IF NOT EXISTS idx_bookings_property_dates
  ON bookings(property_id, check_in_date, check_out_date);

COMMIT;

-- ==================== Откат (выполнять вручную) ====================
-- BEGIN;
-- ALTER TABLE bookings ALTER COLUMN check_in_date  TYPE VARCHAR(10)
--   USING TO_CHAR(check_in_date,  'DD.MM.YYYY');
-- ALTER TABLE bookings ALTER COLUMN check_out_date TYPE VARCHAR(10)
--   USING TO_CHAR(check_out_date, 'DD.MM.YYYY');
-- DROP INDEX IF EXISTS idx_bookings_check_in_date;
-- DROP INDEX IF EXISTS idx_bookings_check_out_date;
-- DROP INDEX IF EXISTS idx_bookings_property_dates;
-- COMMIT;
