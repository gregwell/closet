import type { APIRoute } from "astro";
import { z } from "zod";
import { createClient } from "@/lib/supabase";
import { updateItemStatus } from "@/lib/services/orders";

const statusUpdateSchema = z.object({
  itemId: z.string().min(1),
  newStatus: z.enum(["in_transit", "awaiting_decision", "kept", "to_be_returned", "return_shipped", "return_received"]),
});

export const POST: APIRoute = async (context) => {
  const form = await context.request.formData();

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return context.redirect(`/orders?error=${encodeURIComponent("Supabase is not configured")}`);
  }

  const parsed = statusUpdateSchema.safeParse({
    itemId: form.get("itemId"),
    newStatus: form.get("newStatus"),
  });

  if (!parsed.success) {
    return context.redirect(`/orders?error=${encodeURIComponent("Invalid status update request")}`);
  }

  const { error } = await updateItemStatus(supabase, parsed.data.itemId, parsed.data.newStatus);
  if (error) {
    return context.redirect(`/orders?error=${encodeURIComponent(error)}`);
  }

  return context.redirect("/orders");
};
