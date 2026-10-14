CREATE TABLE IF NOT EXISTS "notes_images" (
  "id" serial PRIMARY KEY NOT NULL,
  "object_path" text NOT NULL,
  "file_name" text NOT NULL,
  "content_type" text NOT NULL,
  "size" integer NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
