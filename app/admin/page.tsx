import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Notification = {
  id: string;
  notification_type: string;
  title: string;
  message: string | null;
  href: string | null;
  read_at: string | null;
  created_at: string;
};

export default async function AdminPage() {
  const supabase = await createClient();

  const { data: claimsData } =
    await supabase.auth.getClaims();

  const userId = claimsData?.claims?.sub;

  const [
    notificationsResult,
    unreadMessagesResult,
    pendingBookingsResult,
    serviceRequestsResult,
  ] = await Promise.all([
    userId
      ? supabase
          .from("notifications")
          .select(`
            id,
            notification_type,
            title,
            message,
            href,
            read_at,
            created_at
          `)
          .eq("recipient_profile_id", userId)
          .is("read_at", null)
          .order("created_at", {
            ascending: false,
          })
          .limit(10)
      : Promise.resolve({ data: [] }),

    supabase.rpc(
      "admin_get_unread_message_count"
    ),

    supabase
      .from("booking_requests")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("status", "pending"),

    supabase
      .from("custom_service_requests")
      .select("id", {
        count: "exact",
        head: true,
      })
      .in("status", [
        "pending",
        "quoted",
        "accepted",
      ]),
  ]);

  const notifications =
    (notificationsResult.data as
      | Notification[]
      | null) ?? [];

  const unreadMessageCount =
    Number(unreadMessagesResult.data ?? 0);

  const pendingBookingCount =
    pendingBookingsResult.count ?? 0;

  const serviceRequestCount =
    serviceRequestsResult.count ?? 0;

  return (
    <main className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-stone-500">
              Duck Home Services
            </p>

            <h1 className="text-2xl font-semibold text-stone-900">
              Admin Dashboard
            </h1>
          </div>

          <a
            href="/logout"
            className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
          >
            Log Out
          </a>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-10">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-semibold text-stone-900">
              Notifications
            </h2>

            {notifications.length > 0 && (
              <span className="rounded-full bg-stone-900 px-3 py-1 text-xs font-semibold text-white">
                {notifications.length} new
              </span>
            )}
          </div>

          <p className="mt-2 text-sm text-stone-600">
            New activity that may need your attention.
          </p>

          {notifications.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-stone-300 bg-white p-6">
              <p className="text-sm text-stone-500">
                No new notifications.
              </p>
            </div>
          ) : (
            <div className="mt-5 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
              <div className="divide-y divide-stone-200">
                {notifications.map((notification) => {
                  const content = (
                    <div className="flex items-start justify-between gap-4 p-5 transition hover:bg-stone-50">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-stone-900" />

                          <p className="font-semibold text-stone-900">
                            {notification.title}
                          </p>

                          <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium capitalize text-stone-600">
                            {formatNotificationType(
                              notification.notification_type
                            )}
                          </span>
                        </div>

                        {notification.message && (
                          <p className="mt-2 line-clamp-2 text-sm leading-6 text-stone-600">
                            {notification.message}
                          </p>
                        )}

                        <p className="mt-2 text-xs text-stone-400">
                          {formatDateTime(
                            notification.created_at
                          )}
                        </p>
                      </div>

                      {notification.href && (
                        <p className="shrink-0 text-sm font-medium text-stone-900">
                          Open →
                        </p>
                      )}
                    </div>
                  );

                  if (notification.href) {
                    return (
                      <Link
                        key={notification.id}
                        href={`/admin/notifications/${notification.id}`}
                        className="block"
                      >
                        {content}
                      </Link>
                    );
                  }

                  return (
                    <div key={notification.id}>
                      {content}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <h2 className="text-3xl font-semibold tracking-tight text-stone-900">
          Business Management
        </h2>

        <p className="mt-3 text-stone-600">
          Manage Duck Home Services from one place.
        </p>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <DashboardCard
            title="Schedule"
            description="View and manage upcoming jobs."
            href="/admin/schedule"
          />

          <DashboardCard
            title="Booking Requests"
            description="Review and approve bookings for existing services."
            href="/admin/booking-requests"
            badge={
              pendingBookingCount > 0
                ? `${pendingBookingCount} pending`
                : undefined
            }
          />

          <DashboardCard
            title="Service Requests"
            description="Review custom requests, send quotes, and schedule accepted jobs."
            href="/admin/service-requests"
            badge={
              serviceRequestCount > 0
                ? `${serviceRequestCount} need attention`
                : undefined
            }
          />

          <DashboardCard
            title="Customers"
            description="Manage customer information and service history."
            href="/admin/customers"
          />

          <DashboardCard
            title="Services"
            description="Manage services and pricing."
            href="/admin/services"
          />

          <DashboardCard
            title="Subscriptions"
            description="Manage recurring customer service plans."
            href="/admin/subscriptions"
          />

          <DashboardCard
            title="Invoices & Payments"
            description="Track invoices, receipts, and payments."
            href="/admin/invoices"
          />

          <DashboardCard
            title="Messages"
            description="View and respond to customer messages."
            href="/admin/messages"
            badge={
              unreadMessageCount > 0
                ? `${unreadMessageCount} unread`
                : undefined
            }
          />

          <DashboardCard
            title="Business Settings"
            description="Manage business and account settings."
          />
        </div>
      </section>
    </main>
  );
}

function DashboardCard({
  title,
  description,
  href,
  badge,
}: {
  title: string;
  description: string;
  href?: string;
  badge?: string;
}) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-semibold text-stone-900">
          {title}
        </h3>

        {badge && (
          <span className="shrink-0 rounded-full bg-stone-900 px-2.5 py-1 text-xs font-semibold text-white">
            {badge}
          </span>
        )}
      </div>

      <p className="mt-2 text-sm leading-6 text-stone-600">
        {description}
      </p>

      <p className="mt-6 text-sm font-medium text-stone-900">
        {href ? "Open →" : "Coming soon →"}
      </p>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
      >
        {content}
      </Link>
    );
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      {content}
    </div>
  );
}

function formatNotificationType(type: string) {
  const names: Record<string, string> = {
    message: "Message",
    booking_request: "Booking",
    service_request: "Service Request",
    quote_accepted: "Quote Accepted",
    invoice: "Invoice",
    job: "Job",
    system: "System",
  };

  return names[type] ?? type;
}

function formatDateTime(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}