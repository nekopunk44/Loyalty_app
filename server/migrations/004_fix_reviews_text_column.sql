-- ==================== Fix Reviews Text Column ====================
-- Migration to fix the reviews table to match the Review model
-- Issue: Model expects 'text' column with NOT NULL, but needs safe migration
-- Created: 2026-01-07

-- Step 1: Add text column WITHOUT NOT NULL constraint if it doesn't exist
ALTER TABLE reviews
ADD COLUMN IF NOT EXISTS text TEXT DEFAULT '';

-- Step 2: Copy comment data to text column if text is still NULL
UPDATE reviews SET text = COALESCE(comment, '') WHERE text IS NULL OR text = '';

-- Step 3: Make text column NOT NULL (all rows now have values)
ALTER TABLE reviews
ALTER COLUMN text SET NOT NULL;

-- Step 4: Keep comment column for backward compatibility but remove NOT NULL from it
ALTER TABLE reviews
ALTER COLUMN comment DROP NOT NULL;

-- Verify the fix
SELECT column_name, is_nullable, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'reviews' 
ORDER BY ordinal_position;
