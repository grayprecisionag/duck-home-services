import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type NamedRelation = {
  name: string;
};

type CustomerRecord = {
  id: string;
};

type CompletedJobRow = {
  id: string;
  scheduled_date: string;
  scheduled_time: string | null;
  completed_at: string | null;
  notes: string | null;
  services: NamedRelation | NamedRelation[] | null;
};

type PaidInvoiceRow = {
  id: string;
  description: string;
  amount_cents: number;
  issue_date: string;
  due_date: string | null;
  paid_at: string | null;
  payment_method: string | null;
  payment_notes: string | null;
};

export default async function CustomerHistoryPage() {
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

  const [
    completedJobsResult,
    paidInvoicesResult,
  ] = await Promise.all([
    supabase
      .from("jobs")
      .select(`
        id,
        scheduled_date,
        scheduled_time,
        completed_at,
        notes,
        services (
          name
        )
      `)
      .eq("customer_id", customer.id)
      .eq("status", "completed")
      .order("completed_at", {
        ascending: false,
        nullsFirst: false,
      }),

    supabase
      .from("invoices")
      .select(`
        id,
        description,
        amount_cents,
        issue_date,
        due_date,
        paid_at,
        payment_method,
        payment_notes
      `)
      .eq("customer_id", customer.id)
      .eq("status", "paid")
      .order("paid_at", {
        ascending: false,
        nullsFirst: false,
      }),
  ]);

  const completedJobs =
    (completedJobsResult.data ??
      []) as CompletedJobRow[];

  const paidInvoices =
    (paidInvoicesResult.data ??
      []) as PaidInvoiceRow[];

  return (
    <main className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-5">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-stone-500">
              Duck Home Services
            </p>

            <h1 className="text-2xl font-semibold text-stone-900">
              Completed & History
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

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-stone-900">
            Your History
          </h2>

          <p className="mt-3 max-w-2xl text-stone-600">
            Review completed services and payments
            already recorded on your account.
          </p>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          <SummaryCard
            title="Completed Services"
            value={String(completedJobs.length)}
          />

          <SummaryCard
            title="Paid Invoices"
            value={String(paidInvoices.length)}
          />
        </div>

        <div className="mt-12 grid gap-10 lg:grid-cols-2">
          <section>
            <SectionHeading
              title="Completed Services"
              description="Services Duck Home Services has completed for you."
            />

            <div className="mt-5">
              {completedJobs.length === 0 ? (
                <EmptyState message="No completed services yet." />
              ) : (
                <div className="space-y-4">
                  {completedJobs.map((job) => {
                    const service =
                      getRelation(job.services);

                    return (
                      <div
                        key={job.id}
                        className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <h3 className="text-lg font-semibold text-stone-900">
                            {service?.name ??
                              "Custom Service"}
                          </h3>

                          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                            Completed
                          </span>
                        </div>

                        <div className="mt-4 space-y-1 text-sm text-stone-600">
                          <p>
                            Service date:{" "}
                            {formatDate(
                              job.scheduled_date
                            )}
                          </p>

                          {job.scheduled_time && (
                            <p>
                              Scheduled time:{" "}
                              {formatTime(
                                job.scheduled_time
                              )}
                            </p>
                          )}

                          {job.completed_at && (
                            <p>
                              Completed:{" "}
                              {formatDateTime(
                                job.completed_at
                              )}
                            </p>
                          )}
                        </div>

                        {job.notes && (
                          <p className="mt-4 text-sm leading-6 text-stone-500">
                            {job.notes}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          <section>
            <SectionHeading
              title="Paid Invoices"
              description="Invoices that have already been paid."
            />

            <div className="mt-5">
              {paidInvoices.length === 0 ? (
                <EmptyState message="No paid invoices yet." />
              ) : (
                <div className="space-y-4">
                  {paidInvoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
                    >
                      <div className="flex flex-col justify-between gap-4 sm:flex-row">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-stone-900">
                              {invoice.description}
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
                            <p className="mt-3 text-sm leading-6 text-stone-500">
                              {invoice.payment_notes}
                            </p>
                          )}
                        </div>

                        <p className="shrink-0 text-xl font-semibold text-stone-900">
                          {formatMoney(
                            invoice.amount_cents
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
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
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Los_Angeles",
  }).format(new Date(date));
}

function formatTime(time: string) {
  const [hours, minutes] = time.split(":");

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