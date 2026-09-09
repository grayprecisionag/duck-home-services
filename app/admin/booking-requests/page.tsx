import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createCustomServiceRequest } from "./actions";

type CustomServiceRequest = {
  id: string;
  title: string;
  description: string;
  preferred_date: string | null;
  preferred_time: string | null;
  quoted_price_cents: number | null;
  status: string;
  created_at: string;
};

export default async function RequestServicePage({
  searchParams,
}: {
  searchParams: Promise<{
    saved?: string;
  }>;
}) {
  const { saved } = await searchParams;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: customer } =
    await supabase
      .from("customers")
      .select("id")
      .eq("profile_id", user.id)
      .single();

  let requests: CustomServiceRequest[] = [];

  if (customer) {
    const { data } = await supabase
      .from("custom_service_requests")
      .select(`
        id,
        title,
        description,
        preferred_date,
        preferred_time,
        quoted_price_cents,
        status,
        created_at
      `)
      .eq("customer_id", customer.id)
      .order("created_at", {
        ascending: false,
      });

    requests =
      (data as CustomServiceRequest[] | null) ??
      [];
  }

  return (
    <main className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-stone-500">
              Duck Home Services
            </p>

            <h1 className="text-2xl font-semibold text-stone-900">
              Request a Service
            </h1>
          </div>

          <Link
            href="/customer"
            className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
          >
            Back to Dashboard
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-10">
        {saved === "requested" && (
          <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 px-5 py-4">
            <p className="font-medium text-green-800">
              Service request sent successfully.
              Duck Home Services will review your request.
            </p>
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <div>
            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-stone-900">
                What do you need help with?
              </h2>

              <p className="mt-2 text-sm leading-6 text-stone-600">
                Use this form for a service that is not
                already listed in our regular booking
                options.
              </p>

              <form
                action={createCustomServiceRequest}
                className="mt-6 space-y-5"
              >
                <div>
                  <label
                    htmlFor="title"
                    className="mb-2 block text-sm font-medium text-stone-700"
                  >
                    Service Needed
                  </label>

                  <input
                    id="title"
                    name="title"
                    type="text"
                    required
                    placeholder="Example: Clean backyard patio"
                    className="w-full rounded-xl border border-stone-300 px-4 py-3"
                  />
                </div>

                <div>
                  <label
                    htmlFor="description"
                    className="mb-2 block text-sm font-medium text-stone-700"
                  >
                    Tell Us About the Job
                  </label>

                  <textarea
                    id="description"
                    name="description"
                    rows={6}
                    required
                    placeholder="Describe what you need done, the approximate size of the area, anything we should know, etc."
                    className="w-full rounded-xl border border-stone-300 px-4 py-3"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="preferred_date"
                      className="mb-2 block text-sm font-medium text-stone-700"
                    >
                      Preferred Date
                    </label>

                    <input
                      id="preferred_date"
                      name="preferred_date"
                      type="date"
                      className="w-full rounded-xl border border-stone-300 px-4 py-3"
                    />

                    <p className="mt-2 text-xs text-stone-500">
                      Optional
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="preferred_time"
                      className="mb-2 block text-sm font-medium text-stone-700"
                    >
                      Preferred Time
                    </label>

                    <input
                      id="preferred_time"
                      name="preferred_time"
                      type="time"
                      className="w-full rounded-xl border border-stone-300 px-4 py-3"
                    />

                    <p className="mt-2 text-xs text-stone-500">
                      Optional
                    </p>
                  </div>
                </div>

                <div className="rounded-xl bg-stone-50 p-4">
                  <p className="text-sm leading-6 text-stone-600">
                    We&apos;ll review the request before
                    confirming the job. If a custom price
                    is needed, it will be added during
                    review.
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full rounded-xl bg-stone-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-stone-700"
                >
                  Send Service Request
                </button>
              </form>
            </div>
          </div>

          <div>
            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-stone-900">
                Your Requests
              </h2>

              <p className="mt-2 text-sm text-stone-600">
                Track the status of custom service requests
                you&apos;ve submitted.
              </p>

              {requests.length === 0 ? (
                <div className="mt-5 rounded-xl border border-dashed border-stone-300 p-5 text-center">
                  <p className="text-sm text-stone-500">
                    You haven&apos;t submitted any custom
                    requests yet.
                  </p>
                </div>
              ) : (
                <div className="mt-5 space-y-4">
                  {requests.map((request) => (
                    <div
                      key={request.id}
                      className="rounded-xl border border-stone-200 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium text-stone-900">
                          {request.title}
                        </p>

                        <StatusBadge
                          status={request.status}
                        />
                      </div>

                      <p className="mt-2 line-clamp-3 text-sm leading-6 text-stone-600">
                        {request.description}
                      </p>

                      {request.quoted_price_cents !==
                        null && (
                        <div className="mt-3 rounded-lg bg-stone-50 px-3 py-2">
                          <p className="text-xs uppercase tracking-wide text-stone-500">
                            Quote
                          </p>

                          <p className="mt-1 font-semibold text-stone-900">
                            {formatMoney(
                              request.quoted_price_cents
                            )}
                          </p>
                        </div>
                      )}

                      {request.preferred_date && (
                        <p className="mt-3 text-xs text-stone-500">
                          Preferred:{" "}
                          {formatDate(
                            request.preferred_date
                          )}
                          {request.preferred_time
                            ? ` at ${formatTime(
                                request.preferred_time
                              )}`
                            : ""}
                        </p>
                      )}

                      <p className="mt-2 text-xs text-stone-400">
                        Submitted{" "}
                        {formatDateTime(
                          request.created_at
                        )}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
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
        ? "Quoted"
        : status === "approved"
          ? "Approved"
          : status === "declined"
            ? "Declined"
            : status === "cancelled"
              ? "Cancelled"
              : status;

  const className =
    status === "approved"
      ? "bg-green-100 text-green-700"
      : status === "quoted"
        ? "bg-blue-100 text-blue-700"
        : status === "declined"
          ? "bg-red-100 text-red-700"
          : status === "pending"
            ? "bg-amber-100 text-amber-700"
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