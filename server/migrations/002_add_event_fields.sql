-- ==================== Migration 002: Add Event Fields ====================
-- Add missing fields to events table for prize, allowedUsers, and eventType
-- Date: 2025-12-24

-- Check if columns exist and add them if they don't
DO $$ 
BEGIN 
  -- Add prize column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'prize'
  ) THEN
    ALTER TABLE events ADD COLUMN prize VARCHAR(255);
  END IF;

  -- Add allowed_users column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'allowed_users'
  ) THEN
    ALTER TABLE events ADD COLUMN allowed_users VARCHAR(50) DEFAULT 'all';
  END IF;

  -- Add event_type column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'event_type'
  ) THEN
    ALTER TABLE events ADD COLUMN event_type VARCHAR(50) DEFAULT 'auction';
  END IF;
END $$;

-- Verify the migration
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'events' 
ORDER BY ordinal_position;
