CREATE TABLE IF NOT EXISTS "profile" (
  "id" serial PRIMARY KEY NOT NULL,
  "buildings" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "research" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "chief_gear" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "chief_charms" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "hero_gear" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "heroes" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "pets" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "experts" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
