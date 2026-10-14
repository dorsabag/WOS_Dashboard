-- Migration: add goal_completions table for completion audit log
-- Applied via: drizzle-kit push (schema change recorded here for reference)
CREATE TABLE IF NOT EXISTS "goal_completions" (
  "id" serial PRIMARY KEY NOT NULL,
  "goal_id" integer NOT NULL REFERENCES "goals"("id") ON DELETE cascade,
  "action" text NOT NULL DEFAULT 'complete',
  "completed_at" timestamp NOT NULL DEFAULT now(),
  "items_consumed" json NOT NULL
);
