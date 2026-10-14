-- Additive only. Apply explicitly to a new/restored destination after backup.
-- Existing dashboard rows and source files are not changed or removed.
CREATE TABLE IF NOT EXISTS public.file_objects (
  object_path text PRIMARY KEY,
  content_type text NOT NULL,
  contents bytea NOT NULL,
  sha256 text NOT NULL
);
