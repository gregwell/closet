<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Order/Product Data Schema Implementation Plan

- **Plan**: context/changes/order-data-schema/plan.md
- **Scope**: Full plan (Phases 1–3)
- **Date**: 2026-09-09
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 4 warnings, 2 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | PASS |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | WARNING |
| Success Criteria | PASS |

## Findings

### F1 — Missing index on order_items.order_id

- **Severity**: WARNING
- **Impact**: LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality (Performance)
- **Location**: supabase/migrations/20260909132811_create_orders_and_order_items.sql
- **Detail**: Every RLS policy on `order_items` (select/insert/update/delete) runs an `EXISTS` subquery filtering on `order_items.order_id`. Without an index, this sequential-scans `order_items` as it grows.
- **Fix**: Add `create index on order_items (order_id);` to the migration.
- **Decision**: FIXED — supabase/migrations/20260909155518_order_schema_review_fixes.sql

### F2 — Missing index on orders.user_id

- **Severity**: WARNING
- **Impact**: LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality (Performance)
- **Location**: supabase/migrations/20260909132811_create_orders_and_order_items.sql
- **Detail**: Every `orders` RLS predicate and the `order_items` ownership subquery filter on `orders.user_id`. No index exists.
- **Fix**: Add `create index on orders (user_id);` to the migration.
- **Decision**: FIXED — supabase/migrations/20260909155518_order_schema_review_fixes.sql

### F3 — RLS policies don't specify a target role

- **Severity**: WARNING
- **Impact**: LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: supabase/migrations/20260909132811_create_orders_and_order_items.sql (all 8 `create policy` statements)
- **Detail**: AGENTS.md's hard rule calls for "granular per-operation, **per-role**" RLS policies. None of the 8 policies specify `to authenticated` — they default to `public`, which includes `anon`. Currently safe only incidentally, because `auth.uid()` resolves to `null` for anonymous requests and every predicate requires a non-null match against `user_id`.
- **Fix**: Add `to authenticated` to each of the 8 policies.
  - Strength: Matches AGENTS.md's stated convention explicitly; makes the safety non-incidental.
  - Tradeoff: None meaningful — purely additive, no behavior change for legitimate users.
  - Confidence: HIGH — standard Supabase RLS practice, verified against this project's own documented rule.
  - Blind spot: None significant.
- **Decision**: FIXED — supabase/migrations/20260909155518_order_schema_review_fixes.sql

### F4 — No constraint against negative/zero price

- **Severity**: WARNING
- **Impact**: LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality (Data safety)
- **Location**: supabase/migrations/20260909132811_create_orders_and_order_items.sql (`order_items.price_cents`)
- **Detail**: `price_cents integer not null` has no lower-bound check, so a negative or zero price could be inserted.
- **Fix**: Add `check (price_cents >= 0)` to the column definition.
- **Decision**: FIXED — supabase/migrations/20260909155518_order_schema_review_fixes.sql

### F5 — No automatic `updated_at` maintenance

- **Severity**: OBSERVATION
- **Impact**: LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality (Reliability)
- **Location**: supabase/migrations/20260909132811_create_orders_and_order_items.sql (both tables)
- **Detail**: `updated_at` only reflects insert time — no trigger updates it on `UPDATE`, so every future write path (S-02, S-03, S-04) must remember to set it manually or the column silently goes stale.
- **Fix**: Add a shared `set_updated_at()` trigger function applied to both tables via `BEFORE UPDATE`.
- **Decision**: FIXED — supabase/migrations/20260909155518_order_schema_review_fixes.sql

### F6 — No camelCase/snake_case mapping layer yet

- **Severity**: OBSERVATION
- **Impact**: LOW — informational, no current bug
- **Dimension**: Architecture
- **Location**: src/types.ts
- **Detail**: `src/types.ts` types are camelCase while the DB columns are snake_case, and no mapping helper exists anywhere yet (this is the first Supabase-typed entity beyond auth). Not a conflict today — worth deciding a convention (e.g. a `mapOrderRow()` helper in `src/lib/`) before S-02 adds real data-access code, to avoid ad-hoc mapping duplicated per call site.
- **Fix**: Defer to S-02 — first real data-access code is the natural place to establish the mapping pattern.
- **Decision**: SKIPPED — deferred to S-02

## Process note (not a numbered finding)

Commit `5045378` (Phase 1) unintentionally bundled the m2l2 skill-package files (`.claude/skills/{10x-archive,10x-implement,10x-new,10x-plan,10x-plan-review}/...`, `CLAUDE.md`, `.10x-cli-manifest.json`) alongside this change's own Phase 1 files, due to files being auto-staged by the environment before an explicit `git add`. Content-wise this is harmless (those files needed to be committed anyway), but it's a commit-boundary imprecision, already surfaced to the user in the session transcript at the time it happened.
