# Delete Order Implementation Plan

## Overview

Completes CRUD on the `orders` domain (Create/Read/Update already exist via S-02) by letting a user permanently delete an order — and, by cascade, all of its items — from the Orders list. This is the last roadmap slice needed to satisfy the "all 4 CRUD operations on persisted data" project requirement.

## Current State Analysis

- **RLS delete policies already exist** (from F-01, `supabase/migrations/20260909132811_create_orders_and_order_items.sql:34,43`): `orders_delete_own` (`user_id = auth.uid()`) and `order_items_delete_own` (ownership via parent order). Both are pinned `to authenticated` (`20260909155518_order_schema_review_fixes.sql:13,17`). **No new migration is needed.**
- **Cascade already wired**: `order_items.order_id` references `orders(id) on delete cascade` (`20260909132811_create_orders_and_order_items.sql:15`) — deleting an order row deletes its items automatically at the DB level.
- **Established request pattern** (from S-02): native `<form method="POST" action="/api/...">` with hidden inputs → Astro `APIRoute` parses `FormData`, validates with zod, calls a `src/lib/services/orders.ts` function, redirects to `/orders` (with `?error=` on failure). See `src/pages/api/orders/items/status.ts` and `updateItemStatus` in `src/lib/services/orders.ts:151-196` as the template — including its explicit ownership check (fetch the row, compare `user_id` to `auth.getUser()`) as defense-in-depth alongside RLS, which this plan mirrors for consistency (impl-review F1 established this as the project's expected pattern for any mutation on someone else's potential data).
- `/api/orders` is already covered by `PROTECTED_ROUTES` in `src/middleware.ts:4` — no route-protection change needed.
- `OrderCard.astro` (`src/components/orders/OrderCard.astro`) currently renders store/date, an order-status pill, and per-item status-transition buttons. It has no destructive action yet.

## Desired End State

From the Orders list, each order card has a "Delete" button. Clicking it shows a native browser confirmation (`window.confirm`) naming the action as irreversible; confirming submits a POST that deletes the order (and its items, via cascade) and redirects back to `/orders`. Available on orders in any status (Active or Completed) — FR-004 doesn't restrict by status, and PRD non-goals treat this as a simple, single-user, no-undo action.

### Key Discoveries:

- RLS + cascade already fully support this at the DB layer (see Current State Analysis) — this plan is pure application-layer wiring.
- The confirm-before-destructive-action UX doesn't need React or a `client:*` island: a plain `onsubmit="return confirm(...)"` attribute on the native `<form>` is sufficient and matches AGENTS.md's "React only where interactivity is needed" / "no Next.js directives" bias toward minimal JS.

## What We're NOT Doing

- No soft-delete / undo / trash. PRD accepts hard delete without confirmation-page ceremony for a single-user tool.
- No restriction on which order statuses can be deleted (Active and Completed both allowed).
- No new database migration — existing RLS delete policies and the cascade FK already cover this.
- No new unit tests — this slice adds no new business logic (no branching, no computed values); it's a straight authorize-then-delete operation already covered by RLS at the data layer. (Contrast with S-02's `computeOrderStatus`/`isValidTransition`, which is why those got dedicated unit tests.)

## Implementation Approach

