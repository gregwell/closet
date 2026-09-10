import type { APIRoute } from "astro";
import { z } from "zod";
import { createClient } from "@/lib/supabase";
import { createOrder } from "@/lib/services/orders";

const itemSchema = z.object({
  brand: z.string().trim().min(1, "Brand is required"),
  type: z.string().trim().min(1, "Type is required"),
  priceCents: z.coerce.number().int().min(0, "Price cannot be negative"),
  description: z
    .string()
    .trim()
    .optional()
    .transform((v) => {
      if (!v) return null;
      return v;
    }),
  category: z
    .string()
    .trim()
    .optional()
    .transform((v) => {
      if (!v) return null;
      return v;
    }),
});

const orderSchema = z.object({
  store: z.string().trim().min(1, "Store is required"),
  orderDate: z.string().trim().min(1, "Order date is required"),
  items: z.array(itemSchema).min(1, "Add at least one product"),
});

// Groups bracketed keys (items[0][brand], items[1][brand], ...) into an array
// of item objects. Indices don't need to be contiguous.
function groupItemsFromFormData(form: FormData): Record<string, string>[] {
  const byIndex: Record<string, Record<string, string>> = {};
  const pattern = /^items\[(\d+)]\[(\w+)]$/;

  for (const [key, value] of form.entries()) {
    const match = pattern.exec(key);
    if (!match || typeof value !== "string") continue;
    const [, index, field] = match;
    byIndex[index] ??= {};
    byIndex[index][field] = value;
  }

  return Object.keys(byIndex)
    .sort((a, b) => Number(a) - Number(b))
    .map((index) => byIndex[index]);
}

export const POST: APIRoute = async (context) => {
  const form = await context.request.formData();

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return context.redirect(`/orders/new?error=${encodeURIComponent("Supabase is not configured")}`);
  }

  const parsed = orderSchema.safeParse({
    store: form.get("store"),
    orderDate: form.get("orderDate"),
    items: groupItemsFromFormData(form),
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid input";
    return context.redirect(`/orders/new?error=${encodeURIComponent(message)}`);
  }

  const { error } = await createOrder(supabase, parsed.data);
  if (error) {
    return context.redirect(`/orders/new?error=${encodeURIComponent(error)}`);
  }

  return context.redirect("/orders");
};
