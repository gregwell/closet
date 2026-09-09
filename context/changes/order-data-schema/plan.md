# Order/Product Data Schema Implementation Plan

## Overview

Add the minimal database schema for orders and their line-item products, with row-level security (RLS) so every row is visible only to the user who owns it. This is Foundation F-01 from `context/foundation/roadmap.md` — it carries no business logic (no status-computation rule); it only creates the substrate S-02 will build on.

## Current State Analysis

- No `supabase/migrations/` directory exists yet — this is the first migration in the project.
- No `src/types.ts` exists yet — first shared-types file (per `AGENTS.md` convention).
- The starter (`src/lib/supabase.ts`) already creates a Supabase SSR client using `@supabase/ssr`, reading `SUPABASE_URL`/`SUPABASE_KEY` via `astro:env/server`. Auth already works against Supabase's built-in `auth.users` table — no changes needed there.
- `.env.example` documents the two required variables; `.env` (Node) and `.dev.vars` (Cloudflare local dev) are both gitignored.
- The project currently has no Supabase project linked (local `supabase/config.toml` is starter boilerplate for local dev only).

## Desired End State

A cloud Supabase project exists and is linked to this codebase via `.env`/`.dev.vars`. Two tables (`orders`, `order_items`) exist with RLS enabled, verified by: a manual insert as one authenticated user is invisible to a query run as a different user (or via the Supabase Studio "RLS test" / policy simulator). `src/types.ts` exports TypeScript types matching the schema.

### Key Discoveries:

- Product status is a fixed 6-value set already locked in prior planning (`context/foundation/shape-notes.md`): in transit → awaiting decision → (kept | to be returned) → return shipped → return received, with an allowed reversal `kept → to be returned` and `return shipped → to be returned`. Translated to English DB identifiers: `in_transit`, `awaiting_decision`, `kept`, `to_be_returned`, `return_shipped`, `return_received`.
- Decision (this planning session): store price as `price_cents integer` (avoid float rounding on money).
- Decision: table is named `order_items`, not `products` — it's a line item of an order, not a general catalog.
- Decision: `order_items` has no direct `user_id` column — its RLS policy reaches ownership via `EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())`, keeping ownership single-sourced on `orders`.

## What We're NOT Doing

- No status-transition enforcement in the database (no trigger/constraint blocking illegal transitions) — that's application logic, owned by S-02/S-03. The database only constrains status to the 6 valid string values via a `CHECK` constraint.
- No business logic of any kind (no computed order status) — that's S-02.
- No UI, no API routes — those are S-02/S-03/S-04.
- No local Docker Supabase setup — this plan targets a cloud Supabase project directly, per this planning session's decision (doubles as the future deployment target).

## Implementation Approach

Provision a free-tier cloud Supabase project, wire its credentials into the existing env-var convention the starter already established, write one migration creating both tables with RLS, apply it via the Supabase SQL editor (simplest path with no local CLI linkage required), then add matching TypeScript types.

## Phase 1: Cloud Supabase project + environment wiring

### Overview

Create the actual Supabase project this app will use (both now for development and later for deployment), and connect this codebase to it.

### Changes Required:

#### 1. Supabase project creation (manual, user action)

**Intent**: Create a free Supabase project at supabase.com. This is an account/dashboard action, not a code change — the human does this step.

**Contract**: Project must be created; the `Project URL` and `anon` public key (Settings → API) must be captured for the next step.

#### 2. Environment variables

**File**: `.env` (Node, gitignored) and `.dev.vars` (Cloudflare local dev, gitignored)

**Intent**: Populate both files from `.env.example` with the real `SUPABASE_URL` and `SUPABASE_KEY` from the new project, so the existing `src/lib/supabase.ts` client can connect.

**Contract**: Same two variable names `.env.example` already declares. No code changes to `src/lib/supabase.ts` — it already reads these via `astro:env/server`.

### Success Criteria:

#### Automated Verification:

