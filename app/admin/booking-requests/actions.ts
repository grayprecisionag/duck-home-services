"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    redirect("/");
  }

  return supabase;
}

export async function approveBookingRequest(
  formData: FormData
) {
  const requestId = String(
    formData.get("request_id") ?? ""
  ).trim();

  if (!requestId) {
    throw new Error("Booking request is missing.");
  }

  const supabase = await requireAdmin();

  const { data: request, error: requestError } =
    await supabase
      .from("booking_requests")
      .select(`
        id,
        customer_id,
        service_id,
        request_type,
        preferred_date,
        preferred_time,
        notes,
        status
      `)
      .eq("id", requestId)
      .single();

  if (requestError || !request) {
    throw new Error(
      requestError?.message ??
        "Booking request could not be found."
    );
  }

  if (request.status !== "pending") {
    throw new Error(
      "This booking request has already been reviewed."
    );
  }

  const { data: service, error: serviceError } =
    await supabase
      .from("services")
      .select(`
        id,
        name,
        price_cents
      `)
      .eq("id", request.service_id)
      .single();

  if (serviceError || !service) {
    throw new Error(
      serviceError?.message ??
        "The requested service could not be found."
    );
  }

  if (request.request_type === "recurring") {
    const startDate = request.preferred_date;

    const startDateObject = new Date(
      `${startDate}T00:00:00Z`
    );

    const serviceDay =
      startDateObject.getUTCDay();

    const {
      data: subscription,
      error: subscriptionError,
    } = await supabase
      .from("subscriptions")
      .insert({
        customer_id: request.customer_id,
        service_id: request.service_id,
        name: service.name,
        price_cents: service.price_cents,
        billing_frequency: "monthly",
        service_frequency: "monthly",
        service_day: serviceDay,
        start_date: startDate,
        next_service_date: startDate,
        next_invoice_date: startDate,
        notes: request.notes || null,
        is_active: true,
      })
      .select("id")
      .single();

    if (subscriptionError || !subscription) {
      throw new Error(
        subscriptionError?.message ??
          "Subscription could not be created."
      );
    }

    const { error: updateError } =
      await supabase
        .from("booking_requests")
        .update({
          status: "approved",
          created_subscription_id:
            subscription.id,
          reviewed_at:
            new Date().toISOString(),
        })
        .eq("id", requestId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    revalidatePath(
      "/admin/booking-requests"
    );
    revalidatePath(
      "/admin/subscriptions"
    );
    revalidatePath("/customer");

    redirect(
      "/admin/booking-requests?saved=approved"
    );
  }

  const { data: job, error: jobError } =
    await supabase
      .from("jobs")
      .insert({
        customer_id: request.customer_id,
        service_id: request.service_id,
        scheduled_date:
          request.preferred_date,
        scheduled_time:
          request.preferred_time || null,
        status: "scheduled",
        price_cents: service.price_cents,
        notes: request.notes || null,
      })
      .select("id")
      .single();

  if (jobError || !job) {
    throw new Error(
      jobError?.message ??
        "Job could not be created."
    );
  }

  const { error: updateError } =
    await supabase
      .from("booking_requests")
      .update({
        status: "approved",
        created_job_id: job.id,
        reviewed_at:
          new Date().toISOString(),
      })
      .eq("id", requestId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  revalidatePath(
    "/admin/booking-requests"
  );
  revalidatePath("/admin/schedule");
  revalidatePath("/customer");

  redirect(
    "/admin/booking-requests?saved=approved"
  );
}

export async function declineBookingRequest(
  formData: FormData
) {
  const requestId = String(
    formData.get("request_id") ?? ""
  ).trim();

  if (!requestId) {
    throw new Error("Booking request is missing.");
  }

  const supabase = await requireAdmin();

  const { data: request } =
    await supabase
      .from("booking_requests")
      .select("status")
      .eq("id", requestId)
      .single();

  if (!request) {
    throw new Error(
      "Booking request could not be found."
    );
  }

  if (request.status !== "pending") {
    throw new Error(
      "This booking request has already been reviewed."
    );
  }

  const { error } = await supabase
    .from("booking_requests")
    .update({
      status: "declined",
      reviewed_at:
        new Date().toISOString(),
    })
    .eq("id", requestId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(
    "/admin/booking-requests"
  );
  revalidatePath("/customer");

  redirect(
    "/admin/booking-requests?saved=declined"
  );
}