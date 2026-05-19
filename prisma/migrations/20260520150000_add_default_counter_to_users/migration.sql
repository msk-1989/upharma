-- Migration: Add defaultCounterId to User table
-- Date: 2026-05-20
-- 
-- RUN THIS ON NEON CONSOLE (SQL Editor)
-- This adds counter assignment support to users.

-- Step 1: Add defaultCounterId column to User table
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "defaultCounterId" TEXT;

-- Step 2: Add foreign key constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'User_defaultCounterId_fkey'
    ) THEN
        ALTER TABLE "User" ADD CONSTRAINT "User_defaultCounterId_fkey" 
        FOREIGN KEY ("defaultCounterId") REFERENCES "Counter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Step 3: Create index for faster lookups
CREATE INDEX IF NOT EXISTS "User_defaultCounterId_idx" ON "User"("defaultCounterId");

-- Migration complete!
-- Users can now be assigned a default counter in Settings > Users tab.
