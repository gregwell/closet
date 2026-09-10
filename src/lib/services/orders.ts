/* eslint-disable @typescript-eslint/no-unnecessary-condition, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument --
 * Supabase's {data,error} discriminated union doesn't narrow cleanly against our hand-written
 * Database type (no `Relationships` metadata, since this project doesn't link the Supabase CLI).
 * The runtime contract is real (Supabase can return a non-null error on any of these calls) —
 * this is a known friction point with hand-rolled Database types, not a bug in this file's logic. */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { Order, OrderItem, OrderStatus, ProductStatus } from "@/types";
import { computeOrderStatus, isValidTransition } from "./order-status";

interface OrderItemRow {
  id: string;
  order_id: string;
  brand: string;
  type: string;
  price_cents: number;
  description: string | null;
  category: string | null;
  status: ProductStatus;
  created_at: string;
  updated_at: string;
}

interface OrderRow {
  id: string;
  user_id: string;
  store: string;
  order_date: string;
  created_at: string;
  updated_at: string;
  order_items?: OrderItemRow[];
}

function mapOrderRow(row: OrderRow): Order {
  return {
    id: row.id,
    userId: row.user_id,
    store: row.store,
    orderDate: row.order_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapOrderItemRow(row: OrderItemRow): OrderItem {
  return {
    id: row.id,
    orderId: row.order_id,
    brand: row.brand,
    type: row.type,
    priceCents: row.price_cents,
    description: row.description,
    category: row.category,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface OrderWithItems {
  order: Order;
  items: OrderItem[];
  status: OrderStatus;
}

export async function getOrdersWithItems(supabase: SupabaseClient<Database>): Promise<OrderWithItems[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .order("order_date", { ascending: false });

  if (error || !data) {
    return [];
  }

  const results = (data as OrderRow[]).map((row) => {
    const items = (row.order_items ?? []).map(mapOrderItemRow);
    return {
      order: mapOrderRow(row),
      items,
      status: computeOrderStatus(items.map((item) => item.status)),
    };
  });

  // Unresolved orders surface before finished ones (FR-005).
  return results.sort((a, b) => Number(a.status === "completed") - Number(b.status === "completed"));
}

export interface CreateOrderItemInput {
  brand: string;
  type: string;
  priceCents: number;
  description: string | null;
  category: string | null;
}

export interface CreateOrderInput {
  store: string;
  orderDate: string;
  items: CreateOrderItemInput[];
}

export async function createOrder(
  supabase: SupabaseClient<Database>,
  input: CreateOrderInput,
): Promise<{ error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({ user_id: user.id, store: input.store, order_date: input.orderDate })
    .select("id")
    .single();

  if (orderError || !order) {
    return { error: orderError?.message ?? "Failed to create order" };
  }

  // Not wrapped in a DB transaction: a failure here leaves an order with zero
  // items. Accepted for this MVP (single user, low stakes) rather than adding
  // a Postgres function for atomicity.
  const { error: itemsError } = await supabase.from("order_items").insert(
    input.items.map((item) => ({
      order_id: order.id,
      brand: item.brand,
      type: item.type,
      price_cents: item.priceCents,
      description: item.description,
      category: item.category,
      status: "awaiting_decision" satisfies ProductStatus,
    })),
  );

  if (itemsError) {
    return { error: itemsError.message };
  }

  return { error: null };
}

export async function updateItemStatus(
  supabase: SupabaseClient<Database>,
  itemId: string,
  newStatus: ProductStatus,
): Promise<{ error: string | null }> {
  const { data: current, error: fetchError } = await supabase
    .from("order_items")
    .select("status")
    .eq("id", itemId)
    .single();

  if (fetchError || !current) {
    return { error: fetchError?.message ?? "Item not found" };
  }

  if (!isValidTransition(current.status, newStatus)) {
    return { error: `Cannot change status from ${current.status} to ${newStatus}` };
  }

  const { error: updateError } = await supabase.from("order_items").update({ status: newStatus }).eq("id", itemId);

  if (updateError) {
    return { error: updateError.message };
  }

  return { error: null };
}
