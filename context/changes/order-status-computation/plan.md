# Create Order and See Status Computed Automatically — Implementation Plan

## Overview

Implement the North Star slice (roadmap S-02): a user creates an order with one or more products, sees the order's status computed automatically from its products' statuses, and can set each product to "kept" or "to be returned" (reversibly). This is the core hypothesis of the product — the one thing that makes it more than a spreadsheet.

## Current State Analysis

- Foundation F-01 is done: `orders`/`order_items` tables exist with RLS, indexes, and a `price_cents >= 0` check. `src/types.ts` has `Order`, `OrderItem`, `ProductStatus`.
- No `OrderStatus` type exists yet — this plan adds it.
- No data-access layer exists yet beyond auth (`src/lib/supabase.ts` only creates the client).
- No test runner exists in the project yet (no Vitest, no `vitest.config.*`, no test script in `package.json`).
- Existing API routes (`src/pages/api/auth/*.ts`) follow one consistent pattern: native `<form>` POST → `APIRoute` reads `request.formData()` → redirects with `?error=` on failure. This plan follows the same pattern rather than introducing a JSON/fetch API style.
- `src/middleware.ts` has a `PROTECTED_ROUTES` array (`["/dashboard"]`) gating routes behind auth.

## Desired End State

A logged-in user can: open `/orders/new`, add one or more product rows to a form, submit it, land on `/orders` and see the new order with a status computed from its products (not stored). They can click a status action on any product and see the order's displayed status update accordingly, including reopening a "kept" product back to "to be returned" after the order looked "completed".

### Key Discoveries:

