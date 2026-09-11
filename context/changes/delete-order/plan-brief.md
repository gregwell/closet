# Delete Order — Plan Brief

> Full plan: `context/changes/delete-order/plan.md`

## What & Why

The user needs to remove an order they no longer want to track. This is the last CRUD gap: Create/Read/Update already exist (S-02); this slice adds Delete, completing full CRUD on the `orders` domain per FR-004.

## Starting Point

RLS delete policies (`orders_delete_own`, `order_items_delete_own`) and an `on delete cascade` FK from `order_items` to `orders` already exist from F-01 — the database layer fully supports this today. Nothing in the app currently calls delete; there's no route, no service function, no UI trigger.

## Desired End State

Every order card on `/orders` has a "Delete" button. Clicking it triggers a native browser confirmation naming the action as irreversible; confirming removes the order and all its products, and the list updates immediately.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Confirmation UX | Native `window.confirm()` via inline `onsubmit` | Zero new dependencies, no React island — matches AGENTS.md's minimal-JS bias and the project's existing plain-form pattern | Plan (user-confirmed) |
| Status scope | Deletable in any status (Active or Completed) | FR-004 doesn't restrict by status; single-user tool, no need for extra business rule | Plan (user-confirmed) |
| Authorization | Explicit ownership check + RLS (defense-in-depth) | Mirrors `updateItemStatus`'s pattern, established as the project's expected mutation-safety convention during S-02's impl-review (finding F1) | Plan |
| New migration | None | RLS delete policies and cascade FK already exist from F-01 | Plan |
| New unit tests | None | No new business logic — straight authorize-then-delete, no branching to test | Plan |

## Scope

**In scope:** `deleteOrder` service function, `POST /api/orders/delete` route, Delete button + confirm on `OrderCard.astro`.

**Out of scope:** Soft-delete/undo/trash, status-based delete restrictions, new migrations, new unit tests.

## Architecture / Approach

Same three-layer shape as every other mutation in this codebase: native HTML form → Astro `APIRoute` (zod-validated) → service function in `src/lib/services/orders.ts` (explicit ownership check, then the actual Supabase call). Cascade delete handles `order_items` cleanup automatically.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Delete service + API route | Server-side delete, authorized and RLS-backed | Low — mirrors an existing, reviewed pattern (`updateItemStatus`) almost exactly |
| 2. Delete button + confirm | User-facing trigger with irreversibility warning | Low — plain HTML, no new client-side framework surface |

**Prerequisites:** S-02 (order-status-computation) done — provides the `orders`/`order_items` service layer and API-route conventions this mirrors.
**Estimated effort:** ~30-45 minutes across 2 phases.

## Open Risks & Assumptions

- None significant — this slice is close to the smallest possible increment given RLS and cascade are already in place from F-01.

## Success Criteria (Summary)

- User can delete an order (any status) from the Orders list after confirming.
- The order and all its items are gone from the database and the UI immediately after.
- Attempting to delete something not owned by the user, or that doesn't exist, fails safely with an error message, not a crash.
