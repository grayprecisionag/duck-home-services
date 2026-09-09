"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createSubscription(formData: FormData) {
  const supabase = await createClient();

  const customerId = String(formData.get("customer_id") ?? "").trim();
  const serviceId = String(formData.get("service_id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const priceInput = String(formData.get("price") ?? "").trim();
  const billingFrequency = String(
    formData.get("billing_frequency") ?? "monthly"
  ).trim();
  const serviceFrequency = String(
    formData.get("service_frequency") ?? "weekly"
  ).trim();
  const serviceDayInput = String(formData.get("service_day") ?? "").trim();
  const startDate = String(formData.get("start_date") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!customerId || !serviceId || !priceInput || !startDate) {
    throw new Error(
      "Customer, service, price, and start date are required."
    );
  }

  const priceCents = Math.round(Number.parseFloat(priceInput) * 100);

  if (Number.isNaN(priceCents) || priceCents < 0) {
    throw new Error("Enter a valid subscription price.");
  }

  const serviceDay =
    serviceDayInput === ""
      ? null
      : Number.parseInt(serviceDayInput, 10);

  if (
    serviceDay !== null &&
    (Number.isNaN(serviceDay) ||
      serviceDay < 0 ||
      serviceDay > 6)
  ) {
    throw new Error("Enter a valid service day.");
  }

  const { error } = await supabase
    .from("subscriptions")
    .insert({
      customer_id: customerId,
      service_id: serviceId,
      name: name || null,
      price_cents: priceCents,
      billing_frequency: billingFrequency,
      service_frequency: serviceFrequency,
      service_day: serviceDay,
      start_date: startDate,
      next_service_date: startDate,
      notes: notes || null,
      is_active: true,
    });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/subscriptions");

  redirect("/admin/subscriptions?saved=created");
}

export async function toggleSubscriptionStatus(formData: FormData) {
  const supabase = await createClient();

  const subscriptionId = String(
    formData.get("subscription_id") ?? ""
  ).trim();

  const isActive =
    String(formData.get("is_active") ?? "") === "true";

  if (!subscriptionId) {
    throw new Error("Subscription ID is missing.");
  }

  const { error } = await supabase
    .from("subscriptions")
    .update({
      is_active: !isActive,
    })
    .eq("id", subscriptionId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/subscriptions");

  redirect(
    `/admin/subscriptions?saved=${
      isActive ? "paused" : "reactivated"
    }`
  );
}