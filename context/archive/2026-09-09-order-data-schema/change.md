---
change_id: order-data-schema
title: Add order/product data schema with per-user RLS
status: archived
created: 2026-09-09
updated: 2026-09-09
archived_at: 2026-09-09T14:01:11Z
---

## Notes

Roadmap Foundation F-01 (context/foundation/roadmap.md, milestone M-1). Minimal schema for orders and their products, with RLS so each row is visible only to the user who owns it. Unlocks S-02 (order-status-computation), S-03 (mark-return-shipped), S-04 (delete-order). No business logic here — just the tables and access policy that those slices build on.
