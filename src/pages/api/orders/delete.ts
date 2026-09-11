import type { APIRoute } from "astro";
import { z } from "zod";
import { createClient } from "@/lib/supabase";
import { deleteOrder } from "@/lib/services/orders";

const deleteSchema = z.object({
  orderId: z.string().min(1),
});

export const POST: APIRoute = async (context) => {
  const form = await context.request.formData();

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return context.redirect(`/orders?error=${encodeURIComponent("Supabase is not configured")}`);
  }

  const parsed = deleteSchema.safeParse({
    orderId: form.get("orderId"),
  });

  if (!parsed.success) {
    return context.redirect(`/orders?error=${encodeURIComponent("Invalid delete request")}`);
  }

  const { error } = await deleteOrder(supabase, parsed.data.orderId);
  if (error) {
    return context.redirect(`/orders?error=${encodeURIComponent(error)}`);
  }

  return context.redirect("/orders");
};
