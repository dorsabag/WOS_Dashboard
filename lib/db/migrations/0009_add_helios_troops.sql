ALTER TABLE "troops" ADD COLUMN IF NOT EXISTS "helios_infantry" integer NOT NULL DEFAULT 0;
ALTER TABLE "troops" ADD COLUMN IF NOT EXISTS "helios_lancer" integer NOT NULL DEFAULT 0;
ALTER TABLE "troops" ADD COLUMN IF NOT EXISTS "helios_marksman" integer NOT NULL DEFAULT 0;
