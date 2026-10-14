ALTER TABLE "troops" ADD COLUMN IF NOT EXISTS "deployment_bonus" integer NOT NULL DEFAULT 0;
ALTER TABLE "troops" ADD COLUMN IF NOT EXISTS "rally_bonus" integer NOT NULL DEFAULT 0;
