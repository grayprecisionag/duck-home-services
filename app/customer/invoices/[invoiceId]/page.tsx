import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PrintReceiptButton from "./PrintReceiptButton";

export const dynamic = "force-dynamic";

type CustomerInvoicePageProps = {
  params: Promise<{
    invoiceId: string;
  }>;
};

type CustomerRecord = {
  id: string;
  first_name: string;
  last_name: string;
};

type InvoiceRow = {
  id: string;
  customer_id: string;
  description: string;
  amount_cents: number;
  status: string;
  issue_date: string;
  due_date: string | null;
  paid_at: string | null;
  payment_method: string | null;
  square_payment_id: string | null;
};

export default async function CustomerInvoicePage({
  params,
}: CustomerInvoicePageProps) {
  const { invoiceId } = await params;

  const supabase = await createClient();

  const { data: claimsData } =
    await supabase.auth.getClaims();

  const userId = claimsData?.claims?.sub;

  if (!userId) {
    redirect("/login");
  }

  const { data: customerData } = await supabase
    .from("customers")
    .select(`
      id,
      first_name,
      last_name
    `)
    .eq("profile_id", userId)
    .maybeSingle();

  const customer =
    customerData as CustomerRecord | null;

  if (!customer) {
    redirect("/customer");
  }

  const { data: invoiceData } = await supabase
    .from("invoices")
    .select(`
      id,
      customer_id,
      description,
      amount_cents,
      status,
      issue_date,
      due_date,
      paid_at,
      payment_method,
      square_payment_id
    `)
    .eq("id", invoiceId)
    .eq("customer_id", customer.id)
    .maybeSingle();

  const invoice =
    invoiceData as InvoiceRow | null;

  if (!invoice) {
    redirect("/customer");
  }

  const isPaid =
    invoice.status === "paid";

  return (
    <main className="min-h-screen bg-stone-50 print:bg-white">
      <header className="border-b border-stone-200 bg-white print:hidden">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-6 py-5">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-stone-500">
              Duck Home Services
            </p>

            <h1 className="text-2xl font-semibold text-stone-900">
              {isPaid ? "Receipt" : "Invoice"}
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

      <section className="mx-auto max-w-4xl px-6 py-10 print:max-w-none print:px-0 print:py-0">
        <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm print:rounded-none print:border-0 print:shadow-none">
          <div className="border-b border-stone-200 p-6 sm:p-8">
            <div className="mb-8 hidden print:block">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">
                Duck Home Services
              </p>

              <h1 className="mt-2 text-3xl font-semibold text-stone-900">
                {isPaid ? "Payment Receipt" : "Invoice"}
              </h1>
            </div>

            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
              <div>
                <p className="text-sm font-medium text-stone-500">
                  {isPaid
                    ? "Receipt for"
                    : "Invoice for"}
                </p>

                <h2 className="mt-1 text-2xl font-semibold text-stone-900">
                  {customer.first_name}{" "}
                  {customer.last_name}
                </h2>

                <p className="mt-4 text-lg font-medium text-stone-800">
                  {invoice.description}
                </p>
              </div>

              <div className="sm:text-right">
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                    isPaid
                      ? "bg-green-100 text-green-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {isPaid ? "Paid" : "Unpaid"}
                </span>

                <p className="mt-4 text-3xl font-semibold text-stone-900">
                  {formatMoney(
                    invoice.amount_cents
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 border-b border-stone-200 p-6 sm:grid-cols-3 sm:p-8">
            <InvoiceDetail
              label="Issued"
              value={formatDate(
                invoice.issue_date
              )}
            />

            <InvoiceDetail
              label="Due"
              value={
                invoice.due_date
                  ? formatDate(
                      invoice.due_date
                    )
                  : "No due date"
              }
            />

            <InvoiceDetail
              label="Status"
              value={
                isPaid
                  ? "Paid in full"
                  : "Payment due"
              }
            />
          </div>

          {isPaid ? (
            <>
              <div className="border-b border-stone-200 p-6 sm:p-8">
                <div className="rounded-2xl border border-green-200 bg-green-50 p-6 print:border-stone-200 print:bg-white">
                  <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
                    <div>
                      <p className="text-sm font-medium text-green-700 print:text-stone-500">
                        Payment received
                      </p>

                      <h3 className="mt-1 text-2xl font-semibold text-green-950 print:text-stone-900">
                        {formatMoney(
                          invoice.amount_cents
                        )}
                      </h3>

                      <p className="mt-2 text-sm text-green-800 print:text-stone-600">
                        Thank you for your
                        payment.
                      </p>
                    </div>

                    <div className="grid gap-4 sm:text-right">
                      <ReceiptDetail
                        label="Payment date"
                        value={
                          invoice.paid_at
                            ? formatDateTime(
                                invoice.paid_at
                              )
                            : "Paid"
                        }
                      />

                      <ReceiptDetail
                        label="Payment method"
                        value={formatPaymentMethod(
                          invoice.payment_method
                        )}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 sm:p-8">
                <h3 className="text-lg font-semibold text-stone-900">
                  Payment details
                </h3>

                <div className="mt-5 grid gap-5 sm:grid-cols-2">
                  <InvoiceDetail
                    label="Amount paid"
                    value={formatMoney(
                      invoice.amount_cents
                    )}
                  />

                  <InvoiceDetail
                    label="Payment method"
                    value={formatPaymentMethod(
                      invoice.payment_method
                    )}
                  />
                </div>

                {invoice.square_payment_id && (
                  <div className="mt-6 rounded-2xl bg-stone-50 p-5 print:border print:border-stone-200 print:bg-white">
                    <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">
                      Payment reference
                    </p>

                    <p className="mt-2 break-all font-mono text-xs text-stone-600">
                      {
                        invoice.square_payment_id
                      }
                    </p>
                  </div>
                )}

                <div className="mt-8 flex flex-wrap gap-3 print:hidden">
                  <PrintReceiptButton />

                  <Link
                    href="/customer/history"
                    className="rounded-xl border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-700 transition hover:bg-stone-100"
                  >
                    Completed & History
                  </Link>
                </div>
              </div>
            </>
          ) : (
            <div className="p-6 sm:p-8">
              <div className="rounded-2xl border border-stone-200 bg-stone-50 p-6">
                <h3 className="text-xl font-semibold text-stone-900">
                  Pay this invoice
                </h3>

                <p className="mt-2 text-sm leading-6 text-stone-600">
                  Pay securely through Square.
                </p>

                <form
                  action={`/customer/invoices/${invoice.id}/checkout`}
                  method="post"
                >
                  <button
                    type="submit"
                    className="mt-5 rounded-xl bg-stone-900 px-5 py-3 font-semibold text-white transition hover:bg-stone-800"
                  >
                    Pay{" "}
                    {formatMoney(
                      invoice.amount_cents
                    )}{" "}
                    with Square
                  </button>
                </form>

                <p className="mt-3 text-xs text-stone-500">
                  Sandbox test payment — no
                  real money will be charged.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function InvoiceDetail({
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

function ReceiptDetail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-green-700 print:text-stone-400">
        {label}
      </p>

      <p className="mt-1 font-medium text-green-950 print:text-stone-900">
        {value}
      </p>
    </div>
  );
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
  }).format(new Date(date));
}

function formatPaymentMethod(
  method: string | null
) {
  if (!method) {
    return "Payment received";
  }

  switch (method) {
    case "square":
      return "Square";
    case "cash":
      return "Cash";
    case "zelle":
      return "Zelle";
    case "apple_cash":
      return "Apple Cash";
    case "venmo":
      return "Venmo";
    case "paypal":
      return "PayPal";
    default:
      return "Other";
  }
}