---
change_id: delete-order
title: User can delete an order they no longer want to track
status: implementing
created: 2026-09-11
updated: 2026-09-11
archived_at: null
---

## Notes

Roadmap Slice S-04 (context/foundation/roadmap.md, milestone M-1). FR-004, depends on S-02 (order-status-computation, done). Completes CRUD to 4/4 (Create/Read/Update already delivered via S-02; this adds Delete). Per PRD's deliberate simplicity decision for a single-user tool: deletion is a destructive action without soft-delete/undo, gated behind a confirmation step in the UI.
