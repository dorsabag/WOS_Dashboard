-- Migration: add multiplier column to goals table
-- Applied via: drizzle-kit push (schema change recorded here for reference)
ALTER TABLE "goals" ADD COLUMN IF NOT EXISTS "multiplier" integer NOT NULL DEFAULT 1;
