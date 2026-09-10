import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  approveBookingRequest,
  declineBookingRequest,
} from "./actions";

type BookingRequest = {
  id: string;
  customer_id: string;
  service_id: string;
  request_type: string;
  preferred_date: string;
  preferred_time: string | null;
  notes: string | null;
  status: string;
  created_at: string;
};

type Customer = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
};

type Service = {
  id: string;
  name: string;
  price_cents: number | null;
};

export default async function BookingRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{
    saved?: string;
  }>;
}) {
  const { saved } = await searchParams;

  const supabase = await createClient();

  const { data: requestsData } =
    await supabase
      .from("booking_requests")
      .select(`
        id,
        customer_id,
        service_id,
        request_type,
        preferred_date,
        preferred_time,
        notes,
        status,
        created_at
      `)
      .order("created_at", {
        ascending: false,
      });

  const requests =
    (requestsData as BookingRequest[] | null) ??
    [];

  const customerIds = [
    ...new Set(
      requests.map(
        (request) => request.customer_id
      )
    ),
  ];

  const serviceIds = [
    ...new Set(
      requests.map(
        (request) => request.service_id
      )
    ),
  ];

  const { data: customersData } =
    customerIds.length > 0
      ? await supabase
          .from("customers")
          .select(`
            id,
            first_name,
            last_name,
            email
          `)
          .in("id", customerIds)
      : { data: [] };

  const { data: servicesData } =
    serviceIds.length > 0
      ? await supabase
          .from("services")
          .select(`
            id,
            name,
            price_cents
          `)
          .in("id", serviceIds)
      : { data: [] };

  const customers =
    (customersData as Customer[] | null) ??
    [];

  const services =
    (servicesData as Service[] | null) ??
    [];

  const customerMap = new Map(
    customers.map((customer) => [
      customer.id,
      customer,
    ])
  );

  const serviceMap = new Map(
    services.map((service) => [
      service.id,
      service,
    ])
  );

  const pendingRequests = requests.filter(
    (request) =>
      request.status === "pending"
  );

  const reviewedRequests = requests.filter(
    (request) =>
      request.status !== "pending"
  );

  return (
    <main className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-stone-500">
              Duck Home Services
            </p>

            <h1 className="text-2xl font-semibold text-stone-900">
              Booking Requests
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

      <section className="mx-auto max-w-6xl px-6 py-10">
        {saved === "approved" && (
          <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 px-5 py-4">
            <p className="text-sm font-medium text-green-800">
              Booking request approved successfully.
            </p>
          </div>
        )}

        {saved === "declined" && (
          <div className="mb-6 rounded-2xl border border-stone-300 bg-white px-5 py-4">
            <p className="text-sm font-medium text-stone-700">
              Booking request declined.
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-stone-900">
              Pending Requests
            </h2>

            <p className="mt-2 text-sm text-stone-600">
              Review requests submitted through
              Book a Service.
            </p>
          </div>

          {pendingRequests.length > 0 && (
            <span className="rounded-full bg-stone-900 px-3 py-1 text-xs font-semibold text-white">
              {pendingRequests.length} pending
            </span>
          )}
        </div>

        {pendingRequests.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center">
            <p className="text-sm text-stone-500">
              No booking requests are waiting
              for review.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            {pendingRequests.map((request) => {
              const customer =
                customerMap.get(
                  request.customer_id
                );

              const service =
                serviceMap.get(
                  request.service_id
                );

              return (
                <div
                  key={request.id}
                  className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-stone-900">
                          {customer
                            ? `${customer.first_name} ${customer.last_name}`
                            : "Customer"}
                        </h3>

                        <RequestTypeBadge
                          type={
                            request.request_type
                          }
                        />
                      </div>

                      {customer?.email && (
                        <p className="mt-1 text-sm text-stone-500">
                          {customer.email}
                        </p>
                      )}
                    </div>

                    <p className="text-xs text-stone-400">
                      Requested{" "}
                      {formatDateTime(
                        request.created_at
                      )}
                    </p>
                  </div>

                  <div className="mt-5 grid gap-4 rounded-xl bg-stone-50 p-5 sm:grid-cols-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
                        Service
                      </p>

                      <p className="mt-1 font-medium text-stone-900">
                        {service?.name ??
                          "Service"}
                      </p>

                      {service?.price_cents !==
                        null &&
                        service?.price_cents !==
                          undefined && (
                          <p className="mt-1 text-sm text-stone-600">
                            {formatMoney(
                              service.price_cents
                            )}
                          </p>
                        )}
                    </div>

                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
                        Preferred Date
                      </p>

                      <p className="mt-1 font-medium text-stone-900">
                        {formatDate(
                          request.preferred_date
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
                        Preferred Time
                      </p>

                      <p className="mt-1 font-medium text-stone-900">
                        {request.preferred_time
                          ? formatTime(
                              request.preferred_time
                            )
                          : "No preference"}
                      </p>
                    </div>
                  </div>

                  {request.notes && (
                    <div className="mt-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
                        Customer Notes
                      </p>

                      <p className="mt-2 text-sm leading-6 text-stone-700">
                        {request.notes}
                      </p>
                    </div>
                  )}

                  <div className="mt-6 flex flex-wrap gap-3">
                    <form
                      action={
                        approveBookingRequest
                      }
                    >
                      <input
                        type="hidden"
                        name="request_id"
                        value={request.id}
                      />

                      <button
                        type="submit"
                        className="rounded-xl bg-stone-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-stone-700"
                      >
                        {request.request_type ===
                        "recurring"
                          ? "Approve & Create Subscription"
                          : "Approve & Schedule"}
                      </button>
                    </form>

                    <form
                      action={
                        declineBookingRequest
                      }
                    >
                      <input
                        type="hidden"
                        name="request_id"
                        value={request.id}
                      />

                      <button
                        type="submit"
                        className="rounded-xl border border-stone-300 bg-white px-5 py-3 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
                      >
                        Decline
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-12">
          <h2 className="text-xl font-semibold text-stone-900">
            Reviewed Requests
          </h2>

          {reviewedRequests.length === 0 ? (
            <p className="mt-4 text-sm text-stone-500">
              No reviewed requests yet.
            </p>
          ) : (
            <div className="mt-5 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
              <div className="divide-y divide-stone-200">
                {reviewedRequests.map(
                  (request) => {
                    const customer =
                      customerMap.get(
                        request.customer_id
                      );

                    const service =
                      serviceMap.get(
                        request.service_id
                      );

                    return (
                      <div
                        key={request.id}
                        className="flex flex-wrap items-center justify-between gap-4 p-5"
                      >
                        <div>
                          <p className="font-medium text-stone-900">
                            {customer
                              ? `${customer.first_name} ${customer.last_name}`
                              : "Customer"}
                          </p>

                          <p className="mt-1 text-sm text-stone-600">
                            {service?.name ??
                              "Service"}{" "}
                            ·{" "}
                            {formatDate(
                              request.preferred_date
                            )}
                          </p>
                        </div>

                        <StatusBadge
                          status={
                            request.status
                          }
                        />
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function RequestTypeBadge({
  type,
}: {
  type: string;
}) {
  return (
    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
      {type === "recurring"
        ? "Recurring"
        : "One-Time"}
    </span>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const label =
    status === "approved"
      ? "Approved"
      : status === "declined"
        ? "Declined"
        : status === "cancelled"
          ? "Cancelled"
          : status;

  const className =
    status === "approved"
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