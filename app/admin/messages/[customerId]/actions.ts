"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function sendAdminMessage(
  formData: FormData
) {
  const customerId = String(
    formData.get("customer_id") ?? ""
  ).trim();

  const body = String(
    formData.get("body") ?? ""
  ).trim();

  if (!customerId) {
    throw new Error(
      "Customer ID is required."
    );
  }

  if (!body) {
    throw new Error(
      "Please enter a message."
    );
  }

  const supabase = await createClient();

  const { error: messageError } =
    await supabase.rpc(
      "admin_send_message",
      {
        p_customer_id: customerId,
        p_body: body,
      }
    );

  if (messageError) {
    throw new Error(messageError.message);
  }

  const { error: notificationError } =
    await supabase.rpc(
      "admin_notify_customer_message",
      {
        p_customer_id: customerId,
        p_body: body,
      }
    );

  if (notificationError) {
    throw new Error(
      notificationError.message
    );
  }

  revalidatePath("/admin");
  revalidatePath("/admin/messages");
  revalidatePath(
    `/admin/messages/${customerId}`
  );

  revalidatePath("/customer");
  revalidatePath("/customer/messages");

  redirect(
    `/admin/messages/${customerId}?saved=sent`
  );
}