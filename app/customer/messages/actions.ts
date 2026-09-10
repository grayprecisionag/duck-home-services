"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function sendCustomerMessage(
  formData: FormData
) {
  const body = String(
    formData.get("body") ?? ""
  ).trim();

  if (!body) {
    throw new Error(
      "Please enter a message."
    );
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { error } = await supabase.rpc(
    "customer_send_message",
    {
      p_body: body,
    }
  );

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/customer/messages");
  revalidatePath("/customer");

  redirect("/customer/messages?saved=sent");
}