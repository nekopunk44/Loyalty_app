-- ==================== Add Additional Services to Bookings ====================
-- Migration to add sauna and kitchenware columns to bookings table
-- Created: 2025-12-26

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS sauna_hours INTEGER DEFAULT 0 COMMENT 'Количество часов аренды парилки',
ADD COLUMN IF NOT EXISTS kitchenware BOOLEAN DEFAULT false COMMENT 'Использование кухонного сервиза';

-- Update existing records to have default values
UPDATE bookings SET sauna_hours = 0 WHERE sauna_hours IS NULL;
UPDATE bookings SET kitchenware = false WHERE kitchenware IS NULL;

-- Add indexes for new columns if needed
CREATE INDEX IF NOT EXISTS idx_bookings_sauna_hours ON bookings(sauna_hours);
CREATE INDEX IF NOT EXISTS idx_bookings_kitchenware ON bookings(kitchenware);

COMMIT;