Two phases: (1) the data-access + API route (server-side delete, mirroring `updateItemStatus`'s ownership-check pattern), (2) the UI trigger (Delete button + native confirm on `OrderCard.astro`).

## Phase 1: Delete service function + API route

### Overview

Adds `deleteOrder` to the orders service layer and a `POST /api/orders/delete` route that validates the request and calls it.

### Changes Required:

#### 1. Delete service function

**File**: `src/lib/services/orders.ts`

**Intent**: Authorize and delete an order by id, mirroring `updateItemStatus`'s explicit-ownership-check-plus-RLS pattern (fetch the order, compare `user_id` to the authenticated user, then delete; RLS is defense-in-depth, not the sole gate).

**Contract**: `export async function deleteOrder(supabase: SupabaseClient<Database>, orderId: string): Promise<{ error: string | null }>`. Same three-stage shape as `updateItemStatus`: (a) `auth.getUser()` → `"Not authenticated"` if absent; (b) fetch `orders` row by `id` selecting `user_id` → `"Order not found"` if missing, `"Not authorized to delete this order"` if `user_id` doesn't match; (c) `supabase.from("orders").delete().eq("id", orderId)` → surface `error.message` on failure, else `{ error: null }`. No item-count check needed — cascade handles `order_items` deletion at the DB level.

#### 2. API route

**File**: `src/pages/api/orders/delete.ts`

**Intent**: Parse the delete request, validate the id, call `deleteOrder`, redirect.

**Contract**: `export const POST: APIRoute`, following the exact shape of `src/pages/api/orders/items/status.ts` (create the Supabase client, `safeParse` a zod schema `{ orderId: z.string().min(1) }` against `context.request.formData()`, redirect to `/orders?error=...` on either a Supabase-not-configured or validation failure, call `deleteOrder`, redirect to `/orders?error=...` on service error, else redirect to `/orders`).

### Success Criteria:

#### Automated Verification:

- [ ] Build passes: `npm run build`
- [ ] Lint passes: `npm run lint`
- [ ] Existing unit tests still pass: `npm test -- --run` (13/13, unrelated to this change but must not regress)

#### Manual Verification:

- [ ] Deleting an order owned by the signed-in user removes it (and its items) and redirects to `/orders`
- [ ] Attempting to delete a nonexistent order id redirects to `/orders` with an error message, not a 500

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Delete button on OrderCard with confirmation

### Overview

Wires the route into the UI: a "Delete" button on every order card, gated by a native browser confirm dialog.

### Changes Required:

#### 1. Delete button + confirm

**File**: `src/components/orders/OrderCard.astro`

**Intent**: Add a visually-distinct (destructive) "Delete" action to the card header, available regardless of order status, that asks for confirmation before submitting.

**Contract**: A `<form method="POST" action="/api/orders/delete" onsubmit="return confirm('Delete this order and all its products? This cannot be undone.')">` containing a hidden `orderId` input (`order.id`) and a submit button styled as destructive (e.g. red-tinted border/text, distinct from the neutral status-transition buttons already in this component). Placed in the card's header row, next to the existing status pill.

### Success Criteria:

#### Automated Verification:

- [ ] Build passes: `npm run build`
- [ ] Lint passes: `npm run lint`

#### Manual Verification:

- [ ] Delete button visible on both Active and Completed order cards
- [ ] Clicking Delete shows a browser confirm dialog naming the action as irreversible
- [ ] Cancelling the confirm dialog leaves the order untouched
- [ ] Confirming deletes the order and its products; it disappears from the list (Active or Completed count decrements)

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Testing Strategy

### Unit Tests:

- None new — see "What We're NOT Doing".

### Manual Testing Steps:

1. Sign in, open `/orders`, note an existing order with items.
2. Click Delete on that order's card → confirm dialog appears → cancel → order still present.
3. Click Delete again → confirm → order and its items are gone from `/orders` and from the database (verify via Supabase Studio if desired).
4. Repeat for both an Active-status order and a Completed-status order.

## Performance Considerations

None — single-row delete with cascade, no pagination or bulk operations in scope.

## Migration Notes

None — no schema change; RLS delete policies and the `order_items` cascade FK already exist from F-01.

## References

- Prior implementation: `src/lib/services/orders.ts:151-196` (`updateItemStatus`, the ownership-check pattern this mirrors)
- Prior API route: `src/pages/api/orders/items/status.ts` (the route shape this mirrors)
- RLS policies: `supabase/migrations/20260909132811_create_orders_and_order_items.sql:34,43`, `supabase/migrations/20260909155518_order_schema_review_fixes.sql:13,17`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Delete service function + API route

#### Automated

- [x] 1.1 Build passes
- [x] 1.2 Lint passes
- [x] 1.3 Existing unit tests still pass (13/13)

#### Manual

- [x] 1.4 Deleting an owned order removes it + items, redirects to /orders
- [ ] 1.5 Deleting a nonexistent order id shows an error, not a 500

### Phase 2: Delete button on OrderCard with confirmation

#### Automated

- [x] 2.1 Build passes
- [x] 2.2 Lint passes

#### Manual

- [x] 2.3 Delete button visible on Active and Completed cards
- [x] 2.4 Confirm dialog names the action as irreversible
- [x] 2.5 Cancelling leaves the order untouched
- [x] 2.6 Confirming deletes the order and its products from the list
