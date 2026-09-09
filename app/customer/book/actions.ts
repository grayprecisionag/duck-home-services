"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createBookingRequest(formData: FormData) {
  const supabase = await createClient();

  const serviceId = String(
    formData.get("service_id") ?? ""
  ).trim();

  const requestType = String(
    formData.get("request_type") ?? "one_time"
  ).trim();

  const preferredDate = String(
    formData.get("preferred_date") ?? ""
  ).trim();

  const preferredTime = String(
    formData.get("preferred_time") ?? ""
  ).trim();

  const notes = String(
    formData.get("notes") ?? ""
  ).trim();

  if (!serviceId || !preferredDate) {
    throw new Error(
      "Service and preferred date are required."
    );
  }

  if (
    requestType !== "one_time" &&
    requestType !== "recurring"
  ) {
    throw new Error("Invalid booking type.");
  }

  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims?.sub) {
    redirect("/login");
  }

  const userId = claimsData.claims.sub;

  const { data: customer, error: customerError } =
    await supabase
      .from("customers")
      .select("id")
      .eq("profile_id", userId)
      .single();

  if (customerError || !customer) {
    throw new Error(
      "Your customer account is not linked."
    );
  }

  const { data: service, error: serviceError } =
    await supabase
      .from("services")
      .select("id, is_active")
      .eq("id", serviceId)
      .single();

  if (
    serviceError ||
    !service ||
    !service.is_active
  ) {
    throw new Error(
      "This service is not currently available."
    );
  }

  const { error } = await supabase
    .from("booking_requests")
    .insert({
      customer_id: customer.id,
      service_id: serviceId,
      request_type: requestType,
      preferred_date: preferredDate,
      preferred_time: preferredTime || null,
      notes: notes || null,
      status: "pending",
    });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/customer");
  revalidatePath("/customer/book");

  redirect("/customer/book?saved=requested");
}