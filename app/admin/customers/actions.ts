"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createCustomer(formData: FormData) {
  const supabase = await createClient();

  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const streetAddress = String(
    formData.get("street_address") ?? ""
  ).trim();
  const city = String(formData.get("city") ?? "").trim();
  const state = String(formData.get("state") ?? "CA").trim();
  const zipCode = String(formData.get("zip_code") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!firstName || !lastName) {
    throw new Error("First and last name are required.");
  }

  const { error } = await supabase.from("customers").insert({
    first_name: firstName,
    last_name: lastName,
    email: email || null,
    phone: phone || null,
    street_address: streetAddress || null,
    city: city || null,
    state: state || "CA",
    zip_code: zipCode || null,
    notes: notes || null,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/customers");
  redirect("/admin/customers?saved=created");
}

export async function updateCustomer(formData: FormData) {
  const supabase = await createClient();

  const id = String(formData.get("id") ?? "").trim();
  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const streetAddress = String(
    formData.get("street_address") ?? ""
  ).trim();
  const city = String(formData.get("city") ?? "").trim();
  const state = String(formData.get("state") ?? "CA").trim();
  const zipCode = String(formData.get("zip_code") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!id || !firstName || !lastName) {
    throw new Error("Customer information is incomplete.");
  }

  const { error } = await supabase
    .from("customers")
    .update({
      first_name: firstName,
      last_name: lastName,
      email: email || null,
      phone: phone || null,
      street_address: streetAddress || null,
      city: city || null,
      state: state || "CA",
      zip_code: zipCode || null,
      notes: notes || null,
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/customers");
  redirect("/admin/customers?saved=updated");
}

export async function toggleCustomerStatus(formData: FormData) {
  const supabase = await createClient();

  const id = String(formData.get("id") ?? "").trim();
  const currentStatus =
    String(formData.get("is_active") ?? "") === "true";

  if (!id) {
    throw new Error("Customer ID is missing.");
  }

  const { error } = await supabase
    .from("customers")
    .update({
      is_active: !currentStatus,
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/customers");

  redirect(
    `/admin/customers?saved=${
      currentStatus ? "archived" : "reactivated"
    }`
  );
}

export async function linkCustomerAccount(formData: FormData) {
  const supabase = await createClient();

  const customerId = String(
    formData.get("customer_id") ?? ""
  ).trim();

  const profileId = String(
    formData.get("profile_id") ?? ""
  ).trim();

  if (!customerId || !profileId) {
    redirect("/admin/customers?error=missing-link");
  }

  const { error } = await supabase.rpc("link_customer_profile", {
    p_customer_id: customerId,
    p_profile_id: profileId,
  });

  if (error) {
    console.error("Unable to link customer account:", error);

    redirect(
      `/admin/customers?error=${encodeURIComponent(error.message)}`
    );
  }

  revalidatePath("/admin/customers");
  revalidatePath("/customer");

  redirect("/admin/customers?saved=linked");
}