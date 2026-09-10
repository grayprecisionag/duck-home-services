import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AdminNotificationPage({
  params,
}: {
  params: Promise<{
    notificationId: string;
  }>;
}) {
  const { notificationId } = await params;

  const supabase = await createClient();

  const { data: claimsData } =
    await supabase.auth.getClaims();

  const userId = claimsData?.claims?.sub;

  if (!userId) {
    redirect("/login");
  }

  const { data: notification } = await supabase
    .from("notifications")
    .select(`
      id,
      href,
      read_at
    `)
    .eq("id", notificationId)
    .eq("recipient_profile_id", userId)
    .maybeSingle();

  if (!notification) {
    redirect("/admin");
  }

  if (!notification.read_at) {
    await supabase
      .from("notifications")
      .update({
        read_at: new Date().toISOString(),
      })
      .eq("id", notificationId)
      .eq("recipient_profile_id", userId);
  }

  redirect(notification.href || "/admin");
}