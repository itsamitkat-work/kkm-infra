# kkm-infra

Monorepo for the KKM Infra stack: Next.js web app, shared TypeScript packages, Supabase (migrations and Edge Functions), and a reserved app slot for future tooling.

## Repository layout

| Path              | Description                                                                                                                                                            |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web`        | Next.js 15 application                                                                                                                                                 |
| `apps/python-api` | **Placeholder** — no runtime yet; intended for future PDF-related tooling (ingestion, generation, etc.). Turbo `build` / `lint` / `test` are no-ops so CI stays green. |
| `packages/shared` | Shared TypeScript utilities (`@kkm/shared`)                                                                                                                            |
| `packages/db`     | Supabase-generated types and DB helpers (`@kkm/db`)                                                                                                                    |
| `supabase/`       | Supabase CLI project (`config.toml`, `migrations/`, `functions/`)                                                                                                      |

Tooling at the repo root: **pnpm** workspaces, **Turborepo**, and **Prettier**.

## Prerequisites

- **Node.js** 20+ (recommended)
- **pnpm** 9 (`corepack enable` then installs use `packageManager` from root `package.json`)
- **Supabase CLI** (optional, for local DB and `pnpm db:types`)

## Install

From the repository root:

```bash
corepack enable
pnpm install
```

## Common commands

Run from the **repository root** unless noted.

| Command                             | Description                                                                               |
| ----------------------------------- | ----------------------------------------------------------------------------------------- |
| `pnpm dev`                          | Turbo `dev` for packages that define it (Next.js in `web`, package watchers in `@kkm/*`)  |
| `pnpm --filter web dev`             | Next.js only (port 4200; optional root `.env` via `dotenv-cli` when present)              |
| `pnpm build`                        | Production build via Turbo                                                                |
| `pnpm lint`                         | Lint across the workspace                                                                 |
| `pnpm test`                         | Tests (placeholder app exits successfully; add real tests when you implement PDF tooling) |
| `pnpm format` / `pnpm format:check` | Prettier                                                                                  |
| `pnpm db:types`                     | Regenerate `packages/db` types (requires local Supabase: `supabase start`)                |
| `pnpm deploy`                       | Deploy web (`vercel --prod` in `apps/web`)                                                |

## Environment variables

- **Template:** copy `.env.example` to `.env` at the repo root if you use shared tooling or the web dev script that loads it.
- **Next.js:** prefers `apps/web/.env.local` (standard Next behavior). You can also rely on the root `.env` when running `pnpm --filter web dev` if that file exists.

Do not commit real secrets; `.env*` files are gitignored except `.env.example`.

## Deployment

- **Web (Vercel):** set the Vercel project **Root Directory** to `apps/web`. Install/build are configured in `apps/web/vercel.json` to run from the monorepo root.
- **`apps/python-api`:** nothing to deploy until you add the PDF tooling.
- **Supabase:** `.github/workflows/deploy.yml` runs on `develop` / `main` (`supabase link` + `db push`). GitHub secrets: `SUPABASE_ACCESS_TOKEN`, `PREVIEW_PROJECT_ID`, `PREVIEW_DB_PASSWORD`, `PRODUCTION_PROJECT_ID`, `PRODUCTION_DB_PASSWORD`. Overview: [Supabase environments](https://supabase.com/blog/the-vibe-coders-guide-to-supabase-environments).

## API documentation

Swagger UI for the external projects API:

- [http://projects.kkminfra.com/swagger/index.html](http://projects.kkminfra.com/swagger/index.html)

## Continuous integration

Workflow `.github/workflows/ci.yml` runs a **Supabase** job (local DB, migrations, type drift check), **pnpm install**, Turbo `build` / `lint` for `web` and dependencies, and Turbo `build` / `lint` / `test` for `python-api`. `.github/workflows/deploy.yml` pushes migrations on `develop` / `main`.
