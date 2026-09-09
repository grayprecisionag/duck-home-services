import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type NamedRelation = {
  name: string;
};

type CustomerRecord = {
  id: string;
  first_name: string;
  last_name: string;
};

type SubscriptionRow = {
  id: string;
  name: string | null;
  price_cents: number;
  billing_frequency: string;
  service_frequency: string;
  service_day: number | null;
  next_service_date: string | null;
  services: NamedRelation | NamedRelation[] | null;
};

type JobRow = {
  id: string;
  scheduled_date: string;
  scheduled_time: string | null;
  status: string;
  notes: string | null;
  services: NamedRelation | NamedRelation[] | null;
};

type InvoiceRow = {
  id: string;
  description: string;
  amount_cents: number;
  status: string;
  issue_date: string;
  due_date: string | null;
  paid_at: string | null;
  payment_method: string | null;
  payment_notes: string | null;
};

export default async function CustomerPage() {
  const supabase = await createClient();

  const { data: claimsData } =
    await supabase.auth.getClaims();

  const userId = claimsData?.claims?.sub;

  const { data: profile } = userId
    ? await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", userId)
        .single()
    : { data: null };

  const { data: customerData } = userId
    ? await supabase
        .from("customers")
        .select("id, first_name, last_name")
        .eq("profile_id", userId)
        .maybeSingle()
    : { data: null };

  const customer =
    customerData as CustomerRecord | null;

  let subscriptions: SubscriptionRow[] = [];
  let jobs: JobRow[] = [];
  let invoices: InvoiceRow[] = [];

  if (customer) {
    const [
      subscriptionsResult,
      jobsResult,
      invoicesResult,
    ] = await Promise.all([
      supabase
        .from("subscriptions")
        .select(`
          id,
          name,
          price_cents,
          billing_frequency,
          service_frequency,
          service_day,
          next_service_date,
          services (
            name
          )
        `)
        .eq("customer_id", customer.id)
        .eq("is_active", true)
        .order("created_at", {
          ascending: false,
        }),

      supabase
        .from("jobs")
        .select(`
          id,
          scheduled_date,
          scheduled_time,
          status,
          notes,
          services (
            name
          )
        `)
        .eq("customer_id", customer.id)
        .in("status", [
          "scheduled",
          "in_progress",
        ])
        .order("scheduled_date", {
          ascending: true,
        }),

      supabase
        .from("invoices")
        .select(`
          id,
          description,
          amount_cents,
          status,
          issue_date,
          due_date,
          paid_at,
          payment_method,
          payment_notes
        `)
        .eq("customer_id", customer.id)
        .order("issue_date", {
          ascending: false,
        }),
    ]);

    subscriptions =
      (subscriptionsResult.data ??
        []) as SubscriptionRow[];

    jobs =
      (jobsResult.data ?? []) as JobRow[];

    invoices =
      (invoicesResult.data ??
        []) as InvoiceRow[];
  }

  const unpaidInvoices = invoices.filter(
    (invoice) => invoice.status === "unpaid"
  );

  const paidInvoices = invoices.filter(
    (invoice) => invoice.status === "paid"
  );

  const outstandingTotal =
    unpaidInvoices.reduce(
      (total, invoice) =>
        total + invoice.amount_cents,
      0
    );

  const displayName =
    customer?.first_name ||
    profile?.first_name ||
    "there";

  return (
    <main className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-stone-500">
              Duck Home Services
            </p>

            <h1 className="text-2xl font-semibold text-stone-900">
              Customer Portal
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
        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-stone-900">
            Hi, {displayName}
          </h2>

          <p className="mt-3 text-stone-600">
            View your services, upcoming
            appointments, invoices, and payment
            history.
          </p>
        </div>

        {!customer ? (
          <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-6">
            <h3 className="font-semibold text-amber-900">
              Your customer account is not linked yet
            </h3>

            <p className="mt-2 text-sm leading-6 text-amber-800">
              Your login is working, but it has not
              been connected to a Duck Home Services
              customer record yet.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryCard
                title="Active Plans"
                value={String(
                  subscriptions.length
                )}
              />

              <SummaryCard
                title="Upcoming Jobs"
                value={String(jobs.length)}
              />

              <SummaryCard
                title="Unpaid Invoices"
                value={String(
                  unpaidInvoices.length
                )}
              />

              <SummaryCard
                title="Amount Due"
                value={formatMoney(
                  outstandingTotal
                )}
              />
            </div>

            <div className="mt-10 grid gap-8 lg:grid-cols-2">
              <section>
                <SectionHeading
                  title="My Subscriptions"
                  description="Your active recurring service plans."
                />

                <div className="mt-5">
                  {subscriptions.length === 0 ? (
                    <EmptyState message="You do not have any active subscriptions." />
                  ) : (
                    <div className="space-y-4">
                      {subscriptions.map(
                        (subscription) => {
                          const service =
                            getRelation(
                              subscription.services
                            );

                          return (
                            <div
                              key={
                                subscription.id
                              }
                              className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
                            >
                              <div className="flex flex-col justify-between gap-4 sm:flex-row">
                                <div>
                                  <h3 className="text-lg font-semibold text-stone-900">
                                    {subscription.name ||
                                      service?.name ||
                                      "Service Plan"}
                                  </h3>

                                  <p className="mt-2 text-sm text-stone-600">
                                    Service:{" "}
                                    {formatFrequency(
                                      subscription.service_frequency
                                    )}
                                  </p>

                                  {subscription.service_day !==
                                    null && (
                                    <p className="mt-1 text-sm text-stone-600">
                                      Service day:{" "}
                                      {formatServiceDay(
                                        subscription.service_day
                                      )}
                                    </p>
                                  )}

                                  {subscription.next_service_date && (
                                    <p className="mt-1 text-sm text-stone-600">
                                      Next service:{" "}
                                      {formatDate(
                                        subscription.next_service_date
                                      )}
                                    </p>
                                  )}
                                </div>

                                <div className="shrink-0 sm:text-right">
                                  <p className="text-xl font-semibold text-stone-900">
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
                          );
                        }
                      )}
                    </div>
                  )}
                </div>
              </section>

              <section>
                <SectionHeading
                  title="Upcoming Jobs"
                  description="Your upcoming scheduled services."
                />

                <div className="mt-5">
                  {jobs.length === 0 ? (
                    <EmptyState message="You do not have any upcoming jobs." />
                  ) : (
                    <div className="space-y-4">
                      {jobs.map((job) => {
                        const service =
                          getRelation(
                            job.services
                          );

                        return (
                          <div
                            key={job.id}
                            className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
                          >
                            <div className="flex flex-col justify-between gap-4 sm:flex-row">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="text-lg font-semibold text-stone-900">
                                    {service?.name ??
                                      "Service"}
                                  </h3>

                                  <StatusBadge
                                    status={
                                      job.status
                                    }
                                  />
                                </div>

                                <p className="mt-3 text-sm text-stone-600">
                                  {formatDate(
                                    job.scheduled_date
                                  )}
                                </p>

                                {job.scheduled_time && (
                                  <p className="mt-1 text-sm text-stone-600">
                                    {formatTime(
                                      job.scheduled_time
                                    )}
                                  </p>
                                )}

                                {job.notes && (
                                  <p className="mt-3 text-sm leading-6 text-stone-500">
                                    {job.notes}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>
            </div>

            <div className="mt-12 grid gap-8 lg:grid-cols-2">
              <section>
                <SectionHeading
                  title="Invoices Due"
                  description="Outstanding invoices for your account."
                />

                <div className="mt-5">
                  {unpaidInvoices.length === 0 ? (
                    <EmptyState message="You do not have any unpaid invoices." />
                  ) : (
                    <div className="space-y-4">
                      {unpaidInvoices.map(
                        (invoice) => (
                          <div
                            key={invoice.id}
                            className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
                          >
                            <div className="flex flex-col justify-between gap-4 sm:flex-row">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="font-semibold text-stone-900">
                                    {
                                      invoice.description
                                    }
                                  </h3>

                                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                                    Unpaid
                                  </span>
                                </div>

                                <p className="mt-3 text-sm text-stone-600">
                                  Issued{" "}
                                  {formatDate(
                                    invoice.issue_date
                                  )}
                                </p>

                                {invoice.due_date && (
                                  <p className="mt-1 text-sm text-stone-600">
                                    Due{" "}
                                    {formatDate(
                                      invoice.due_date
                                    )}
                                  </p>
                                )}
                              </div>

                              <p className="text-xl font-semibold text-stone-900">
                                {formatMoney(
                                  invoice.amount_cents
                                )}
                              </p>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              </section>

              <section>
                <SectionHeading
                  title="Payment History"
                  description="Payments already recorded on your account."
                />

                <div className="mt-5">
                  {paidInvoices.length === 0 ? (
                    <EmptyState message="No payments have been recorded yet." />
                  ) : (
                    <div className="space-y-4">
                      {paidInvoices.map(
                        (invoice) => (
                          <div
                            key={invoice.id}
                            className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
                          >
                            <div className="flex flex-col justify-between gap-4 sm:flex-row">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="font-semibold text-stone-900">
                                    {
                                      invoice.description
                                    }
                                  </h3>

                                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                                    Paid
                                  </span>
                                </div>

                                {invoice.paid_at && (
                                  <p className="mt-3 text-sm text-stone-600">
                                    Paid{" "}
                                    {formatDateTime(
                                      invoice.paid_at
                                    )}
                                  </p>
                                )}

                                {invoice.payment_method && (
                                  <p className="mt-1 text-sm text-stone-600">
                                    Payment method:{" "}
                                    {formatPaymentMethod(
                                      invoice.payment_method
                                    )}
                                  </p>
                                )}

                                {invoice.payment_notes && (
                                  <p className="mt-2 text-sm text-stone-500">
                                    {
                                      invoice.payment_notes
                                    }
                                  </p>
                                )}
                              </div>

                              <p className="text-xl font-semibold text-stone-900">
                                {formatMoney(
                                  invoice.amount_cents
                                )}
                              </p>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              </section>
            </div>

            <div className="mt-12">
              <SectionHeading
                title="More Services"
                description="Additional customer tools we will add next."
              />

              <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <Link
                  href="/customer/book"
                  className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition hover:border-stone-300 hover:shadow-md"
                >
                  <h3 className="text-lg font-semibold text-stone-900">
                    Book a Service
                  </h3>

                  <p className="mt-4 text-sm font-medium text-stone-700">
                    Book now →
                  </p>
                </Link>

                <Link
  href="/customer/request-service"
  className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition hover:border-stone-300 hover:shadow-md"
>
  <h3 className="text-lg font-semibold text-stone-900">
    Request a Service
  </h3>

  <p className="mt-4 text-sm font-medium text-stone-700">
    Request now →
  </p>
</Link>

                <ComingSoonCard title="Messages" />
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

function SummaryCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-stone-500">
        {title}
      </p>

      <p className="mt-3 text-3xl font-semibold tracking-tight text-stone-900">
        {value}
      </p>
    </div>
  );
}

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h2 className="text-2xl font-semibold text-stone-900">
        {title}
      </h2>

      <p className="mt-2 text-sm text-stone-600">
        {description}
      </p>
    </div>
  );
}

function EmptyState({
  message,
}: {
  message: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center">
      <p className="text-sm text-stone-600">
        {message}
      </p>
    </div>
  );
}

function ComingSoonCard({
  title,
}: {
  title: string;
}) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-stone-900">
        {title}
      </h3>

      <p className="mt-4 text-sm text-stone-500">
        Coming soon →
      </p>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const isInProgress =
    status === "in_progress";

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-medium ${
        isInProgress
          ? "bg-blue-100 text-blue-700"
          : "bg-stone-100 text-stone-700"
      }`}
    >
      {isInProgress
        ? "In Progress"
        : "Scheduled"}
    </span>
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

function formatDateTime(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone:
      "America/Los_Angeles",
  }).format(new Date(date));
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

function formatPaymentMethod(
  method: string
) {
  const names: Record<string, string> = {
    cash: "Cash",
    zelle: "Zelle",
    apple_cash: "Apple Cash",
    venmo: "Venmo",
    paypal: "PayPal",
    other: "Other",
  };

  return names[method] ?? method;
}