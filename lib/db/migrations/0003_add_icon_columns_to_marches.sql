-- Migration: add icon0, icon1, icon2 columns to marches table
-- Applied via: drizzle-kit push (schema change recorded here for reference)
ALTER TABLE "marches" ADD COLUMN IF NOT EXISTS "icon0" text;
ALTER TABLE "marches" ADD COLUMN IF NOT EXISTS "icon1" text;
ALTER TABLE "marches" ADD COLUMN IF NOT EXISTS "icon2" text;
