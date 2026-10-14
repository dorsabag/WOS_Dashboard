# WOS Dashboard

Private, single-owner Whiteout Survival planning app. React/Vite frontend, Express API, PostgreSQL, independently managed Clerk identity, and private files on a persistent filesystem. Node 24 and pnpm 10.32.1. No Replit runtime, connector, or build plugins are required.

## Development

```sh
pnpm install --frozen-lockfile
pnpm run build
```

The build regenerates the mockup sandbox component index before full type checking. Run the API with `PORT=8080 pnpm --filter @workspace/api-server dev` and the dashboard with `pnpm --filter @workspace/wos-dashboard dev`. Inject `DATABASE_URL`, matching `CLERK_PUBLISHABLE_KEY`/`VITE_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, and `OWNER_EMAIL` through secure configuration; set `OBJECT_STORAGE_DIR` to an absolute writable persistent directory. Never use the live source database for development.

Run API tests with an explicitly isolated `DATABASE_URL`: `pnpm --filter @workspace/api-server test`; frontend tests: `pnpm --filter @workspace/wos-dashboard test`. Storage tests use temporary directories and calendar tests mock the remote API. Uploaded objects stay at `/objects/uploads/<id>`; the server stores file bytes beneath `OBJECT_STORAGE_DIR` and keeps metadata alongside them. All storage operations require verified owner authorization. New uploads default to 25 MiB maximum (`MAX_UPLOAD_BYTES` override).

## Deployment and data preservation

[Migration and safe export instructions](docs/MIGRATION.md) cover portable Docker Compose for Linux amd64, backups, restoration, and cutover. Hosting is deliberately unselected. Do not schema-push, delete, reseed, or reset existing data. Keep real credentials and exports outside Git. The optional Todoist integration requires `TODOIST_API_TOKEN` for the same existing account.
