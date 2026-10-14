-- Migration: add image_url column to items table
-- Applied via: drizzle-kit push (schema change recorded here for reference)
ALTER TABLE "items" ADD COLUMN IF NOT EXISTS "image_url" text;
