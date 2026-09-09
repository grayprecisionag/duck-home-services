"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createService(formData: FormData) {
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const category = String(formData.get("category") ?? "General").trim();
  const pricingLabel = String(formData.get("pricing_label") ?? "").trim();
  const serviceType = String(
    formData.get("service_type") ?? "one_time"
  ).trim();

  const priceInput = String(formData.get("price") ?? "").trim();

  const priceCents =
    priceInput === ""
      ? null
      : Math.round(Number.parseFloat(priceInput) * 100);

  if (!name) {
    throw new Error("Service name is required.");
  }

  if (
    priceInput !== "" &&
    (priceCents === null || Number.isNaN(priceCents) || priceCents < 0)
  ) {
    throw new Error("Enter a valid price.");
  }

  const { error } = await supabase.from("services").insert({
    name,
    description: description || null,
    category: category || "General",
    price_cents: priceCents,
    pricing_label: pricingLabel || null,
    service_type: serviceType,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/services");

  redirect("/admin/services?saved=created");
}

export async function updateService(formData: FormData) {
  const supabase = await createClient();

  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const category = String(formData.get("category") ?? "General").trim();
  const pricingLabel = String(formData.get("pricing_label") ?? "").trim();
  const serviceType = String(
    formData.get("service_type") ?? "one_time"
  ).trim();

  const priceInput = String(formData.get("price") ?? "").trim();

  const priceCents =
    priceInput === ""
      ? null
      : Math.round(Number.parseFloat(priceInput) * 100);

  if (!id || !name) {
    throw new Error("Service information is missing.");
  }

  if (
    priceInput !== "" &&
    (priceCents === null || Number.isNaN(priceCents) || priceCents < 0)
  ) {
    throw new Error("Enter a valid price.");
  }

  const { error } = await supabase
    .from("services")
    .update({
      name,
      description: description || null,
      category: category || "General",
      price_cents: priceCents,
      pricing_label: pricingLabel || null,
      service_type: serviceType,
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/services");

  redirect("/admin/services?saved=updated");
}

export async function toggleServiceStatus(formData: FormData) {
  const supabase = await createClient();

  const id = String(formData.get("id") ?? "").trim();
  const currentStatus =
    String(formData.get("is_active") ?? "") === "true";

  if (!id) {
    throw new Error("Service ID is missing.");
  }

  const { error } = await supabase
    .from("services")
    .update({
      is_active: !currentStatus,
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/services");

  redirect(
    `/admin/services?saved=${
      currentStatus ? "deactivated" : "reactivated"
    }`
  );
}