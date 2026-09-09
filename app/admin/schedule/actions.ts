"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createJob(formData: FormData) {
  const supabase = await createClient();

  const customerId = String(formData.get("customer_id") ?? "").trim();
  const serviceId = String(formData.get("service_id") ?? "").trim();
  const scheduledDate = String(formData.get("scheduled_date") ?? "").trim();
  const scheduledTime = String(formData.get("scheduled_time") ?? "").trim();
  const priceInput = String(formData.get("price") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!customerId || !serviceId || !scheduledDate) {
    throw new Error("Customer, service, and scheduled date are required.");
  }

  const priceCents =
    priceInput === ""
      ? null
      : Math.round(Number.parseFloat(priceInput) * 100);

  if (
    priceInput !== "" &&
    (priceCents === null || Number.isNaN(priceCents) || priceCents < 0)
  ) {
    throw new Error("Enter a valid price.");
  }

  const { error } = await supabase.from("jobs").insert({
    customer_id: customerId,
    service_id: serviceId,
    scheduled_date: scheduledDate,
    scheduled_time: scheduledTime || null,
    price_cents: priceCents,
    notes: notes || null,
    status: "scheduled",
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/schedule");
  redirect("/admin/schedule?saved=created");
}

export async function updateJob(formData: FormData) {
  const supabase = await createClient();

  const jobId = String(formData.get("job_id") ?? "").trim();
  const customerId = String(formData.get("customer_id") ?? "").trim();
  const serviceId = String(formData.get("service_id") ?? "").trim();
  const scheduledDate = String(formData.get("scheduled_date") ?? "").trim();
  const scheduledTime = String(formData.get("scheduled_time") ?? "").trim();
  const priceInput = String(formData.get("price") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!jobId || !customerId || !serviceId || !scheduledDate) {
    throw new Error("Job information is incomplete.");
  }

  const priceCents =
    priceInput === ""
      ? null
      : Math.round(Number.parseFloat(priceInput) * 100);

  if (
    priceInput !== "" &&
    (priceCents === null || Number.isNaN(priceCents) || priceCents < 0)
  ) {
    throw new Error("Enter a valid price.");
  }

  const { error } = await supabase
    .from("jobs")
    .update({
      customer_id: customerId,
      service_id: serviceId,
      scheduled_date: scheduledDate,
      scheduled_time: scheduledTime || null,
      price_cents: priceCents,
      notes: notes || null,
    })
    .eq("id", jobId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/schedule");
  revalidatePath(`/admin/schedule/${jobId}/edit`);

  redirect("/admin/schedule?saved=updated");
}

export async function completeJob(formData: FormData) {
  const supabase = await createClient();

  const jobId = String(formData.get("job_id") ?? "").trim();

  if (!jobId) {
    throw new Error("Job ID is missing.");
  }

  const { error } = await supabase
    .from("jobs")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/schedule");
  redirect("/admin/schedule?saved=completed");
}

export async function cancelJob(formData: FormData) {
  const supabase = await createClient();

  const jobId = String(formData.get("job_id") ?? "").trim();

  if (!jobId) {
    throw new Error("Job ID is missing.");
  }

  const { error } = await supabase
    .from("jobs")
    .update({
      status: "cancelled",
      completed_at: null,
    })
    .eq("id", jobId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/schedule");
  redirect("/admin/schedule?saved=cancelled");
}

export async function generateUpcomingJobs() {
  const supabase = await createClient();

  const throughDate = getDateThirtyDaysFromNow();

  const { data, error } = await supabase.rpc(
    "generate_subscription_jobs",
    {
      p_through_date: throughDate,
    }
  );

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/schedule");
  revalidatePath("/admin/subscriptions");

  const generatedCount =
    typeof data === "number" ? data : 0;

  redirect(
    `/admin/schedule?saved=generated&count=${generatedCount}`
  );
}

function getDateThirtyDaysFromNow() {
  const now = new Date();

  const target = new Date(now);
  target.setDate(target.getDate() + 30);

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(target);
}