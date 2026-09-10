import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type CustomerNotificationPageProps = {
  params: Promise<{
    notificationId: string;
  }>;
};

export default async function CustomerNotificationPage({
  params,
}: CustomerNotificationPageProps) {
  const { notificationId } = await params;

  const supabase = await createClient();

  const { data: claimsData } =
    await supabase.auth.getClaims();

  const userId = claimsData?.claims?.sub;

  if (!userId) {
    redirect("/login");
  }

  const { data: notification, error } =
    await supabase
      .from("notifications")
      .select(`
        id,
        notification_type,
        href,
        read_at
      `)
      .eq("id", notificationId)
      .eq("recipient_profile_id", userId)
      .maybeSingle();

  if (error || !notification) {
    redirect("/customer");
  }

  if (!notification.read_at) {
    await supabase
      .from("notifications")
      .update({
        read_at: new Date().toISOString(),
      })
      .eq("id", notification.id)
      .eq("recipient_profile_id", userId);
  }

  if (
    notification.notification_type === "message"
  ) {
    redirect("/customer/messages");
  }

  if (
    notification.notification_type === "invoice"
  ) {
    redirect("/customer");
  }

  if (
    notification.notification_type === "job"
  ) {
    redirect("/customer");
  }

  redirect(notification.href || "/customer");
}