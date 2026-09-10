import type { OrderStatus, ProductStatus } from "@/types";

// The core domain rule (PRD § Business Logic): an order's status is never set
// directly — it is always derived from the current statuses of its products.
export function computeOrderStatus(items: ProductStatus[]): OrderStatus {
  if (items.some((s) => s === "in_transit")) return "awaiting_delivery";
  if (items.some((s) => s === "awaiting_decision")) return "awaiting_decision";
  if (items.some((s) => s === "to_be_returned")) return "ready_for_return";
  return "completed";
}

// Transition graph locked during /10x-shape's Socratic rounds (see
// context/foundation/shape-notes.md). `in_transit` and `return_received` are
// not reachable through this slice's UI and have no outgoing edges here.
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
