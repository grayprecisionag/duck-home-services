import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    subscriptionId: string;
  }>;
};

type CustomerRecord = {
  id: string;
};

type NamedRelation = {
  name: string;
};

type SubscriptionRow = {
  id: string;
  customer_id: string;
  name: string | null;
  price_cents: number;
  billing_frequency: string;
  service_frequency: string;
  service_day: number | null;
  start_date: string | null;
  next_service_date: string | null;
  notes: string | null;
  is_active: boolean;
  services: NamedRelation | NamedRelation[] | null;
};

type JobRow = {
  id: string;
  scheduled_date: string;
  scheduled_time: string | null;
  status: string;
};

export default async function CustomerSubscriptionPage({
  params,
}: PageProps) {
  const { subscriptionId } = await params;

  const supabase = await createClient();

  const { data: claimsData } =
    await supabase.auth.getClaims();

  const userId = claimsData?.claims?.sub;

  if (!userId) {
    redirect("/login");
  }

  const { data: customerData } = await supabase
    .from("customers")
    .select("id")
    .eq("profile_id", userId)
    .maybeSingle();

  const customer =
    customerData as CustomerRecord | null;

  if (!customer) {
    redirect("/customer");
  }

  const { data: subscriptionData } = await supabase
    .from("subscriptions")
    .select(`
      id,
      customer_id,
      name,
      price_cents,
      billing_frequency,
      service_frequency,
      service_day,
      start_date,
      next_service_date,
      notes,
      is_active,
      services (
        name
      )
    `)
    .eq("id", subscriptionId)
    .eq("customer_id", customer.id)
    .maybeSingle();

  const subscription =
    subscriptionData as SubscriptionRow | null;

  if (!subscription) {
    redirect("/customer");
  }

  const { data: nextJobData } = await supabase
    .from("jobs")
    .select(`
      id,
      scheduled_date,
      scheduled_time,
      status
    `)
    .eq("customer_id", customer.id)
    .eq("subscription_id", subscription.id)
    .in("status", ["scheduled", "in_progress"])
    .order("scheduled_date", {
      ascending: true,
    })
    .limit(1)
    .maybeSingle();

  const nextJob =
    nextJobData as JobRow | null;

  const service =
    getRelation(subscription.services);

  const planName =
    subscription.name ||
    service?.name ||
    "Service Plan";

  return (
    <main className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-6 py-5">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-stone-500">
              Duck Home Services
            </p>

            <h1 className="text-2xl font-semibold text-stone-900">
              My Subscription
            </h1>
          </div>

          <Link
            href="/customer"
            className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
          >
            ← Customer Portal
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-6 py-10">
        <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
          <div className="border-b border-stone-200 p-6 sm:p-8">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-semibold text-stone-900">
                    {planName}
                  </h2>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      subscription.is_active
                        ? "bg-green-100 text-green-700"
                        : "bg-stone-100 text-stone-600"
                    }`}
                  >
                    {subscription.is_active
                      ? "Active"
                      : "Inactive"}
                  </span>
                </div>

                {service?.name && (
                  <p className="mt-3 text-stone-600">
                    {service.name}
                  </p>
                )}
              </div>

              <div className="sm:text-right">
                <p className="text-3xl font-semibold text-stone-900">
                  {formatMoney(
                    subscription.price_cents
                  )}
                </p>

                <p className="mt-1 text-sm text-stone-500">
                  per{" "}
                  {formatFrequency(
                    subscription.billing_frequency
                  ).toLowerCase()}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 border-b border-stone-200 p-6 sm:grid-cols-2 sm:p-8">
            <Detail
              label="Service Frequency"
              value={formatFrequency(
                subscription.service_frequency
              )}
            />

            <Detail
              label="Service Day"
              value={
                subscription.service_day !== null
                  ? formatServiceDay(
                      subscription.service_day
                    )
                  : "Scheduled as needed"
              }
            />

            <Detail
              label="Billing Frequency"
              value={formatFrequency(
                subscription.billing_frequency
              )}
            />

            <Detail
              label="Plan Status"
              value={
                subscription.is_active
                  ? "Active"
                  : "Inactive"
              }
            />

            <Detail
              label="Start Date"
              value={
                subscription.start_date
                  ? formatDate(
                      subscription.start_date
                    )
                  : "Not available"
              }
            />

            <Detail
              label="Next Service"
              value={
                nextJob
                  ? formatDate(
                      nextJob.scheduled_date
                    )
                  : subscription.next_service_date
                    ? formatDate(
                        subscription.next_service_date
                      )
                    : "Not scheduled yet"
              }
            />
          </div>

          {nextJob && (
            <div className="border-b border-stone-200 p-6 sm:p-8">
              <h3 className="text-lg font-semibold text-stone-900">
                Next Scheduled Service
              </h3>

              <div className="mt-4 rounded-2xl bg-stone-50 p-5">
                <p className="font-semibold text-stone-900">
                  {formatDate(
                    nextJob.scheduled_date
                  )}
                </p>

                {nextJob.scheduled_time && (
                  <p className="mt-1 text-sm text-stone-600">
                    {formatTime(
                      nextJob.scheduled_time
                    )}
                  </p>
                )}

                <p className="mt-2 text-sm text-stone-500">
                  Status:{" "}
                  {nextJob.status ===
                  "in_progress"
                    ? "In Progress"
                    : "Scheduled"}
                </p>
              </div>
            </div>
          )}

          {subscription.notes && (
            <div className="border-b border-stone-200 p-6 sm:p-8">
              <h3 className="text-lg font-semibold text-stone-900">
                Plan Notes
              </h3>

              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-stone-600">
                {subscription.notes}
              </p>
            </div>
          )}

          <div className="p-6 sm:p-8">
            <h3 className="text-lg font-semibold text-stone-900">
              Need to make a change?
            </h3>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
              Send Duck Home Services a message if
              you need to change your service plan,
              schedule, or have a question about
              your subscription.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/customer/messages"
                className="rounded-xl bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800"
              >
                Send a Message
              </Link>

              <Link
                href="/customer"
                className="rounded-xl border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-700 transition hover:bg-stone-100"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">
        {label}
      </p>

      <p className="mt-2 font-medium text-stone-900">
        {value}
      </p>
    </div>
  );
}

function getRelation<T>(
  relation: T | T[] | null
): T | null {
  if (!relation) {
    return null;
  }

  if (Array.isArray(relation)) {
    return relation[0] ?? null;
  }

  return relation;
}

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(
    new Date(`${date}T00:00:00Z`)
  );
}

function formatTime(time: string) {
  const [hours, minutes] =
    time.split(":");

  const date = new Date();

  date.setHours(
    Number(hours),
    Number(minutes),
    0,
    0
  );

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatFrequency(
  frequency: string
) {
  const names: Record<string, string> = {
    weekly: "Weekly",
    biweekly: "Every Other Week",
    monthly: "Monthly",
  };

  return names[frequency] ?? frequency;
}

function formatServiceDay(day: number) {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  return days[day] ?? "Scheduled Day";
}