# Create Order and See Status Computed Automatically — Plan Brief

> Full plan: `context/changes/order-status-computation/plan.md`

## What & Why

Let a user create an order with one or more products and see the order's status computed automatically from its products' current statuses — never set directly. This is the North Star slice (roadmap S-02): the one feature that proves this app is worth more than the Excel sheet it replaces.

## Starting Point

Foundation F-01 (schema + RLS) is done and archived. `orders`/`order_items` tables exist, `src/types.ts` has the row types. No data-access layer, no UI beyond auth, no test runner exist yet in the project.

## Desired End State

Logged-in user creates an order at `/orders/new` (dynamic product rows), lands on `/orders`, sees the order's status derived from its products. Clicking a status action on any product re-derives the order's displayed status immediately — including reopening a "kept" product back to "to be returned" after the order looked done.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
|---|---|---|---|
| Initial product status on order creation | `awaiting_decision` (skip `in_transit`) | No FR describes a "mark as delivered" action; the user is logging an order they already know the contents of. | Plan |
| Create-form UX | React island for dynamic rows, but inside a plain native `<form>` | Keeps the existing form-POST-then-redirect pattern from auth unchanged; React only owns the repeatable-row state. | Plan |
| Data-access location | `src/lib/services/orders.ts` | Matches AGENTS.md's "extracted business logic in `src/lib/services/`"; testable in isolation. | Plan |
| Status-change UX | Buttons directly on the `/orders` list | No extra page/routing needed; the whole point (auto-recompute) is visible in one place. | Plan |
| Error handling | Redirect + `?error=` query param | Matches the existing auth pages exactly — no new pattern. | Plan |
| Field validation | Zod in the API route | AGENTS.md already calls for zod validation on API routes. | Plan |
| Unit test timing | Now, in this plan (Phase 1) | `computeOrderStatus`/`isValidTransition` are the best test candidates in the whole project — cheaper to test now than to return to this context later. | Plan |

## Scope

**In scope:** `computeOrderStatus`, `isValidTransition`, `src/lib/services/orders.ts`, `/orders/new` (create form), `/orders` (list + status actions), Vitest setup + unit tests for the business logic.

**Out of scope:** editing orders/products after creation (FR-003, parked), "return received" action (FR-008, parked), "mark as delivered" action (no FR), client-side validation beyond HTML5 `required`, e2e tests (deferred to `/10x-test-plan`).

## Architecture / Approach

Business logic first (pure functions, zero dependencies) → data-access layer that consumes it and maps DB rows to domain types → two UI surfaces that consume the data layer. The create form's dynamic product rows are a React island, but the `<form>` itself stays native HTML so submission and error handling stay identical to the existing auth pages.

## Phases at a Glance

| Phase | What it delivers | Key risk |
|---|---|---|
| 1. Business logic | `computeOrderStatus`, `isValidTransition`, first tests in the project (Vitest setup) | Getting the priority order or transition table wrong — caught immediately by the tests written alongside it |
| 2. Data access | `src/lib/services/orders.ts` — mapping + 3 operations | snake_case/camelCase mapping bugs; RLS-dependent behavior not visible until Phase 3/4 exercise it |
| 3. Create-order form | `/orders/new`, `OrderItemFields.tsx`, create API route | Bracketed form-field parsing (`items[N][field]`) is a new, slightly unusual pattern in this codebase |
| 4. Orders list | `/orders`, status-update API route, `PROTECTED_ROUTES` update | This is where the actual proof-of-value happens — if the auto-recompute doesn't feel right here, the whole hypothesis needs rework |

**Prerequisites:** F-01 (done)
**Estimated effort:** the biggest slice of the evening's plan — no time units per roadmap convention, but expect this to be the longest of the four phases done so far

## Open Risks & Assumptions

- Assumes Supabase's embedded-resource select (`orders` with nested `order_items`) works cleanly with the RLS policies as written — not yet verified against a real query, only against direct SQL during F-01's review.
- The bracketed-array form-parsing approach is untested in this codebase; if Astro's `request.formData()` handles repeated/bracketed keys awkwardly, Phase 3 may need a small adjustment (this is exactly the kind of thing `/10x-implement` surfaces as a mismatch to resolve in the moment, not something to over-plan now).

## Success Criteria (Summary)

- A user can create an order with 1+ products and see it appear on `/orders` with a correct computed status.
- Changing any product's status immediately changes the order's displayed status, matching the priority rule (in transit > awaiting decision > ready for return > completed).
- Reopening a decision (kept → to be returned) after the order looked "completed" correctly un-completes it.
- `computeOrderStatus` and `isValidTransition` have passing unit tests covering the priority order and the full transition table.