- `npm run build` still passes (env schema validation in `astro.config.mjs` doesn't fail on missing/malformed vars): `npm run build`

#### Manual Verification:

- Visiting `/auth/signup` and creating a test account succeeds against the new cloud project (confirms the connection actually works end-to-end, not just that the build passes)
- The new user appears in the Supabase dashboard under Authentication → Users

---

## Phase 2: Migration — `orders` and `order_items` tables with RLS

### Overview

Create the two tables and their RLS policies via one migration file, applied directly on the cloud project.

### Changes Required:

#### 1. Migration file

**File**: `supabase/migrations/20260909132811_create_orders_and_order_items.sql`

**Intent**: Define `orders` and `order_items` tables and enable RLS with per-operation, per-owner policies, per the project's own migration convention (`AGENTS.md`: RLS always enabled, granular per-operation per-role policies).

**Contract**:

```sql
create table orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  store text not null,
  order_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  brand text not null,
  type text not null,
  price_cents integer not null,
  description text,
  category text,
  status text not null default 'in_transit'
    check (status in ('in_transit', 'awaiting_decision', 'kept', 'to_be_returned', 'return_shipped', 'return_received')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table orders enable row level security;
alter table order_items enable row level security;

-- orders: owner-only, one policy per operation
create policy "orders_select_own" on orders for select using (user_id = auth.uid());
create policy "orders_insert_own" on orders for insert with check (user_id = auth.uid());
create policy "orders_update_own" on orders for update using (user_id = auth.uid());
create policy "orders_delete_own" on orders for delete using (user_id = auth.uid());

-- order_items: ownership derived from the parent order
create policy "order_items_select_own" on order_items for select
  using (exists (select 1 from orders where orders.id = order_items.order_id and orders.user_id = auth.uid()));
create policy "order_items_insert_own" on order_items for insert
  with check (exists (select 1 from orders where orders.id = order_items.order_id and orders.user_id = auth.uid()));
create policy "order_items_update_own" on order_items for update
  using (exists (select 1 from orders where orders.id = order_items.order_id and orders.user_id = auth.uid()));
create policy "order_items_delete_own" on order_items for delete
  using (exists (select 1 from orders where orders.id = order_items.order_id and orders.user_id = auth.uid()));
```

Apply via the Supabase Studio SQL editor (Dashboard → SQL Editor → paste → Run) — simplest path that doesn't require linking the Supabase CLI to the cloud project for this single migration.

### Success Criteria:

#### Automated Verification:

- N/A — this phase is a database-schema change applied via the Studio SQL editor, not a local build/test command.

#### Manual Verification:

- Both tables appear in Supabase Studio → Table Editor
- Inserting a row into `orders` as the authenticated test user (via Studio's "impersonate" / RLS test, or by inserting through the app's Supabase client while logged in) succeeds
- Querying `orders`/`order_items` as a different (or anonymous) user returns zero rows for the first user's data — RLS is actually blocking cross-user access, not just present-but-inert
- Inserting a row with an invalid `status` value (e.g. `'bogus'`) is rejected by the `CHECK` constraint

---

## Phase 3: Shared TypeScript types

### Overview

Add `src/types.ts` so S-02 and later slices have a typed contract for orders/order items instead of `any`.

### Changes Required:

#### 1. Shared types file

**File**: `src/types.ts`

**Intent**: Export types mirroring the migration's shape, plus the `ProductStatus` union type, so downstream slices import one canonical definition instead of re-declaring the status strings.

**Contract**: Exports `type ProductStatus = "in_transit" | "awaiting_decision" | "kept" | "to_be_returned" | "return_shipped" | "return_received"`, plus `Order` and `OrderItem` interfaces matching the table columns (camelCase field names; the actual Supabase client response mapping — snake_case columns — is a concern for the data-access code S-02 will write, not this file).

### Success Criteria:

#### Automated Verification:

- Type checking passes: `npm run build` (Astro's `astro check` step / `tsc` via `@astrojs/check` runs as part of build)
- Linting passes: `npm run lint`

#### Manual Verification:

- N/A — this is a pure types file with no runtime behavior to click-test.

---

## Testing Strategy

### Unit Tests:

None in this Foundation — no business logic exists yet to unit test. `src/types.ts` is types-only (erased at runtime).

### Integration Tests:

None yet — deferred to S-02, which will have actual data-access code to test against.

### Manual Testing Steps:

1. Sign up a test user against the new cloud Supabase project (Phase 1).
2. Insert one `orders` row and one `order_items` row via Studio (or a one-off script using the app's Supabase client) while authenticated as that user; confirm both are visible in Studio.
3. Attempt to read those rows unauthenticated (or as a second test user) and confirm zero rows come back — RLS is enforced, not just declared.
4. Attempt an insert into `order_items` with `status = 'bogus'` and confirm the database rejects it.

## Performance Considerations

None — two small tables, single-user scale (`target_scale.users: small` per PRD). No indexing beyond the primary keys and foreign keys is needed at this scale.

## Migration Notes

This is the first migration; there is no existing data to migrate or preserve.

## References

- Roadmap Foundation: `context/foundation/roadmap.md` § F-01
- PRD: `context/foundation/prd.md` § Business Logic, § Non-Functional Requirements
- Domain model (status values, allowed reversals): `context/foundation/shape-notes.md`
- Migration/RLS convention: `AGENTS.md` § Hard rules

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Cloud Supabase project + environment wiring

#### Automated

- [x] 1.1 `npm run build` passes with real env vars in place

#### Manual

- [x] 1.2 Signup against the new cloud project succeeds
- [x] 1.3 New user visible in Supabase dashboard

### Phase 2: Migration — `orders` and `order_items` tables with RLS

#### Manual

- [ ] 2.1 Both tables visible in Supabase Studio
- [ ] 2.2 Insert as owning user succeeds
- [ ] 2.3 Cross-user read returns zero rows (RLS actually enforced)
- [ ] 2.4 Invalid status value rejected by CHECK constraint

### Phase 3: Shared TypeScript types

#### Automated

- [ ] 3.1 `npm run build` passes (type check)
- [ ] 3.2 `npm run lint` passes
