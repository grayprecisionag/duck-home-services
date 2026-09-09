"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();

  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims?.sub) {
    redirect("/login");
  }

  const userId = claimsData.claims.sub;

  const { data: profile, error: profileError } =
    await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

  if (
    profileError ||
    !profile ||
    profile.role !== "admin"
  ) {
    redirect("/");
  }

  return supabase;
}

export async function quoteServiceRequest(
  formData: FormData
) {
  const supabase = await requireAdmin();

  const requestId = String(
    formData.get("request_id") ?? ""
  ).trim();

  const quotedPrice = String(
    formData.get("quoted_price") ?? ""
  ).trim();

  const adminNotes = String(
    formData.get("admin_notes") ?? ""
  ).trim();

  if (!requestId) {
    throw new Error(
      "Service request ID is required."
    );
  }

  if (!quotedPrice) {
    throw new Error(
      "Please enter a quoted price."
    );
  }

  const priceNumber = Number(quotedPrice);

  if (
    Number.isNaN(priceNumber) ||
    priceNumber < 0
  ) {
    throw new Error(
      "Please enter a valid quoted price."
    );
  }

  const quotedPriceCents = Math.round(
    priceNumber * 100
  );

  const { data: request, error: requestError } =
    await supabase
      .from("custom_service_requests")
      .select("id, status")
      .eq("id", requestId)
      .single();

  if (requestError || !request) {
    throw new Error(
      requestError?.message ??
        "Service request not found."
    );
  }

  if (
    request.status !== "pending" &&
    request.status !== "quoted"
  ) {
    throw new Error(
      "This request can no longer be quoted."
    );
  }

  const { error } = await supabase
    .from("custom_service_requests")
    .update({
      quoted_price_cents: quotedPriceCents,
      admin_notes: adminNotes || null,
      status: "quoted",
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(
    "/admin/service-requests"
  );
  revalidatePath(
    "/customer/request-service"
  );
  revalidatePath("/customer");

  redirect(
    "/admin/service-requests?saved=quoted"
  );
}

export async function approveServiceRequest(
  formData: FormData
) {
  const supabase = await requireAdmin();

  const requestId = String(
    formData.get("request_id") ?? ""
  ).trim();

  const scheduledDate = String(
    formData.get("scheduled_date") ?? ""
  ).trim();

  const scheduledTime = String(
    formData.get("scheduled_time") ?? ""
  ).trim();

  if (!requestId) {
    throw new Error(
      "Service request ID is required."
    );
  }

  if (!scheduledDate) {
    throw new Error(
      "Please choose a scheduled date."
    );
  }

  const { data: request, error: requestError } =
    await supabase
      .from("custom_service_requests")
      .select(`
        id,
        customer_id,
        title,
        description,
        quoted_price_cents,
        admin_notes,
        status
      `)
      .eq("id", requestId)
      .single();

  if (requestError || !request) {
    throw new Error(
      requestError?.message ??
        "Service request not found."
    );
  }

  if (request.status !== "accepted") {
    throw new Error(
      "The customer must accept the quote before this job can be scheduled."
    );
  }

  if (
    request.quoted_price_cents === null ||
    request.quoted_price_cents === undefined
  ) {
    throw new Error(
      "This request does not have a quoted price."
    );
  }

  const notes = [
    `Custom Service: ${request.title}`,
    request.description,
    request.admin_notes
      ? `Admin Notes: ${request.admin_notes}`
      : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  const { data: job, error: jobError } =
    await supabase
      .from("jobs")
      .insert({
        customer_id: request.customer_id,
        service_id: null,
        scheduled_date: scheduledDate,
        scheduled_time:
          scheduledTime || null,
        status: "scheduled",
        price_cents:
          request.quoted_price_cents,
        notes,
      })
      .select("id")
      .single();

  if (jobError || !job) {
    throw new Error(
      jobError?.message ??
        "Unable to create scheduled job."
    );
  }

  const { error: updateError } =
    await supabase
      .from("custom_service_requests")
      .update({
        status: "approved",
        created_job_id: job.id,
        reviewed_at:
          new Date().toISOString(),
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", requestId)
      .eq("status", "accepted");

  if (updateError) {
    throw new Error(updateError.message);
  }

  revalidatePath(
    "/admin/service-requests"
  );
  revalidatePath("/admin/schedule");
  revalidatePath(
    "/customer/request-service"
  );
  revalidatePath("/customer");

  redirect(
    "/admin/service-requests?saved=approved"
  );
}

export async function declineServiceRequest(
  formData: FormData
) {
  const supabase = await requireAdmin();

  const requestId = String(
    formData.get("request_id") ?? ""
  ).trim();

  if (!requestId) {
    throw new Error(
      "Service request ID is required."
    );
  }

  const { data: request, error: requestError } =
    await supabase
      .from("custom_service_requests")
      .select("id, status")
      .eq("id", requestId)
      .single();

  if (requestError || !request) {
    throw new Error(
      requestError?.message ??
        "Service request not found."
    );
  }

  if (
    request.status !== "pending" &&
    request.status !== "quoted"
  ) {
    throw new Error(
      "This request can no longer be declined by admin."
    );
  }

  const { error } = await supabase
    .from("custom_service_requests")
    .update({
      status: "declined",
      reviewed_at:
        new Date().toISOString(),
      updated_at:
        new Date().toISOString(),
    })
    .eq("id", requestId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(
    "/admin/service-requests"
  );
  revalidatePath(
    "/customer/request-service"
  );
  revalidatePath("/customer");

  redirect(
    "/admin/service-requests?saved=declined"
  );
}