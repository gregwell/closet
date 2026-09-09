# Order/Product Data Schema — Plan Brief

> Full plan: `context/changes/order-data-schema/plan.md`

## What & Why

Add the minimal database schema (`orders`, `order_items`) with row-level security, so every subsequent slice has somewhere real to read/write. This is roadmap Foundation F-01 — it unlocks the North Star slice (S-02) and everything downstream, but contains no business logic itself.

## Starting Point

The project is bootstrapped from 10x-astro-starter with Supabase auth already wired (login/signup/signout work against `auth.users`). No domain tables exist yet, and no Supabase project is actually provisioned — the app has never talked to a real backend beyond auth.

## Desired End State

A free cloud Supabase project exists and is connected to the app via env vars. Two tables exist with RLS enforced (verified by a real cross-user access test, not just "policy exists"). A `src/types.ts` file gives downstream code typed `Order`/`OrderItem`/`ProductStatus` to build against.

## Key Decisions Made

| Decision                          | Choice                                      | Why (1 sentence)                                                  | Source |
| ---------------------------------- | -------------------------------------------- | -------------------------------------------------------------------- | ------ |
| Table name for line items          | `order_items`                                | Avoids confusion with a future general product catalog.              | Plan   |
| Price storage                      | `integer` cents                              | Avoids float rounding errors on money.                                | Plan   |
| `order_items` RLS ownership check  | Via `EXISTS` join to `orders`                | Single source of truth for ownership; no denormalized `user_id`.      | Plan   |
| Supabase environment               | Cloud project (free tier), not local Docker  | Same environment as the eventual deployment target; no Docker needed. | Plan   |
| Status transition enforcement      | App-level only (S-02/S-03), not DB triggers  | Keeps this Foundation minimal; single-user app, low risk.             | Plan   |

## Scope

**In scope:** `orders` + `order_items` tables, RLS policies (4 per table, one per CRUD operation), a `CHECK` constraint on the 6 valid status strings, `src/types.ts`, connecting the app to a real cloud Supabase project.

**Out of scope:** any business logic (status computation — S-02), any UI or API routes (S-02/S-03/S-04), DB-level status-transition enforcement, local Docker Supabase.

## Architecture / Approach

One SQL migration file creates both tables and all RLS policies together, applied once via the Supabase Studio SQL editor against the new cloud project. `orders` is the ownership root (`user_id` column); `order_items` derives ownership by joining back to `orders` in its RLS policies, so ownership lives in exactly one place.

## Phases at a Glance

| Phase                                  | What it delivers                                      | Key risk                                                        |
| ---------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------- |
| 1. Cloud Supabase project + env wiring | A real, connected Supabase project                        | Manual account-creation step — nothing to automate, just do it once |
| 2. Migration — tables + RLS            | `orders`/`order_items` exist with enforced RLS             | RLS policies that look right but don't actually block cross-user reads if not tested properly |
| 3. Shared TypeScript types             | `src/types.ts` with `Order`/`OrderItem`/`ProductStatus`    | Low risk — pure types, no runtime behavior                          |

**Prerequisites:** none (this is the first Foundation)
**Estimated effort:** one focused session — no time units per roadmap convention, but this is the smallest phase of tonight's plan

## Open Risks & Assumptions

- Assumes you're comfortable running SQL in the Supabase Studio editor (copy-paste, click Run) — no CLI linking required for this single migration.
- RLS correctness is only proven by the manual cross-user test in Phase 2 — a policy that "looks right" but has a subtle bug (e.g., wrong column in the `EXISTS` join) would otherwise go unnoticed.

## Success Criteria (Summary)

- A cloud Supabase project is live and the app connects to it (test signup works).
- Both tables exist with RLS that provably blocks cross-user access, not just RLS that's "enabled."
- `src/types.ts` exists and the project still builds and lints clean.
