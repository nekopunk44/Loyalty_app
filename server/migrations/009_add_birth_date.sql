-- Migration 009: Add birthDate column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS "birthDate" DATE DEFAULT NULL;
