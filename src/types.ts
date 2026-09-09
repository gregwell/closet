// Shared types for the domain model defined in
// supabase/migrations/20260909132811_create_orders_and_order_items.sql

export type ProductStatus =
  | "in_transit"
  | "awaiting_decision"
  | "kept"
  | "to_be_returned"
  | "return_shipped"
  | "return_received";

export interface Order {
  id: string;
  userId: string;
  store: string;
  orderDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  brand: string;
  type: string;
  priceCents: number;
  description: string | null;
  category: string | null;
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
}
