import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type Notification = {
  id: string;
  notification_type: string;
  title: string;
  message: string | null;
  href: string | null;
  related_id: string | null;
  read_at: string | null;
  created_at: string;
};

export default async function CustomerNotifications() {
  const supabase = await createClient();

  const { data: claimsData } =
    await supabase.auth.getClaims();

  const userId = claimsData?.claims?.sub;

  let notifications: Notification[] = [];

  if (userId) {
    const { data } = await supabase
      .from("notifications")
      .select(`
        id,
        notification_type,
        title,
        message,
        href,
        related_id,
        read_at,
        created_at
      `)
      .eq("recipient_profile_id", userId)
      .is("read_at", null)
      .in("notification_type", [
        "message",
        "booking_declined",
        "quote_ready",
        "system",
      ])
      .order("created_at", {
        ascending: false,
      })
      .limit(15);

    notifications =
      (data ?? []) as Notification[];
  }

  /*
   * Quote Ready notifications need one extra check.
   *
   * If the customer has already accepted or declined
   * the quote, it should no longer appear in the
   * action center even if its notification itself
   * was never opened.
   */
  const quoteNotifications =
    notifications.filter(
      (notification) =>
        notification.notification_type ===
          "quote_ready" &&
        notification.related_id
    );

  if (quoteNotifications.length > 0) {
    const quoteIds = quoteNotifications
      .map(
        (notification) =>
          notification.related_id
      )
      .filter(
        (id): id is string => Boolean(id)
      );

    const { data: requests } = await supabase
      .from("custom_service_requests")
      .select("id, status")
      .in("id", quoteIds);

    const activeQuoteIds = new Set(
      (requests ?? [])
        .filter(
          (request) =>
            request.status === "quoted"
        )
        .map((request) => request.id)
    );

    notifications = notifications.filter(
      (notification) => {
        if (
          notification.notification_type !==
          "quote_ready"
        ) {
          return true;
        }

        if (!notification.related_id) {
          return false;
        }

        return activeQuoteIds.has(
          notification.related_id
        );
      }
    );
  }

  const notificationCount =
    notifications.length;

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-2xl font-semibold text-stone-900">
          Notifications
        </h2>

        {notificationCount > 0 && (
          <span className="rounded-full bg-stone-900 px-3 py-1 text-xs font-semibold text-white">
            {notificationCount} new
          </span>
        )}
      </div>

      <p className="mt-2 text-sm text-stone-600">
        Messages and updates that may need
        your attention.
      </p>

      {notifications.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-stone-300 bg-white p-6">
          <p className="text-sm text-stone-500">
            You're all caught up.
          </p>
        </div>
      ) : (
        <div className="mt-5 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
          <div className="divide-y divide-stone-200">
            {notifications.map(
              (notification) => (
                <Link
                  key={notification.id}
                  href={`/customer/notifications/${notification.id}`}
                  className="block"
                >
                  <div className="flex items-start justify-between gap-4 p-5 transition hover:bg-stone-50">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-stone-900" />

                        <p className="font-semibold text-stone-900">
                          {notification.title}
                        </p>

                        <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600">
                          {formatNotificationType(
                            notification.notification_type
                          )}
                        </span>

                        <span className="rounded-full bg-stone-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                          New
                        </span>
                      </div>

                      {notification.message && (
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-stone-600">
                          {notification.message}
                        </p>
                      )}

                      <p className="mt-2 text-xs text-stone-400">
                        {formatNotificationDate(
                          notification.created_at
                        )}
                      </p>
                    </div>

                    <p className="shrink-0 text-sm font-medium text-stone-700">
                      Open →
                    </p>
                  </div>
                </Link>
              )
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function formatNotificationType(
  type: string
) {
  const names: Record<string, string> = {
    message: "Message",
    booking_declined:
      "Booking Update",
    quote_ready: "Quote Ready",
    system: "Update",
  };

  return names[type] ?? "Update";
}

function formatNotificationDate(
  date: string
) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}