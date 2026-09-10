"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createCustomServiceRequest(
  formData: FormData
) {
  const title = String(
    formData.get("title") ?? ""
  ).trim();

  const description = String(
    formData.get("description") ?? ""
  ).trim();

  const preferredDate = String(
    formData.get("preferred_date") ?? ""
  ).trim();

  const preferredTime = String(
    formData.get("preferred_time") ?? ""
  ).trim();

  if (!title) {
    throw new Error(
      "Please enter a name for the service you need."
    );
  }

  if (!description) {
    throw new Error(
      "Please describe the service you need."
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

  const { data: customer, error: customerError } =
    await supabase
      .from("customers")
      .select("id")
      .eq("profile_id", user.id)
      .single();

  if (customerError || !customer) {
    throw new Error(
      "Your customer account is not linked."
    );
  }

  const { error } = await supabase
    .from("custom_service_requests")
    .insert({
      customer_id: customer.id,
      title,
      description,
      preferred_date:
        preferredDate || null,
      preferred_time:
        preferredTime || null,
      status: "pending",
    });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/customer");
  revalidatePath(
    "/customer/request-service"
  );
  revalidatePath("/admin");
  revalidatePath(
    "/admin/service-requests"
  );

  redirect(
    "/customer/request-service?saved=requested"
  );
}

export async function acceptCustomServiceQuote(
  formData: FormData
) {
  const requestId = String(
    formData.get("request_id") ?? ""
  ).trim();

  if (!requestId) {
    throw new Error(
      "Service request ID is required."
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
    "accept_custom_service_quote",
    {
      p_request_id: requestId,
    }
  );

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/customer");
  revalidatePath(
    "/customer/request-service"
  );
  revalidatePath("/admin");
  revalidatePath(
    "/admin/service-requests"
  );

  redirect(
    "/customer/request-service?saved=accepted"
  );
}

export async function declineCustomServiceQuote(
  formData: FormData
) {
  const requestId = String(
    formData.get("request_id") ?? ""
  ).trim();

  if (!requestId) {
    throw new Error(
      "Service request ID is required."
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
    "decline_custom_service_quote",
    {
      p_request_id: requestId,
    }
  );

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/customer");
  revalidatePath(
    "/customer/request-service"
  );
  revalidatePath("/admin");
  revalidatePath(
    "/admin/service-requests"
  );

  redirect(
    "/customer/request-service?saved=declined"
  );
}