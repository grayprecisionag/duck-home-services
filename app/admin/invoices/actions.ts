"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type InvoiceSourceType =
  | "manual"
  | "subscription"
  | "job";

export async function createInvoice(formData: FormData) {
  const supabase = await createClient();

  const sourceType = String(
    formData.get("source_type") ?? "manual"
  ).trim() as InvoiceSourceType;

  const customerIdInput = String(
    formData.get("customer_id") ?? ""
  ).trim();

  const subscriptionIdInput = String(
    formData.get("subscription_id") ?? ""
  ).trim();

  const jobIdInput = String(
    formData.get("job_id") ?? ""
  ).trim();

  const description = String(
    formData.get("description") ?? ""
  ).trim();

  const amountInput = String(
    formData.get("amount") ?? ""
  ).trim();

  const issueDate = String(
    formData.get("issue_date") ?? ""
  ).trim();

  const dueDate = String(
    formData.get("due_date") ?? ""
  ).trim();

  if (!description || !amountInput || !issueDate) {
    throw new Error(
      "Description, amount, and issue date are required."
    );
  }

  const amountCents = Math.round(
    Number.parseFloat(amountInput) * 100
  );

  if (
    Number.isNaN(amountCents) ||
    amountCents < 0
  ) {
    throw new Error("Enter a valid invoice amount.");
  }

  let customerId = customerIdInput;
  let subscriptionId: string | null = null;
  let jobId: string | null = null;

  if (sourceType === "subscription") {
    if (!subscriptionIdInput) {
      throw new Error(
        "Select a subscription for this invoice."
      );
    }

    const { data: subscription, error } =
      await supabase
        .from("subscriptions")
        .select("id, customer_id")
        .eq("id", subscriptionIdInput)
        .single();

    if (error || !subscription) {
      throw new Error(
        "Unable to find that subscription."
      );
    }

    customerId = subscription.customer_id;
    subscriptionId = subscription.id;
  }

  if (sourceType === "job") {
    if (!jobIdInput) {
      throw new Error(
        "Select a one-time job for this invoice."
      );
    }

    const { data: job, error } = await supabase
      .from("jobs")
      .select("id, customer_id, subscription_id")
      .eq("id", jobIdInput)
      .single();

    if (error || !job) {
      throw new Error(
        "Unable to find that job."
      );
    }

    if (job.subscription_id) {
      throw new Error(
        "Recurring jobs should be billed through their subscription."
      );
    }

    customerId = job.customer_id;
    jobId = job.id;
  }

  if (!customerId) {
    throw new Error(
      "A customer is required for this invoice."
    );
  }

  const { error } = await supabase
    .from("invoices")
    .insert({
      customer_id: customerId,
      subscription_id: subscriptionId,
      job_id: jobId,
      description,
      amount_cents: amountCents,
      status: "unpaid",
      issue_date: issueDate,
      due_date: dueDate || null,
      paid_at: null,
      payment_method: null,
      payment_notes: null,
      billing_period_start: null,
      billing_period_end: null,
    });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/invoices");

  redirect("/admin/invoices?saved=created");
}

export async function generateDueInvoices() {
  const supabase = await createClient();

  const throughDate = getTodayDate();

  const { data, error } = await supabase.rpc(
    "generate_subscription_invoices",
    {
      p_through_date: throughDate,
    }
  );

  if (error) {
    throw new Error(error.message);
  }

  const generatedCount =
    typeof data === "number" ? data : 0;

  revalidatePath("/admin/invoices");
  revalidatePath("/admin/subscriptions");

  redirect(
    `/admin/invoices?saved=generated&count=${generatedCount}`
  );
}

export async function markInvoicePaid(
  formData: FormData
) {
  const supabase = await createClient();

  const invoiceId = String(
    formData.get("invoice_id") ?? ""
  ).trim();

  const paymentMethod = String(
    formData.get("payment_method") ?? ""
  ).trim();

  const paymentNotes = String(
    formData.get("payment_notes") ?? ""
  ).trim();

  const allowedMethods = [
    "cash",
    "zelle",
    "apple_cash",
    "venmo",
    "paypal",
    "other",
  ];

  if (!invoiceId) {
    throw new Error("Invoice ID is missing.");
  }

  if (!allowedMethods.includes(paymentMethod)) {
    throw new Error(
      "Select a valid payment method."
    );
  }

  const { error } = await supabase
    .from("invoices")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      payment_method: paymentMethod,
      payment_notes: paymentNotes || null,
    })
    .eq("id", invoiceId)
    .eq("status", "unpaid");

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/invoices");

  redirect("/admin/invoices?saved=paid");
}

export async function voidInvoice(
  formData: FormData
) {
  const supabase = await createClient();

  const invoiceId = String(
    formData.get("invoice_id") ?? ""
  ).trim();

  if (!invoiceId) {
    throw new Error("Invoice ID is missing.");
  }

  const { error } = await supabase
    .from("invoices")
    .update({
      status: "void",
      paid_at: null,
      payment_method: null,
      payment_notes: null,
    })
    .eq("id", invoiceId)
    .eq("status", "unpaid");

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/invoices");

  redirect("/admin/invoices?saved=voided");
}

function getTodayDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}