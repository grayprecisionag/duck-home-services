import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  approveServiceRequest,
  declineServiceRequest,
  quoteServiceRequest,
} from "./actions";

type CustomerRelation = {
  first_name: string;
  last_name: string;
  street_address: string | null;
  city: string | null;
};

type ServiceRequest = {
  id: string;
  title: string;
  description: string;
  preferred_date: string | null;
  preferred_time: string | null;
  quoted_price_cents: number | null;
  admin_notes: string | null;
  status: string;
  reviewed_at: string | null;
  created_at: string;
  customers:
    | CustomerRelation
    | CustomerRelation[]
    | null;
};

export default async function ServiceRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{
    saved?: string;
  }>;
}) {
  const { saved } = await searchParams;

  const supabase = await createClient();

  const { data, error } =
    await supabase
      .from("custom_service_requests")
      .select(`
        id,
        title,
        description,
        preferred_date,
        preferred_time,
        quoted_price_cents,
        admin_notes,
        status,
        reviewed_at,
        created_at,
        customers (
          first_name,
          last_name,
          street_address,
          city
        )
      `)
      .order("created_at", {
        ascending: false,
      });

  const requests =
    (data as ServiceRequest[] | null) ?? [];

  const openRequests =
    requests.filter(
      (request) =>
        request.status === "pending" ||
        request.status === "quoted" ||
        request.status === "accepted"
    );

  const reviewedRequests =
    requests.filter(
      (request) =>
        request.status === "approved" ||
        request.status === "declined" ||
        request.status === "cancelled"
    );

  const readyToSchedule =
    openRequests.filter(
      (request) =>
        request.status === "accepted"
    ).length;

  return (
    <main className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-stone-500">
              Duck Home Services
            </p>

            <h1 className="text-2xl font-semibold text-stone-900">
              Service Requests
            </h1>
          </div>

          <Link
            href="/admin"
            className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
          >
            Back to Admin
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-10">
        {saved === "quoted" && (
          <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4">
            <p className="font-medium text-blue-800">
              Quote saved successfully. Waiting
              for the customer to respond.
            </p>
          </div>
        )}

        {saved === "approved" && (
          <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 px-5 py-4">
            <p className="font-medium text-green-800">
              Service request approved and
              added to the schedule.
            </p>
          </div>
        )}

        {saved === "declined" && (
          <div className="mb-6 rounded-2xl border border-stone-300 bg-white px-5 py-4">
            <p className="font-medium text-stone-800">
              Service request declined.
            </p>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-stone-500">
              Open Requests
            </p>

            <p className="mt-2 text-3xl font-semibold text-stone-900">
              {openRequests.length}
            </p>
          </div>

          <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
            <p className="text-sm text-green-700">
              Ready to Schedule
            </p>

            <p className="mt-2 text-3xl font-semibold text-green-900">
              {readyToSchedule}
            </p>
          </div>
        </div>

        <div className="mt-10">
          <h2 className="text-2xl font-semibold text-stone-900">
            Open Requests
          </h2>

          <p className="mt-2 text-sm text-stone-600">
            Review requests, send quotes, and
            schedule jobs after customers accept.
          </p>
        </div>

        {error ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
            Unable to load service requests:{" "}
            {error.message}
          </div>
        ) : openRequests.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-stone-300 bg-white p-10 text-center">
            <p className="font-medium text-stone-800">
              No open service requests.
            </p>

            <p className="mt-2 text-sm text-stone-500">
              New customer requests will
              appear here.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            {openRequests.map((request) => {
              const customer =
                getRelation(request.customers);

              return (
                <div
                  key={request.id}
                  className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
                >
                  <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-xl font-semibold text-stone-900">
                          {request.title}
                        </h3>

                        <StatusBadge
                          status={request.status}
                        />
                      </div>

                      <p className="mt-4 font-medium text-stone-800">
                        {customer
                          ? `${customer.first_name} ${customer.last_name}`
                          : "Customer"}
                      </p>

                      {customer?.street_address && (
                        <p className="mt-1 text-sm text-stone-600">
                          {customer.street_address}
                          {customer.city
                            ? `, ${customer.city}`
                            : ""}
                        </p>
                      )}

                      <div className="mt-5 rounded-xl bg-stone-50 p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
                          Customer Request
                        </p>

                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-stone-700">
                          {request.description}
                        </p>
                      </div>

                      <div className="mt-5 grid gap-4 sm:grid-cols-2">
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
                            Preferred Date
                          </p>

                          <p className="mt-1 text-sm font-medium text-stone-900">
                            {request.preferred_date
                              ? formatDate(
                                  request.preferred_date
                                )
                              : "No preference"}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
                            Preferred Time
                          </p>

                          <p className="mt-1 text-sm font-medium text-stone-900">
                            {request.preferred_time
                              ? formatTime(
                                  request.preferred_time
                                )
                              : "No preference"}
                          </p>
                        </div>
                      </div>

                      {request.admin_notes && (
                        <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4">
                          <p className="text-xs font-medium uppercase tracking-wide text-blue-600">
                            Admin Notes
                          </p>

                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-blue-900">
                            {request.admin_notes}
                          </p>
                        </div>
                      )}

                      <p className="mt-4 text-xs text-stone-400">
                        Requested{" "}
                        {formatDateTime(
                          request.created_at
                        )}
                      </p>
                    </div>

                    <div>
                      {request.status ===
                        "pending" && (
                        <>
                          <form
                            action={
                              quoteServiceRequest
                            }
                            className="rounded-2xl border border-stone-200 bg-stone-50 p-5"
                          >
                            <input
                              type="hidden"
                              name="request_id"
                              value={request.id}
                            />

                            <h4 className="font-semibold text-stone-900">
                              Create Quote
                            </h4>

                            <label className="mt-4 block">
                              <span className="text-xs font-medium uppercase tracking-wide text-stone-500">
                                Quoted Price
                              </span>

                              <div className="mt-2 flex rounded-xl border border-stone-300 bg-white">
                                <span className="flex items-center border-r border-stone-300 px-3 text-stone-500">
                                  $
                                </span>

                                <input
                                  type="number"
                                  name="quoted_price"
                                  required
                                  min="0"
                                  step="0.01"
                                  placeholder="0.00"
                                  className="w-full rounded-r-xl px-3 py-2.5 text-sm outline-none"
                                />
                              </div>
                            </label>

                            <label className="mt-4 block">
                              <span className="text-xs font-medium uppercase tracking-wide text-stone-500">
                                Admin Notes
                              </span>

                              <textarea
                                name="admin_notes"
                                rows={4}
                                placeholder="Optional notes about the quote or job."
                                className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm"
                              />
                            </label>

                            <button
                              type="submit"
                              className="mt-4 w-full rounded-xl bg-stone-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-stone-700"
                            >
                              Send Quote
                            </button>
                          </form>

                          <form
                            action={
                              declineServiceRequest
                            }
                            className="mt-3"
                          >
                            <input
                              type="hidden"
                              name="request_id"
                              value={request.id}
                            />

                            <button
                              type="submit"
                              className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
                            >
                              Decline Request
                            </button>
                          </form>
                        </>
                      )}

                      {request.status ===
                        "quoted" && (
                        <>
                          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
                            <p className="text-xs font-medium uppercase tracking-wide text-blue-600">
                              Quote Sent
                            </p>

                            <p className="mt-2 text-2xl font-semibold text-blue-900">
                              {request.quoted_price_cents !==
                              null
                                ? formatMoney(
                                    request.quoted_price_cents
                                  )
                                : "—"}
                            </p>

                            <p className="mt-3 text-sm leading-6 text-blue-800">
                              Waiting for the customer
                              to accept or decline this
                              quote.
                            </p>
                          </div>

                          <form
                            action={
                              declineServiceRequest
                            }
                            className="mt-3"
                          >
                            <input
                              type="hidden"
                              name="request_id"
                              value={request.id}
                            />

                            <button
                              type="submit"
                              className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
                            >
                              Cancel Request
                            </button>
                          </form>
                        </>
                      )}

                      {request.status ===
                        "accepted" && (
                        <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
                          <p className="text-xs font-medium uppercase tracking-wide text-green-700">
                            Customer Accepted
                          </p>

                          <p className="mt-2 text-2xl font-semibold text-green-900">
                            {request.quoted_price_cents !==
                            null
                              ? formatMoney(
                                  request.quoted_price_cents
                                )
                              : "—"}
                          </p>

                          <p className="mt-3 text-sm leading-6 text-green-800">
                            This request is ready
                            to be scheduled.
                          </p>

                          <form
                            action={
                              approveServiceRequest
                            }
                            className="mt-5 space-y-4"
                          >
                            <input
                              type="hidden"
                              name="request_id"
                              value={request.id}
                            />

                            <label className="block">
                              <span className="text-xs font-medium uppercase tracking-wide text-green-800">
                                Schedule Date
                              </span>

                              <input
                                type="date"
                                name="scheduled_date"
                                required
                                defaultValue={
                                  request.preferred_date ??
                                  ""
                                }
                                className="mt-2 w-full rounded-xl border border-green-300 bg-white px-3 py-2.5 text-sm text-stone-900"
                              />
                            </label>

                            <label className="block">
                              <span className="text-xs font-medium uppercase tracking-wide text-green-800">
                                Schedule Time
                              </span>

                              <input
                                type="time"
                                name="scheduled_time"
                                defaultValue={
                                  request.preferred_time ??
                                  ""
                                }
                                className="mt-2 w-full rounded-xl border border-green-300 bg-white px-3 py-2.5 text-sm text-stone-900"
                              />
                            </label>

                            <button
                              type="submit"
                              className="w-full rounded-xl bg-stone-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-stone-700"
                            >
                              Approve & Schedule
                            </button>
                          </form>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-12">
          <h2 className="text-2xl font-semibold text-stone-900">
            Recently Reviewed
          </h2>

          <p className="mt-2 text-sm text-stone-600">
            Scheduled, declined, or cancelled
            custom service requests.
          </p>

          {reviewedRequests.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-stone-300 bg-white p-8">
              <p className="text-sm text-stone-600">
                No reviewed service requests yet.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {reviewedRequests
                .slice(0, 10)
                .map((request) => {
                  const customer =
                    getRelation(
                      request.customers
                    );

                  return (
                    <div
                      key={request.id}
                      className="flex flex-col justify-between gap-3 rounded-2xl border border-stone-200 bg-white p-5 sm:flex-row sm:items-center"
                    >
                      <div>
                        <p className="font-medium text-stone-900">
                          {request.title}
                        </p>

                        <p className="mt-1 text-sm text-stone-500">
                          {customer
                            ? `${customer.first_name} ${customer.last_name}`
                            : "Customer"}

                          {request.quoted_price_cents !==
                            null
                            ? ` · ${formatMoney(
                                request.quoted_price_cents
                              )}`
                            : ""}
                        </p>
                      </div>

                      <StatusBadge
                        status={request.status}
                      />
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </section>
    </main>
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

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const label =
    status === "pending"
      ? "Pending"
      : status === "quoted"
        ? "Waiting on Customer"
        : status === "accepted"
          ? "Ready to Schedule"
          : status === "approved"
            ? "Scheduled"
            : status === "declined"
              ? "Declined"
              : status === "cancelled"
                ? "Cancelled"
                : status;

  const className =
    status === "pending"
      ? "bg-amber-100 text-amber-700"
      : status === "quoted"
        ? "bg-blue-100 text-blue-700"
        : status === "accepted"
          ? "bg-green-100 text-green-700"
          : status === "approved"
            ? "bg-green-100 text-green-700"
            : status === "declined"
              ? "bg-red-100 text-red-700"
              : "bg-stone-100 text-stone-700";

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-medium ${className}`}
    >
      {label}
    </span>
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