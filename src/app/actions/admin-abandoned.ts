"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";

const idSchema = z.coerce.number().int().positive();

/** Marks a saved checkout as contacted (or puts it back to needing follow-up). */
export async function setCheckoutContacted(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = idSchema.parse(formData.get("id"));
  const contacted = formData.get("contacted") === "1";
  await supabase
    .from("abandoned_checkouts")
    .update(contacted ? { status: "contacted", contacted_at: new Date().toISOString() } : { status: "open", contacted_at: null })
    .eq("id", id)
    // A checkout that became an order stays recovered.
    .neq("status", "recovered");
  revalidatePath("/admin/abandoned");
}

/** Removes a saved checkout, for example once the customer has asked for their details to be deleted. */
export async function deleteAbandonedCheckout(formData: FormData) {
  const { supabase } = await requireAdmin();
  await supabase.from("abandoned_checkouts").delete().eq("id", idSchema.parse(formData.get("id")));
  revalidatePath("/admin/abandoned");
}
