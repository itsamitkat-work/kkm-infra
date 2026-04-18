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
- **Installs must use pnpm:** root `preinstall` runs `only-allow pnpm`, so `npm install` / `yarn` fails on purpose with a hint to use `pnpm install`.
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
| `pnpm db:reset` / `pnpm sdr`        | Reset local DB and reapply all migrations (`supabase db reset --local`)                   |
| `pnpm db:migrate` / `pnpm sdm`      | Apply pending migrations to the local DB (`supabase migration up --local`)              |
| `pnpm db:reset:seed`                | `db:reset` then `supabase/scripts/seed-app.sh`                                            |

## Environment variables

- **Template:** copy `.env.example` to `.env` at the repo root if you use shared tooling or the web dev script that loads it.
- **Next.js:** prefers `apps/web/.env.local` (standard Next behavior). You can also rely on the root `.env` when running `pnpm --filter web dev` if that file exists.

Do not commit real secrets; `.env*` files are gitignored except `.env.example`.

## Deployment

CI/CD for preview/production (web, Supabase migrations, branches) is not wired through root `package.json` scripts; configure that in your pipeline when you are ready. For local reference: **Web (Vercel)** typically uses **Root Directory** `apps/web` and `apps/web/vercel.json`. **`apps/python-api`** has nothing to deploy until PDF tooling exists.

## API documentation

Swagger UI for the external projects API:

- [http://projects.kkminfra.com/swagger/index.html](http://projects.kkminfra.com/swagger/index.html)

## Continuous integration

Workflow `.github/workflows/ci.yml` runs **pnpm install**, Turbo `build` / `lint` for `web` and dependencies, and may include Supabase checks or deploy steps depending on how you configure secrets and jobs.