- **No FR exists for a "mark as delivered" action.** The only FRs that touch product status directly (FR-006, FR-007) start from "awaiting decision" or later. Decision this session: new order items are created with `status: 'awaiting_decision'` — `in_transit` stays in the `ProductStatus` union (for schema completeness and future use) but is unreachable through this slice's UI.
- **The transition graph is already fully decided** (from `/10x-shape`'s Socratic rounds, `context/foundation/shape-notes.md`): `awaiting_decision → kept`, `awaiting_decision → to_be_returned`, `kept → to_be_returned` (reversal), `to_be_returned → return_shipped`, `return_shipped → to_be_returned` (reversal). No FR/plan-session decision needed here — this plan just implements it as `isValidTransition`.
- **DB rows are snake_case, domain types are camelCase.** No mapping helper exists yet (flagged as a deferred item in F-01's impl-review, F6). This plan is where it lands: `src/lib/services/orders.ts` owns the row→domain mapping.

## What We're NOT Doing

- No "mark as delivered" / `in_transit → awaiting_decision` action — not an FR, out of scope.
- No editing of order/product fields after creation (FR-003, nice-to-have, parked on the roadmap).
- No "return received" status action (FR-008, parked).
- No client-side (JS) form validation beyond HTML5 `required` — validation happens server-side with zod, per this session's decision.
- No preserving of entered form data on a failed order-creation submit — on error the user re-enters the form. Acceptable loss for this MVP.
- No pagination or filtering on the orders list — single user, small scale (PRD `target_scale.users: small`).

## Implementation Approach

Business logic first (pure, easily testable, zero dependencies), then the data-access layer that consumes it, then the two UI surfaces (create form, list with actions) that consume the data layer. The create form uses a React island only for the repeatable product-row UI state (add/remove row); the `<form>` tag itself stays a plain native HTML form so the existing form-POST-then-redirect pattern from auth keeps working unchanged — the React-rendered inputs use bracketed names (`items[0][brand]`, `items[1][brand]`, …) that the server parses back into an array, so no new JSON/fetch pattern enters the codebase.

## Critical Implementation Details

**Status transition validation is the load-bearing invariant of Phase 2.** `isValidTransition(from, to)` must exactly encode the graph in Key Discoveries above — any consuming code (the status-update API route in Phase 4) rejects a transition not in this table, rather than trusting the client. This function is co-located with `computeOrderStatus` in `src/lib/services/order-status.ts` because both encode the same domain rule from the same source (PRD Business Logic + shape-notes).

**Form field parsing contract.** The create-order API route (Phase 3) receives `FormData` with bracketed keys (`items[0][brand]`, `items[0][type]`, `items[0][priceCents]`, `items[0][description]`, `items[0][category]`, repeating for each row index present). Parsing groups keys by their numeric index into an array of item objects before zod validation — this is the one place that logic lives; Phase 4's status-update route has no such parsing (single flat field).

## Phase 1: Business logic — `computeOrderStatus` and `isValidTransition`

### Overview

Add the `OrderStatus` type and the two pure functions that encode this product's core domain rule, with unit tests. No I/O, no Supabase — this is deliberately the first phase so the riskiest logic is nailed down before anything is built on top of it.

### Changes Required:

#### 1. `OrderStatus` type

**File**: `src/types.ts`

**Intent**: Add the order-level computed status alongside the existing `ProductStatus`.

**Contract**: `export type OrderStatus = "awaiting_delivery" | "awaiting_decision" | "ready_for_return" | "completed";`

#### 2. Order status computation and transition validation

**File**: `src/lib/services/order-status.ts` (new)

**Intent**: `computeOrderStatus` implements the PRD's Business Logic section verbatim: order status is never stored, always derived from its products. `isValidTransition` implements the transition graph from shape-notes/Socratic rounds.

**Contract**:
```ts
export function computeOrderStatus(items: ProductStatus[]): OrderStatus {
  if (items.some((s) => s === "in_transit")) return "awaiting_delivery";
  if (items.some((s) => s === "awaiting_decision")) return "awaiting_decision";
  if (items.some((s) => s === "to_be_returned")) return "ready_for_return";
  return "completed";
}

const ALLOWED_TRANSITIONS: Record<ProductStatus, ProductStatus[]> = {
  in_transit: [],
  awaiting_decision: ["kept", "to_be_returned"],
  kept: ["to_be_returned"],
  to_be_returned: ["return_shipped"],
  return_shipped: ["to_be_returned"],
  return_received: [],
};

export function isValidTransition(from: ProductStatus, to: ProductStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}
```
An empty `items` array falls through to `"completed"` by construction (no branch matches) — this is intentional, not a bug to guard against; FR-002 guarantees at least one product per order, so this path is unreachable in practice but harmless if it ever occurred.

#### 3. Test runner setup

**File**: `package.json`, `vitest.config.ts` (new)

**Intent**: This is the first test in the project — add Vitest as the runner.

**Contract**: Add `vitest` as a devDependency. Add a `"test": "vitest run"` script. `vitest.config.ts` uses Astro's `getViteConfig` from `astro/config` so path aliases (`@/*`) resolve the same as in the app.

#### 4. Unit tests

**File**: `src/lib/services/order-status.test.ts` (new)

**Intent**: Cover the priority order in `computeOrderStatus` and the full transition table in `isValidTransition` — this is the test the certification's "at least one test addressing a defined risk" criterion targets; the risk is "the computed status is wrong or a client can force an illegal status transition."

**Contract**: Test cases for `computeOrderStatus`: empty array → `completed`; all `kept`/`return_shipped` mix → `completed`; any `to_be_returned` present (with kept/return_shipped siblings) → `ready_for_return`; any `awaiting_decision` present → `awaiting_decision` (even alongside `to_be_returned`, priority order matters); any `in_transit` present → `awaiting_delivery` (highest priority, even alongside everything else). Test cases for `isValidTransition`: every edge in `ALLOWED_TRANSITIONS` returns `true`; at least `kept → return_shipped` (skips a step) and `return_received → kept` (moves backward from a terminal-ish state) return `false`.

### Success Criteria:

#### Automated Verification:

- Type checking passes: `npm run build`
- Linting passes: `npm run lint`
- Unit tests pass: `npm run test`

#### Manual Verification:

- N/A — pure functions, fully covered by the automated tests above.

---

## Phase 2: Data access — `src/lib/services/orders.ts`

### Overview

The row-mapping and query layer that Phases 3 and 4 both consume. Uses the per-request Supabase client (`src/lib/supabase.ts`), so every query is automatically scoped by RLS to the calling user — no manual `user_id` filtering needed on reads.

### Changes Required:

#### 1. Orders service

**File**: `src/lib/services/orders.ts` (new)

**Intent**: Map snake_case DB rows to the camelCase `Order`/`OrderItem` types, and provide the three operations the UI phases need: list orders with items, create an order with its items, update one item's status.

**Contract**:
- `getOrdersWithItems(supabase): Promise<{ order: Order; items: OrderItem[]; status: OrderStatus }[]>` — selects from `orders` with a nested `order_items` select (Supabase's embedded-resource syntax), maps rows, computes `status` via `computeOrderStatus` per order. Ordered so orders whose status is not `"completed"` sort first (per FR-005's "unresolved orders surface before finished ones").
- `createOrder(supabase, input: { store: string; orderDate: string; items: { brand: string; type: string; priceCents: number; description: string | null; category: string | null }[] }): Promise<{ error: string | null }>` — inserts one `orders` row (no explicit `user_id` in the insert payload; RLS's `with check` combined with a `default auth.uid()` is NOT set on the column per the F-01 migration, so `user_id` must be supplied explicitly from `supabase.auth.getUser()`), then inserts all `order_items` rows with `status: "awaiting_decision"` for each.
- `updateItemStatus(supabase, itemId: string, newStatus: ProductStatus): Promise<{ error: string | null }>` — reads the item's current status, calls `isValidTransition`; if invalid, returns an error without writing; if valid, updates the row (RLS's `order_items_update_own` policy enforces ownership at the DB level as defense in depth).

### Success Criteria:

#### Automated Verification:

- Type checking passes: `npm run build`
- Linting passes: `npm run lint`

#### Manual Verification:

- N/A for this phase alone — exercised end-to-end by Phases 3 and 4's manual checks.

---

## Phase 3: Create-order form — `/orders/new`

### Overview

The page and API route that let a user create an order with one or more products.

### Changes Required:

#### 1. Repeatable item-rows component

**File**: `src/components/orders/OrderItemFields.tsx` (new, React island)

**Intent**: Client-side add/remove UI for product rows. Renders plain `<input>` elements named `items[N][brand]`, `items[N][type]`, `items[N][priceCents]`, `items[N][description]`, `items[N][category]` (N = row index), so they submit as part of the surrounding native `<form>` — no fetch/JSON involved.

**Contract**: Starts with one empty row. "Add product" appends a row (re-indexing not required — indices don't need to be contiguous, the server just groups whatever indices are present). "Remove" on a row deletes it, leaving at least one row always present.

#### 2. Create-order page

**File**: `src/pages/orders/new.astro` (new)

**Intent**: Hosts the `<form method="POST" action="/api/orders/create">` with static `store`/`order_date` inputs plus `<OrderItemFields client:load />` inside the same form, and the submit button. Renders an error message from `Astro.url.searchParams.get("error")` if present (mirrors the auth pages' pattern).

**Contract**: Protected route (added to `PROTECTED_ROUTES` in Phase 4, since that's where the array already lives and gets touched again — noting it here so both phases' intent is clear; the actual edit happens once, in Phase 4).

#### 3. Create-order API route

**File**: `src/pages/api/orders/create.ts` (new)

**Intent**: Parse the bracketed form fields into an item array (see "Form field parsing contract" above), validate with zod, call `createOrder`, redirect.

**Contract**: `POST` handler. Zod schema: `store` non-empty string, `orderDate` a valid date string, `items` a non-empty array where each item has non-empty `brand`/`type`, `priceCents` a non-negative integer, `description`/`category` optional (nullable). On validation failure or `createOrder` error, redirect to `/orders/new?error=<message>`. On success, redirect to `/orders`.

### Success Criteria:

#### Automated Verification:

- Type checking passes: `npm run build`
- Linting passes: `npm run lint`

#### Manual Verification:

- Submitting the form with one product creates an order visible on `/orders`
- Submitting with three products (using "Add product" twice) creates one order with three items
- "Remove" on a row removes it from the form before submit
- Submitting with a missing required field (e.g. empty brand) redirects back to `/orders/new` with a visible error, and does not create a partial order

---

## Phase 4: Orders list with status actions — `/orders`

### Overview

The list page that proves the whole point of the product: the computed status, and the ability to change a product's status and watch the order's status update.

### Changes Required:

#### 1. Protect the route

**File**: `src/middleware.ts`

**Intent**: Gate `/orders` behind auth, same as `/dashboard`.

**Contract**: Add `"/orders"` to the `PROTECTED_ROUTES` array.

#### 2. Orders list page

**File**: `src/pages/orders/index.astro` (new)

**Intent**: Server-render the list from `getOrdersWithItems`. Each order shows its computed status label and each item shows its current status plus the status-appropriate action button(s) per `ALLOWED_TRANSITIONS`. Empty state when there are no orders yet, linking to `/orders/new`.

**Contract**: For each item, render a `<form method="POST" action="/api/orders/items/status">` per available action (hidden `itemId` + `newStatus` fields) — e.g. an `awaiting_decision` item shows "Keep" (→`kept`) and "Return" (→`to_be_returned`) as two small forms/buttons.

#### 3. Status-update API route

**File**: `src/pages/api/orders/items/status.ts` (new)

**Intent**: Validate and apply one product's status change.

**Contract**: `POST` handler reading `itemId` and `newStatus` from form data. Zod validates `newStatus` is one of the `ProductStatus` values. Calls `updateItemStatus`; on an invalid-transition or DB error, redirect to `/orders?error=<message>`; on success, redirect to `/orders`.

### Success Criteria:

#### Automated Verification:

- Type checking passes: `npm run build`
- Linting passes: `npm run lint`

#### Manual Verification:

- Order with 2 products, both `awaiting_decision`, shows order status "awaiting decision"
- Setting one product to "kept" and the other to "to be returned" flips the order's displayed status to "ready for return" — without a page reload showing any manual status field, purely from re-deriving on read
- Setting the last non-decided product to "kept" (so all are `kept`/`return_shipped`) flips the order to "completed"
- Reopening a "kept" product back to "to be returned" moves a "completed"-looking order back to "ready for return"
- Marking a "to be returned" product as "return shipped", then reversing it back to "to be returned", both work
- Attempting a request with an invalid transition (e.g. calling the API with a stale `itemId`/`newStatus` combination that skips a step) is rejected, not silently applied

---

## Testing Strategy

### Unit Tests:

- `src/lib/services/order-status.test.ts` (Phase 1) — the only unit tests in the project so far, covering the two pure functions that carry all of this slice's risk.

### Integration Tests:

None — deferred to the module 3 test-planning pass (`/10x-test-plan`), which will decide whether e2e coverage is warranted for the create/status-change flows.

### Manual Testing Steps:

See each phase's Manual Verification above — together they walk the full create → decide → reopen → ship flow described in the PRD's Primary Success Criterion.

## Performance Considerations

None beyond what F-01 already addressed (indexes on the RLS-critical columns). Single-user scale.

## Migration Notes

No schema changes in this plan — F-01's schema is used as-is.

## References

- Roadmap Slice: `context/foundation/roadmap.md` § S-02
- PRD: `context/foundation/prd.md` § Business Logic, § Functional Requirements (FR-002, FR-005, FR-006, FR-007), § User Stories (US-01)
- Transition graph source: `context/foundation/shape-notes.md`
- Foundation this builds on: `context/archive/2026-09-09-order-data-schema/plan.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Business logic — computeOrderStatus and isValidTransition

#### Automated

- [x] 1.1 `npm run build` passes — 1701f76
- [x] 1.2 `npm run lint` passes — 1701f76
- [x] 1.3 `npm run test` passes — 1701f76

### Phase 2: Data access — src/lib/services/orders.ts

#### Automated

- [x] 2.1 `npm run build` passes
- [x] 2.2 `npm run lint` passes

### Phase 3: Create-order form — /orders/new

#### Automated

- [ ] 3.1 `npm run build` passes
- [ ] 3.2 `npm run lint` passes

#### Manual

- [ ] 3.3 One-product order creation works end to end
- [ ] 3.4 Three-product order creation (via Add product) works end to end
- [ ] 3.5 Remove row works before submit
- [ ] 3.6 Missing required field redirects with error, no partial order created

### Phase 4: Orders list with status actions — /orders

#### Automated

- [ ] 4.1 `npm run build` passes
- [ ] 4.2 `npm run lint` passes

#### Manual

- [ ] 4.3 Two awaiting-decision products show order status "awaiting decision"
- [ ] 4.4 Setting kept + to-be-returned flips order status to "ready for return"
- [ ] 4.5 All-decided (kept/return_shipped only) flips order status to "completed"
- [ ] 4.6 Reopening kept → to_be_returned moves a completed-looking order back to "ready for return"
- [ ] 4.7 Return shipped, then reversed back to to_be_returned, both work
- [ ] 4.8 Invalid transition is rejected, not silently applied
