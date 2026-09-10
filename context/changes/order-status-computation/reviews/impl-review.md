<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Create Order and See Status Computed Automatically Implementation Plan

- **Plan**: context/changes/order-status-computation/plan.md
- **Scope**: Full plan (Phases 1–4)
- **Date**: 2026-09-10
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 3 warnings, 4 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | WARNING |
| Scope Discipline | PASS |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | WARNING |
| Success Criteria | PASS |

## Findings

### F1 — updateItemStatus has no explicit ownership check (relies solely on RLS)

- **Severity**: WARNING
- **Impact**: MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/lib/services/orders.ts:146-172
- **Detail**: `updateItemStatus` never calls `supabase.auth.getUser()` or checks the item belongs to the caller — unlike `createOrder`, which does. It relies entirely on the `order_items_update_own` RLS policy (verified correctly scoped `to authenticated` in the migrations) to block cross-user access. Not currently exploitable, but it's a single point of failure (an RLS misconfiguration) away from an IDOR, and inconsistent with the rest of this file's defense-in-depth pattern.
- **Fix**: Add an explicit ownership check (fetch the item joined to its order's `user_id`, compare to `auth.getUser()`) before allowing the update, matching `createOrder`'s pattern.
  - Strength: Removes RLS as the sole line of defense; consistent with the rest of the file.
  - Tradeoff: One extra query per status change.
  - Confidence: HIGH — the exact same join pattern already exists in the RLS policy SQL, just needs mirroring in application code.
  - Blind spot: None significant.
- **Decision**: FIXED

### F2 — `/api/orders/*` routes aren't covered by PROTECTED_ROUTES

- **Severity**: WARNING
- **Impact**: LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/middleware.ts:4
- **Detail**: `PROTECTED_ROUTES = ["/dashboard", "/orders"]` — `"/api/orders/create".startsWith("/orders")` is `false`, so the centralized auth-redirect doesn't apply to the new API routes. Each route instead does its own inline check (`createOrder` checks auth; `updateItemStatus` doesn't — see F1), which is inconsistent.
- **Fix**: Add `"/api/orders"` to `PROTECTED_ROUTES` (note: middleware redirects to `/auth/signin`, which is a page redirect — fine for form-POST routes since the browser follows it, same as the existing pattern for `/dashboard`).
- **Decision**: FIXED

### F3 — A failed multi-item insert renders as a silent "Completed" order

- **Severity**: WARNING
- **Impact**: MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/lib/services/orders.ts:115-117 (comment) + src/lib/services/order-status.ts:5-9 (`computeOrderStatus`)
- **Detail**: The plan already accepted the "no DB transaction" risk (orphaned zero-item order on partial failure) as an MVP tradeoff. What the plan didn't call out: `computeOrderStatus([])` falls through to `"completed"` for an empty items array, so that orphaned order doesn't just exist — it silently displays as a normal, finished "Completed" order in the Completed section, indistinguishable from a real one.
- **Fix**: In `getOrdersWithItems`, skip (or visibly flag) orders with zero items rather than letting them render as completed.
  - Strength: Makes a real failure visible instead of silently misleading.
  - Tradeoff: A few extra lines; needs a decision on whether to hide or flag.
  - Confidence: MEDIUM — the right UX (hide vs. flag) is a judgment call, not purely mechanical.
  - Blind spot: How likely this actually is in practice (item insert failing right after a successful order insert) wasn't measured.
- **Decision**: FIXED

### F4 — Blank price field coerces to 0 instead of failing validation

- **Severity**: OBSERVATION
- **Impact**: LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/pages/api/orders/create.ts:9 (`priceCents: z.coerce.number().int().min(0, ...)`)
- **Detail**: `z.coerce.number()` on an empty string produces `0` (via `Number("")`), so a blank price passes as a valid `0` instead of failing with a "required" message.
- **Fix**: Add an explicit empty-string check before coercion, or switch to a schema that rejects blank input.
- **Decision**: FIXED

### F5 — `orderDate` validation only checks non-empty, not date format

- **Severity**: OBSERVATION
- **Impact**: LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: src/pages/api/orders/create.ts (`orderDate: z.string().trim().min(1, ...)`)
- **Detail**: The plan's contract said "a valid date string"; the implementation only checks non-emptiness. An invalid string would still fail at the Postgres `date` column on insert (caught, surfaced as an error), so this doesn't corrupt data — it just produces a less friendly error message than a clean zod validation would.
- **Fix**: Add `z.string().date()` (or a regex) to catch the bad case earlier, with a clearer message.
- **Decision**: FIXED

### F6 — New API routes don't export `prerender = false`

- **Severity**: OBSERVATION
- **Impact**: LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/pages/api/orders/create.ts, src/pages/api/orders/items/status.ts
- **Detail**: AGENTS.md's hard rule calls for `const prerender = false` on API routes. Not a regression unique to this feature — the pre-existing `src/pages/api/auth/*` routes have the same gap (the project's `output: "server"` config makes it a no-op either way, so AGENTS.md's rule is itself stale relative to the actual config).
- **Fix**: Either add the export for documentation-consistency, or update AGENTS.md to drop the stale rule given `output: "server"` makes it unnecessary project-wide.
- **Decision**: FIXED

### F7 — Create-form component consolidated differently than planned

- **Severity**: OBSERVATION
- **Impact**: LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: src/components/orders/OrderForm.tsx, src/pages/orders/new.astro
- **Detail**: The plan specified a separate `OrderItemFields.tsx` (rows only) with `new.astro` hosting the native `<form>` directly. The implementation instead put the whole form — including the `<form>` tag, store/date fields, and submit button — into one `OrderForm.tsx` React island, matching the pre-existing `SignUpForm.tsx` convention discovered during implementation. Behavior (native POST, bracketed field names, redirect-based errors) is unchanged.
- **Fix**: None needed — this was a deliberate, justified adaptation to match an existing codebase pattern, made and explained during Phase 3.
- **Decision**: DISMISSED — no action needed, already a deliberate choice

## Triage summary

Fixed: F1, F2, F3, F4, F5, F6 (6). Dismissed (no action needed): F7 (1).

## Process note

Both sub-agent reviews confirm: no unplanned scope creep, the `items[N][field]` bracketed-form-parsing works correctly, RLS policies are correctly scoped `to authenticated`, and all automated success criteria (build, lint, 13/13 unit tests) pass as of this review. Manual criteria 4.6/4.7 (status reversals) were accepted on code+test confidence rather than individually re-walked in the browser, per an explicit user decision recorded in commit `34690dc`.
