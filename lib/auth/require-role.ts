import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type UserRole = "admin" | "worker" | "customer";

export async function requireRole(requiredRole: UserRole) {
  const supabase = await createClient();

  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims?.sub) {
    redirect("/login");
  }

  const userId = claimsData.claims.sub;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, role")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    redirect("/login");
  }

  if (profile.role !== requiredRole) {
    if (profile.role === "admin") {
      redirect("/admin");
    }

    if (profile.role === "worker") {
      redirect("/worker");
    }

    redirect("/customer");
  }

  return profile;
}