import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  createInvoice,
  generateDueInvoices,
  markInvoicePaid,
  voidInvoice,
} from "./actions";

type CustomerRelation = {
  first_name: string;
  last_name: string;
};

type NamedRelation = {
  name: string;
};

type InvoiceRow = {
  id: string;
  subscription_id: string | null;
  job_id: string | null;
  description: string;
  amount_cents: number;
  status: string;
  issue_date: string;
  due_date: string | null;
  paid_at: string | null;
  payment_method: string | null;
  payment_notes: string | null;
  billing_period_start: string | null;
  billing_period_end: string | null;
  customers:
    | CustomerRelation
    | CustomerRelation[]
    | null;
};

export default async function AdminInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{
    saved?: string;
    count?: string;
  }>;
}) {
  const { saved, count } = await searchParams;

  const supabase = await createClient();

  const { data: customers } = await supabase
    .from("customers")
    .select("id, first_name, last_name")
    .eq("is_active", true)
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true });

  const { data: subscriptions } =
    await supabase
      .from("subscriptions")
      .select(`
        id,
        name,
        price_cents,
        customer_id,
        customers (
          first_name,
          last_name
        ),
        services (
          name
        )
      `)
      .eq("is_active", true)
      .order("created_at", {
        ascending: false,
      });

  const { data: jobs } = await supabase
    .from("jobs")
    .select(`
      id,
      customer_id,
      scheduled_date,
      price_cents,
      subscription_id,
      customers (
        first_name,
        last_name
      ),
      services (
        name
      )
    `)
    .is("subscription_id", null)
    .neq("status", "cancelled")
    .order("scheduled_date", {
      ascending: false,
    });

  const {
    data: invoiceData,
    error: invoiceError,
  } = await supabase
    .from("invoices")
    .select(`
      id,
      subscription_id,
      job_id,
      description,
      amount_cents,
      status,
      issue_date,
      due_date,
      paid_at,
      payment_method,
      payment_notes,
      billing_period_start,
      billing_period_end,
      customers (
        first_name,
        last_name
      )
    `)
    .order("issue_date", {
      ascending: false,
    })
    .order("created_at", {
      ascending: false,
    });

  const invoices =
    (invoiceData ?? []) as InvoiceRow[];

  const unpaidInvoices = invoices.filter(
    (invoice) => invoice.status === "unpaid"
  );

  const historyInvoices = invoices.filter(
    (invoice) =>
      invoice.status === "paid" ||
      invoice.status === "void"
  );

  const today = getTodayDate();

  return (
    <main className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-stone-500">
              Duck Home Services
            </p>

            <h1 className="text-2xl font-semibold text-stone-900">
              Invoices & Payments
            </h1>
          </div>

          <Link
            href="/admin"
            className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
          >
            Back to Dashboard
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-10">
        {saved === "created" && (
          <SuccessMessage message="Invoice created successfully." />
        )}

        {saved === "paid" && (
          <SuccessMessage message="Payment recorded successfully." />
        )}

        {saved === "voided" && (
          <SuccessMessage message="Invoice voided." />
        )}

        {saved === "generated" && (
          <SuccessMessage
            message={`${count ?? "0"} due invoice${
              count === "1" ? "" : "s"
            } generated.`}
          />
        )}

        <div className="mb-8 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-semibold text-stone-900">
                Subscription Billing
              </h2>

              <p className="mt-2 text-sm leading-6 text-stone-600">
                Generate subscription invoices that are due through today.
                Future billing periods will not be created early.
              </p>
            </div>

            <form action={generateDueInvoices}>
              <button
                type="submit"
                className="w-full rounded-xl bg-stone-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-stone-700 sm:w-auto"
              >
                Generate Due Invoices
              </button>
            </form>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[400px_1fr]">
          <div>
            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-stone-900">
                Create Invoice
              </h2>

              <p className="mt-2 text-sm leading-6 text-stone-600">
                Create an invoice manually for a subscription,
                one-time job, or other charge.
              </p>

              <form
                action={createInvoice}
                className="mt-6 space-y-4"
              >
                <div>
                  <label
                    htmlFor="source_type"
                    className="mb-2 block text-sm font-medium text-stone-700"
                  >
                    Invoice For
                  </label>

                  <select
                    id="source_type"
                    name="source_type"
                    defaultValue="subscription"
                    className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3"
                  >
                    <option value="subscription">
                      Subscription
                    </option>

                    <option value="job">
                      One-Time Job
                    </option>

                    <option value="manual">
                      Other / Manual
                    </option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="subscription_id"
                    className="mb-2 block text-sm font-medium text-stone-700"
                  >
                    Subscription
                  </label>

                  <select
                    id="subscription_id"
                    name="subscription_id"
                    defaultValue=""
                    className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3"
                  >
                    <option value="">
                      Select subscription
                    </option>

                    {subscriptions?.map(
                      (subscription) => {
                        const customer =
                          getRelation(
                            subscription.customers
                          );

                        const service =
                          getRelation<NamedRelation>(
                            subscription.services
                          );

                        return (
                          <option
                            key={subscription.id}
                            value={subscription.id}
                          >
                            {customer
                              ? `${customer.first_name} ${customer.last_name}`
                              : "Customer"}
                            {" — "}
                            {subscription.name ||
                              service?.name ||
                              "Subscription"}
                            {" — $"}
                            {(
                              subscription.price_cents /
                              100
                            ).toFixed(2)}
                          </option>
                        );
                      }
                    )}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="job_id"
                    className="mb-2 block text-sm font-medium text-stone-700"
                  >
                    One-Time Job
                  </label>

                  <select
                    id="job_id"
                    name="job_id"
                    defaultValue=""
                    className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3"
                  >
                    <option value="">
                      Select one-time job
                    </option>

                    {jobs?.map((job) => {
                      const customer =
                        getRelation(
                          job.customers
                        );

                      const service =
                        getRelation<NamedRelation>(
                          job.services
                        );

                      return (
                        <option
                          key={job.id}
                          value={job.id}
                        >
                          {formatDate(
                            job.scheduled_date
                          )}
                          {" — "}
                          {customer
                            ? `${customer.first_name} ${customer.last_name}`
                            : "Customer"}
                          {" — "}
                          {service?.name ??
                            "Service"}
                          {job.price_cents !==
                          null
                            ? ` — $${(
                                job.price_cents /
                                100
                              ).toFixed(2)}`
                            : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="customer_id"
                    className="mb-2 block text-sm font-medium text-stone-700"
                  >
                    Customer for Manual Invoice
                  </label>

                  <select
                    id="customer_id"
                    name="customer_id"
                    defaultValue=""
                    className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3"
                  >
                    <option value="">
                      Select customer
                    </option>

                    {customers?.map(
                      (customer) => (
                        <option
                          key={customer.id}
                          value={customer.id}
                        >
                          {customer.first_name}{" "}
                          {customer.last_name}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="description"
                    className="mb-2 block text-sm font-medium text-stone-700"
                  >
                    Description
                  </label>

                  <input
                    id="description"
                    name="description"
                    type="text"
                    required
                    placeholder="September 2 Bin Plan"
                    className="w-full rounded-xl border border-stone-300 px-4 py-3"
                  />
                </div>

                <div>
                  <label
                    htmlFor="amount"
                    className="mb-2 block text-sm font-medium text-stone-700"
                  >
                    Amount
                  </label>

                  <input
                    id="amount"
                    name="amount"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    placeholder="18.00"
                    className="w-full rounded-xl border border-stone-300 px-4 py-3"
                  />
                </div>

                <div>
                  <label
                    htmlFor="issue_date"
                    className="mb-2 block text-sm font-medium text-stone-700"
                  >
                    Issue Date
                  </label>

                  <input
                    id="issue_date"
                    name="issue_date"
                    type="date"
                    required
                    defaultValue={today}
                    className="w-full rounded-xl border border-stone-300 px-4 py-3"
                  />
                </div>

                <div>
                  <label
                    htmlFor="due_date"
                    className="mb-2 block text-sm font-medium text-stone-700"
                  >
                    Due Date
                  </label>

                  <input
                    id="due_date"
                    name="due_date"
                    type="date"
                    className="w-full rounded-xl border border-stone-300 px-4 py-3"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full rounded-xl bg-stone-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-stone-700"
                >
                  Create Invoice
                </button>
              </form>
            </div>
          </div>

          <div>
            <div>
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                <div>
                  <h2 className="text-2xl font-semibold text-stone-900">
                    Unpaid Invoices
                  </h2>

                  <p className="mt-2 text-sm text-stone-600">
                    Payments that are still outstanding.
                  </p>
                </div>

                <p className="text-lg font-semibold text-stone-900">
                  {formatMoney(
                    unpaidInvoices.reduce(
                      (total, invoice) =>
                        total +
                        invoice.amount_cents,
                      0
                    )
                  )}{" "}
                  outstanding
                </p>
              </div>

              <div className="mt-6">
                {invoiceError ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
                    Unable to load invoices:{" "}
                    {invoiceError.message}
                  </div>
                ) : unpaidInvoices.length === 0 ? (
                  <EmptyState message="No unpaid invoices." />
                ) : (
                  <div className="space-y-5">
                    {unpaidInvoices.map(
                      (invoice) => (
                        <UnpaidInvoiceCard
                          key={invoice.id}
                          invoice={invoice}
                        />
                      )
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-12 border-t border-stone-200 pt-10">
              <h2 className="text-xl font-semibold text-stone-900">
                Payment History
              </h2>

              <p className="mt-2 text-sm text-stone-600">
                Paid and voided invoices.
              </p>

              <div className="mt-6">
                {historyInvoices.length === 0 ? (
                  <EmptyState message="No payment history yet." />
                ) : (
                  <div className="space-y-4">
                    {historyInvoices.map(
                      (invoice) => (
                        <HistoryInvoiceCard
                          key={invoice.id}
                          invoice={invoice}
                        />
                      )
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function UnpaidInvoiceCard({
  invoice,
}: {
  invoice: InvoiceRow;
}) {
  const customer = getRelation(
    invoice.customers
  );

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col justify-between gap-5 sm:flex-row">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-stone-900">
              {invoice.description}
            </h3>

            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
              Unpaid
            </span>

            {invoice.subscription_id && (
              <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-600">
                Subscription
              </span>
            )}

            {invoice.job_id && (
              <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-600">
                One-Time Job
              </span>
            )}
          </div>

          <p className="mt-2 font-medium text-stone-700">
            {customer
              ? `${customer.first_name} ${customer.last_name}`
              : "Customer"}
          </p>

          <p className="mt-3 text-sm text-stone-500">
            Issued{" "}
            {formatDate(invoice.issue_date)}
          </p>

          {invoice.due_date && (
            <p className="mt-1 text-sm text-stone-500">
              Due{" "}
              {formatDate(invoice.due_date)}
            </p>
          )}

          {invoice.billing_period_start &&
            invoice.billing_period_end && (
              <p className="mt-1 text-sm text-stone-500">
                Billing period:{" "}
                {formatDate(
                  invoice.billing_period_start
                )}{" "}
                –{" "}
                {formatDate(
                  invoice.billing_period_end
                )}
              </p>
            )}
        </div>

        <div className="shrink-0 sm:text-right">
          <p className="text-2xl font-semibold text-stone-900">
            {formatMoney(
              invoice.amount_cents
            )}
          </p>
        </div>
      </div>

      <div className="mt-6 border-t border-stone-100 pt-5">
        <form
          action={markInvoicePaid}
          className="grid gap-3 md:grid-cols-[180px_1fr_auto]"
        >
          <input
            type="hidden"
            name="invoice_id"
            value={invoice.id}
          />

          <select
            name="payment_method"
            required
            defaultValue=""
            className="rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm"
          >
            <option value="" disabled>
              Payment method
            </option>

            <option value="cash">
              Cash
            </option>

            <option value="zelle">
              Zelle
            </option>

            <option value="apple_cash">
              Apple Cash
            </option>

            <option value="venmo">
              Venmo
            </option>

            <option value="paypal">
              PayPal
            </option>

            <option value="other">
              Other
            </option>
          </select>

          <input
            name="payment_notes"
            type="text"
            placeholder="Optional payment note"
            className="rounded-xl border border-stone-300 px-4 py-2.5 text-sm"
          />

          <button
            type="submit"
            className="rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-stone-700"
          >
            Mark Paid
          </button>
        </form>

        <form
          action={voidInvoice}
          className="mt-3"
        >
          <input
            type="hidden"
            name="invoice_id"
            value={invoice.id}
          />

          <button
            type="submit"
            className="text-sm font-medium text-red-700 hover:text-red-900"
          >
            Void Invoice
          </button>
        </form>
      </div>
    </div>
  );
}

function HistoryInvoiceCard({
  invoice,
}: {
  invoice: InvoiceRow;
}) {
  const customer = getRelation(
    invoice.customers
  );

  const isPaid =
    invoice.status === "paid";

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col justify-between gap-4 sm:flex-row">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-stone-900">
              {invoice.description}
            </h3>

            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                isPaid
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {isPaid ? "Paid" : "Void"}
            </span>
          </div>

          <p className="mt-2 text-sm text-stone-600">
            {customer
              ? `${customer.first_name} ${customer.last_name}`
              : "Customer"}
          </p>

          {invoice.billing_period_start &&
            invoice.billing_period_end && (
              <p className="mt-2 text-sm text-stone-500">
                Billing period:{" "}
                {formatDate(
                  invoice.billing_period_start
                )}{" "}
                –{" "}
                {formatDate(
                  invoice.billing_period_end
                )}
              </p>
            )}

          {isPaid &&
            invoice.payment_method && (
              <p className="mt-2 text-sm text-stone-500">
                Paid by{" "}
                {formatPaymentMethod(
                  invoice.payment_method
                )}
                {invoice.paid_at
                  ? ` on ${formatDateTime(
                      invoice.paid_at
                    )}`
                  : ""}
              </p>
            )}

          {invoice.payment_notes && (
            <p className="mt-2 text-sm text-stone-500">
              {invoice.payment_notes}
            </p>
          )}
        </div>

        <div className="shrink-0 sm:text-right">
          <p className="text-lg font-semibold text-stone-900">
            {formatMoney(
              invoice.amount_cents
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

function SuccessMessage({
  message,
}: {
  message: string;
}) {
  return (
    <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 px-5 py-4">
      <p className="font-medium text-green-800">
        {message}
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

function getTodayDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
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

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
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