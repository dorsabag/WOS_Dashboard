# Independent WOS Dashboard migration

The application now uses your own Clerk instance, PostgreSQL, a private persistent file volume, and an optional direct Todoist token. Docker Compose is the portable deployment target; no hosting provider has been selected. Cloud environment publication is separate from deploying this application. Existing production data has NOT been migrated yet.

## Preserve and export the original data

Keep the current Replit app and its database/storage intact. Do not run schema push, import, completion/restoration tests, or deletion against the original dataset. To obtain a consistent final backup, stop editing the app and uploading/deleting files during the export window. The following commands only read the database and files, but the outputs contain private data: store and transfer them securely, never commit them.

In the **original Replit workspace shell**, check that `DATABASE_URL`, `PRIVATE_OBJECT_DIR`, and storage bindings still refer to the owner's existing dataset. Do not print their values. Replit development and production databases can differ: a workspace database export is not automatically a production backup. Select the actual data-bearing database in Replit's database tool and use its export/download facility if the shell cannot access that database. Confirm record counts match the live dashboard before proceeding.

If `pg_dump` is available and the shell connection is the correct source, run:

```sh
umask 077
mkdir -p private-backups
PGDATABASE="$DATABASE_URL" pg_dump --format=custom --no-owner --no-acl --file=private-backups/dashboard.dump
(cd private-backups && sha256sum dashboard.dump > dashboard.dump.sha256)
```

This is a read-only export; do not use any `pg_restore` command on Replit. Never share the database connection string in chat. If `pg_dump` is missing, use the database export UI, or report that limitation instead of installing/changing live infrastructure blindly.

For files, copy only `scripts/export-replit-files.mjs` from this change into the original project. It uses the original project's installed Google Storage SDK and Replit's existing read credentials, with only list/download/metadata operations. Run it there **before removing the old dependencies**:

```sh
node scripts/export-replit-files.mjs private-backups/files-export
```

The new directory contains original file bytes, content-type sidecars, and a checksum manifest. The tool refuses an existing destination. No original files are deleted or modified. If Replit blocks downloads or the original SDK cannot be loaded, use its App Storage download UI; preserve the complete key structure beneath `PRIVATE_OBJECT_DIR` (including `uploads/`) and content types. Public-search roots map to `objects/public/`. A bulk-download restriction is an external migration blocker, not permission to lose files.

For a read-only table-by-table content fingerprint, also copy `scripts/database-fingerprint.mjs` into the original project and run `node scripts/database-fingerprint.mjs capture private-backups/source-fingerprint.json` during the same no-edit export window. It reports row counts and SHA-256 hashes, not row contents.

Download the database dump, its checksum, source fingerprint, and the complete files-export directory through a private transfer. Keep an untouched second backup offline. You can provide the exported files to the migration workspace; do not provide live credentials. Then run the offline check:

```sh
node scripts/verify-storage-export.mjs /path/to/files-export
```

## Prepare the independent runtime

1. Copy `.env.example` to `.env` on the deployment machine and enter values securely. Use a long random hex `POSTGRES_PASSWORD`; `.env` is ignored by Git and Docker builds. Put the matching Clerk publishable key in both publishable-key variables and its secret in `CLERK_SECRET_KEY`. Set the existing verified owner's email in `OWNER_EMAIL`. Set `APP_ORIGIN` to the eventual exact HTTPS app origin.
2. Development Clerk keys support local evaluation. For a public permanent deployment, configure a production instance/domain in your own Clerk account and build the frontend with its matching publishable key. Do not reuse the inaccessible Replit identity instance. The new verified identity opens the restored global dataset; user IDs are not data ownership keys.
3. Set the existing owner's `TODOIST_API_TOKEN` if calendar integration is needed. Without it, calendar requests return a clear setup error; no Replit connector is attempted.
4. Run `docker compose build` and `docker compose up -d db`. In this managed cloud environment, Docker builds additionally use the session CA: `docker build --secret id=proxy_ca,src="$CODEX_PROXY_CERT" --build-arg VITE_CLERK_PUBLISHABLE_KEY -t wos-dashboard:local .`. Never put secret keys in build arguments.

## Restore into a NEW destination only

Compose starts PostgreSQL and file volumes without modifying their schemas or importing data. Restore the original dump into this new, empty database. Do not use a production connection URL or overwrite an existing destination. Verify the selected Compose project and database are the migration target before running:

```sh
(cd /private/path && sha256sum -c dashboard.dump.sha256)
# '--exit-on-error' preserves errors; no '--clean' or destructive reset.
docker compose exec -T db pg_restore --exit-on-error --no-owner --no-acl -U wos -d wos_dashboard < /private/path/dashboard.dump
```

For an empty demonstration database only, initialize the current schema explicitly:

```sh
docker compose run --rm app pnpm --filter @workspace/db run push
```

Do NOT schema-push a restored real dataset until its schema diff and backup have been reviewed. Preserve IDs, timestamps, singleton records, requirements, and all existing JSON values. No account-based reseeding is needed.

Compare restored table counts and hashes with the original fingerprint. Mount the backup read-only, for example:

```sh
docker compose run --rm -v /private/path:/backup:ro app node scripts/database-fingerprint.mjs check /backup/source-fingerprint.json
```

Copy the verified `files-export/objects/` tree into the new Compose `objects` volume (mounted at `/data/objects` in the app container). Preserve its relative layout and `.metadata.json` files; set ownership to the runtime `node` user (UID 1000). Never copy original files into the container image or frontend public directory. Use a stopped app during import. The following refuses a nonempty destination and never removes existing files:

```sh
docker compose run --rm --no-deps --user root --entrypoint sh \
  -v /private/path/files-export/objects:/import:ro app \
  -c 'test -z "$(ls -A /data/objects)" && cp -a /import/. /data/objects/ && chown -R 1000:1000 /data/objects'
```

Run `docker compose run --rm app node scripts/check-restored-files.mjs` to confirm every `notes_images.object_path` has a corresponding file under `/data/objects` before accepting the restore. No production data restore has been performed by this task.

For the prepared independent restore bundle, the native PostgreSQL dump is `database.dump`, uploads are under `objects/`, and restored static images are under `static/icons/`. Copy `static/` into the app's separate `/data/assets` volume as well. Its `/icons` route checks that volume before packaged assets, so old image references stay intact without committing backup images to the code repository. Both the restored icons and the packaged icon catalog remain available. Keep database credentials outside this bundle.

## Acceptance and cutover

Start with `docker compose up -d app`. The app binds to loopback port 8080; put an HTTPS reverse proxy in front when hosting is selected. The edge must strip client-supplied forwarded headers and set trusted forwarded host/protocol. No database port is published. Persist and back up ALL Compose volumes (database, objects, and restored static assets); never use `docker compose down -v` on real data.

Verify health, sign-in as the verified owner, non-owner rejection, dashboard row counts/values, notes and every uploaded file, deep-link refresh, and Todoist read access. Test edits/completion/deletion only on a disposable restored copy. Take an independent destination backup and prove it restores. After data parity and owner acceptance, switch the public URL/domain; keep Replit read-only as rollback until the new deployment is confirmed. Deleting the old environment is a separate irreversible action requiring approval.

Tests that mock identity do not prove browser login. Replit's old identity sessions do not transfer: the owner signs in to their independent Clerk instance. No target host, original database export, or original files were supplied yet, so live migration/cutover remains blocked on those prerequisites.
