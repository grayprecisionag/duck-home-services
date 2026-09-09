"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function startJob(formData: FormData) {
  const supabase = await createClient();

  const jobId = String(formData.get("job_id") ?? "").trim();

  if (!jobId) {
    throw new Error("Job ID is missing.");
  }

  const { error } = await supabase.rpc("worker_start_job", {
    job_id: jobId,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/worker");
  redirect("/worker?saved=started");
}

export async function completeJob(formData: FormData) {
  const supabase = await createClient();

  const jobId = String(formData.get("job_id") ?? "").trim();

  if (!jobId) {
    throw new Error("Job ID is missing.");
  }

  const { error } = await supabase.rpc("worker_complete_job", {
    job_id: jobId,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/worker");
  redirect("/worker?saved=completed");
}