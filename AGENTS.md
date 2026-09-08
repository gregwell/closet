# Repository Guidelines

Closet App — an Astro 6 SSR app (React 19 islands, Tailwind 4, Supabase auth) deployed to Cloudflare Workers, scaffolded from the 10x Astro Starter (see @CLAUDE.md.scaffold for the starter's own notes).

## Hard rules

- API routes (`src/pages/api/**`) must export `const prerender = false` and use uppercase `GET`/`POST` handlers; validate input with zod.
- New Supabase tables always enable RLS with granular per-operation, per-role policies. Migrations live in `supabase/migrations/` named `YYYYMMDDHHmmss_short_description.sql`.
- Merge Tailwind classes via `cn()` from `@/lib/utils` (clsx + tailwind-merge) — never concatenate class strings manually.
- No Next.js directives (`"use client"`, etc.) in React components; extract hooks to `src/components/hooks/`.

## Project Structure & Module Organization

- `src/pages/` — Astro pages; `src/pages/api/` — API routes.
- `src/components/` — Astro components for static content/layout; React only where interactivity is needed. shadcn/ui lives in `src/components/ui/` ("new-york" variant; add new ones with `npx shadcn@latest add [name]`).
- `src/lib/` — services/helpers; `src/lib/supabase.ts` is the Supabase SSR client (`@supabase/ssr`, cookie-based sessions).
- `src/middleware.ts` — resolves the current user on every request, redirects unauthenticated users away from routes in `PROTECTED_ROUTES`.
- `src/types.ts` — shared types (entities, DTOs).
- `supabase/` — local Supabase config and migrations.
- `context/` — 10xWorkflow foundation docs (@context/foundation/prd.md, @context/foundation/tech-stack.md). Never write to `context/archive/`.

## Build, Test, and Development Commands

- `npm run dev` — start dev server (Cloudflare workerd runtime; requires Node ≥22, see `.nvmrc`).
- `npm run build` / `npm run preview` — production build / preview.
- `npm run lint` / `npm run lint:fix` — ESLint, type-checked rules.
- `npm run format` — Prettier (astro + tailwind plugins).

## Coding Style & Naming Conventions

- Path alias `@/*` maps to `./src/*`.
- Pre-commit (husky + lint-staged): `eslint --fix` on `*.{ts,tsx,astro}`, `prettier --write` on `*.{json,css,md}`.

## Commit & Pull Request Guidelines

- Conventional Commits prefixes observed in history: `docs:`, `chore:` — one logical, closed step per commit (e.g. `docs: generate PRD for Closet App from shape-notes`).
- CI (@.github/workflows/ci.yml) runs lint + build on every push/PR to `master`; requires `SUPABASE_URL`/`SUPABASE_KEY` repository secrets.

## Security & Configuration Tips

- `SUPABASE_URL`/`SUPABASE_KEY` are server-only secrets (`astro:env/server`) — copy @.env.example to `.env` (Node) or `.dev.vars` (Cloudflare local dev; gitignored). Never commit either.
- Local Supabase stack: `npx supabase start` (requires Docker); Studio UI at `http://localhost:54323`.
