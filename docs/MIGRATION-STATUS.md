# Migration validation and remaining prerequisites

The source implementation and portable Docker image no longer require Replit at runtime. The provided owner backup has now been restored and verified in a separate private migration database and file directory. Free hosting only is authorized; a free Sandbox account is being checked before any deployment. No public URL cutover has occurred. This is not a completed public production migration.

## Implemented

- Explicit independently managed Clerk keys in frontend and backend; verified-email owner authorization remains in place. Removed hostname-derived identity configuration and the managed proxy.
- Private filesystem storage on a persistent volume, preserving `/objects/uploads/...` identifiers and owner-only routes, including the legacy public-object URL under owner authorization. Uploads cannot overwrite existing files; traversal and symlink escapes are rejected. The default configurable raw upload limit is 25 MiB.
- Direct Todoist token requests with timeouts and pagination; removed the managed connector and unused Google Sheets transport.
- Removed Replit Vite plugins and packages from manifests and the regenerated lockfile. Minimum package age and lockfile integrity verification remain enabled.
- Single-origin production SPA/API serving, portable Dockerfile and Compose for Linux amd64, private database networking, and persistent database/files volumes. No automatic schema push or data restore at container startup.
- Build now generates the sandbox component index before full type checking. Generated bundles and incremental compiler outputs are no longer tracked; they remain on disk and are rebuilt from source.
- Read-only export instructions, object export/checksum tooling, table fingerprint capture/comparison, and restored-file link verification.

## Verified in this cloud machine

- Frozen-lockfile dependency installation succeeded after lockfile updates.
- Complete type checking and all builds passed, including a clean Docker build using the provided session CA without disabling TLS verification.
- API: 9 test files, **89 tests passed**. Frontend: 2 files, **3 tests passed**.
- Docker runtime health returned 200. Anonymous auth/access, private data and file routes returned 401 with private/no-store. SPA root and a deep link returned the compiled entry. Unknown API paths were not served the SPA.
- A private file persisted across a container restart; only that synthetic fixture was deleted afterward.
- A synthetic local database dump restored into a separate new test database with identical content fingerprints across all 9 public tables. No original production database was accessed.
- An intact synthetic file export verified; corrupt bytes were rejected. Restored-file checking detected a missing referenced file, then passed after that fixture was restored. Those fixture records/files were cleaned up.
- Docker Compose configuration validates. Runtime includes the pinned pnpm CLI for explicit schema actions on NEW demonstration databases. App images contain no runtime secret build arguments; the Clerk publishable key is intentionally browser-public build configuration.
- Existing nonfatal frontend source-map and large-bundle warnings remain.

## Updated restore and integration status

- The supplied original archive passed its external checksum and all packaged file hashes. All exported rows, column definitions, sequences, relationships and file references were restored and verified against the export. A fresh native database dump was restored again and its fingerprints matched. Detailed reports and all owner data stay outside this public code repository.
- The restored preview uses a dedicated read-only database role. Tests continue to use only the synthetic development database. Static assets can be served from a restored ICONS_DIR on a separate volume; no owner-supplied assets are committed to this repository.
- The earlier Clerk/Todoist cloud access failures were resolved by enabling Node 24 environment-proxy support (NODE_USE_ENV_PROXY=1 or --use-env-proxy). Both services passed real read-only API requests. The existing Todoist calendar project was found and its events were fetched without a managed connector.
- The independent Clerk app has no verified user matching the currently configured owner email yet. The owner must sign up and verify that email in the new app once it is accessible. Do not change the owner guard or recreate dashboard data to address this.
- Browser rendering, owner/non-owner sign-in, permanent hosting/domain setup, and final public cutover remain unverified. The original Replit deployment stays intact for rollback.

## Next action

The backup transfer and isolated restore are complete. Select hosting within the owner's budget, deploy the prepared app and verified data to a new private destination, then verify real owner sign-in, data parity, and backups before any URL cutover. Do not delete the Replit source or old data as part of this preparation.

The earlier environment publication predates these migration changes. Updated reusable install/start instructions and a Todoist secret requirement were saved as a new environment draft; review/save and publish that updated cloud snapshot to retain these changes for future tasks. Environment publication does not deploy the web app.

## Free hosting preparation

The optional `OBJECT_STORAGE_BACKEND=postgres` stores existing private uploads and restored icons in the persistent database, avoiding a separate paid app disk. An additive `file_objects` table and transactional, no-overwrite importer are included. The default filesystem backend remains available for portable Compose deployments.

A new copy of the restored owner snapshot passed import and checksum verification for all 118 runtime files (49,414,923 bytes), including all eight gallery references. All nine original table fingerprints remain identical. The original restored database/files and Replit source were unchanged. Free provider database capacity and account eligibility still need confirmation; no paid resource has been created.
