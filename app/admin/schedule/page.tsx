import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  cancelJob,
  completeJob,
  createJob,
  generateUpcomingJobs,
} from "./actions";

export default async function AdminSchedulePage({
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

  const { data: services } = await supabase
    .from("services")
    .select("id, name, price_cents, pricing_label")
    .eq("is_active", true)
    .order("name", { ascending: true });

  const { data: jobs, error } = await supabase
    .from("jobs")
    .select(`
      id,
      subscription_id,
      scheduled_date,
      scheduled_time,
      status,
      price_cents,
      notes,
      customers (
        first_name,
        last_name,
        street_address,
        city,
        state,
        zip_code
      ),
      services (
        name
      )
    `)
    .order("scheduled_date", { ascending: true })
    .order("scheduled_time", { ascending: true });

  const activeJobs =
    jobs?.filter(
      (job) =>
        job.status !== "completed" &&
        job.status !== "cancelled"
    ) ?? [];

  const finishedJobs =
    jobs?.filter(
      (job) =>
        job.status === "completed" ||
        job.status === "cancelled"
    ) ?? [];

  return (
    <main className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-stone-500">
              Duck Home Services
            </p>

            <h1 className="text-2xl font-semibold text-stone-900">
              Schedule
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
          <SuccessMessage message="Job scheduled successfully." />
        )}

        {saved === "updated" && (
          <SuccessMessage message="Job updated successfully." />
        )}

        {saved === "completed" && (
          <SuccessMessage message="Job marked complete." />
        )}

        {saved === "cancelled" && (
          <SuccessMessage message="Job cancelled." />
        )}

        {saved === "generated" && (
          <SuccessMessage
            message={`${count ?? "0"} recurring job${
              count === "1" ? "" : "s"
            } generated.`}
          />
        )}

        <div className="mb-8 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-semibold text-stone-900">
                Recurring Jobs
              </h2>

              <p className="mt-2 text-sm leading-6 text-stone-600">
                Generate upcoming jobs from active subscriptions for the next 30 days.
              </p>
            </div>

            <form action={generateUpcomingJobs}>
              <button
                type="submit"
                className="w-full rounded-xl bg-stone-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-stone-700 sm:w-auto"
              >
                Generate Upcoming Jobs
              </button>
            </form>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[400px_1fr]">
          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-stone-900">
              Schedule Job
            </h2>

            <p className="mt-2 text-sm leading-6 text-stone-600">
              Assign a one-time service to a customer and choose when it should be completed.
            </p>

            <form action={createJob} className="mt-6 space-y-4">
              <div>
                <label
                  htmlFor="customer_id"
                  className="mb-2 block text-sm font-medium text-stone-700"
                >
                  Customer
                </label>

                <select
                  id="customer_id"
                  name="customer_id"
                  required
                  defaultValue=""
                  className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3"
                >
                  <option value="" disabled>
                    Select customer
                  </option>

                  {customers?.map((customer) => (
                    <option
                      key={customer.id}
                      value={customer.id}
                    >
                      {customer.first_name}{" "}
                      {customer.last_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="service_id"
                  className="mb-2 block text-sm font-medium text-stone-700"
                >
                  Service
                </label>

                <select
                  id="service_id"
                  name="service_id"
                  required
                  defaultValue=""
                  className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3"
                >
                  <option value="" disabled>
                    Select service
                  </option>

                  {services?.map((service) => (
                    <option
                      key={service.id}
                      value={service.id}
                    >
                      {service.name}
                      {service.price_cents !== null
                        ? ` — $${(
                            service.price_cents / 100
                          ).toFixed(2)}`
                        : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="scheduled_date"
                  className="mb-2 block text-sm font-medium text-stone-700"
                >
                  Date
                </label>

                <input
                  id="scheduled_date"
                  name="scheduled_date"
                  type="date"
                  required
                  className="w-full rounded-xl border border-stone-300 px-4 py-3"
                />
              </div>

              <div>
                <label
                  htmlFor="scheduled_time"
                  className="mb-2 block text-sm font-medium text-stone-700"
                >
                  Time
                </label>

                <input
                  id="scheduled_time"
                  name="scheduled_time"
                  type="time"
                  className="w-full rounded-xl border border-stone-300 px-4 py-3"
                />

                <p className="mt-2 text-xs text-stone-500">
                  Leave blank if the job can be completed anytime that day.
                </p>
              </div>

              <div>
                <label
                  htmlFor="price"
                  className="mb-2 block text-sm font-medium text-stone-700"
                >
                  Job Price
                </label>

                <input
                  id="price"
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="10.00"
                  className="w-full rounded-xl border border-stone-300 px-4 py-3"
                />
              </div>

              <div>
                <label
                  htmlFor="notes"
                  className="mb-2 block text-sm font-medium text-stone-700"
                >
                  Job Notes
                </label>

                <textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  placeholder="Gate code, bin location, special instructions, etc."
                  className="w-full rounded-xl border border-stone-300 px-4 py-3"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-stone-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-stone-700"
              >
                Schedule Job
              </button>
            </form>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-stone-900">
              Upcoming Jobs
            </h2>

            <p className="mt-2 text-sm text-stone-600">
              Jobs that still need to be completed.
            </p>

            <div className="mt-6">
              {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
                  Unable to load jobs: {error.message}
                </div>
              ) : activeJobs.length === 0 ? (
                <EmptyState message="No upcoming jobs scheduled." />
              ) : (
                <div className="space-y-4">
                  {activeJobs.map((job) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      showActions
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="mt-12">
              <h2 className="text-xl font-semibold text-stone-900">
                Completed & Cancelled
              </h2>

              <p className="mt-2 text-sm text-stone-600">
                Recent job history.
              </p>

              <div className="mt-6">
                {finishedJobs.length === 0 ? (
                  <EmptyState message="No completed or cancelled jobs yet." />
                ) : (
                  <div className="space-y-4">
                    {finishedJobs.map((job) => (
                      <JobCard
                        key={job.id}
                        job={job}
                        showActions={false}
                      />
                    ))}
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

function JobCard({
  job,
  showActions,
}: {
  job: any;
  showActions: boolean;
}) {
  const customer = Array.isArray(job.customers)
    ? job.customers[0]
    : job.customers;

  const service = Array.isArray(job.services)
    ? job.services[0]
    : job.services;

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col justify-between gap-5 sm:flex-row">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-stone-900">
              {service?.name ?? "Service"}
            </h3>

            <StatusBadge status={job.status} />

            {job.subscription_id && (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                Recurring
              </span>
            )}
          </div>

          <p className="mt-2 font-medium text-stone-700">
            {customer
              ? `${customer.first_name} ${customer.last_name}`
              : "Customer"}
          </p>

          {customer?.street_address && (
            <p className="mt-2 text-sm leading-6 text-stone-600">
              {customer.street_address}
              {customer.city
                ? `, ${customer.city}`
                : ""}
              {customer.state
                ? `, ${customer.state}`
                : ""}
              {customer.zip_code
                ? ` ${customer.zip_code}`
                : ""}
            </p>
          )}

          {job.notes && (
            <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-500">
              {job.notes}
            </p>
          )}
        </div>

        <div className="shrink-0 sm:text-right">
          <p className="font-semibold text-stone-900">
            {formatDate(job.scheduled_date)}
          </p>

          <p className="mt-1 text-sm text-stone-500">
            {formatTime(job.scheduled_time)}
          </p>

          {job.price_cents !== null && (
            <p className="mt-3 text-lg font-semibold text-stone-900">
              $
              {(job.price_cents / 100).toFixed(2)}
            </p>
          )}
        </div>
      </div>

      {showActions && (
        <div className="mt-5 flex flex-wrap gap-3 border-t border-stone-100 pt-5">
          <Link
            href={`/admin/schedule/${job.id}/edit`}
            className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
          >
            Edit Job
          </Link>

          <form action={completeJob}>
            <input
              type="hidden"
              name="job_id"
              value={job.id}
            />

            <button
              type="submit"
              className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-700"
            >
              Mark Complete
            </button>
          </form>

          <form action={cancelJob}>
            <input
              type="hidden"
              name="job_id"
              value={job.id}
            />

            <button
              type="submit"
              className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50"
            >
              Cancel Job
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  let classes =
    "bg-stone-100 text-stone-600";

  if (status === "completed") {
    classes =
      "bg-green-100 text-green-700";
  }

  if (status === "cancelled") {
    classes =
      "bg-red-100 text-red-700";
  }

  if (status === "in_progress") {
    classes =
      "bg-blue-100 text-blue-700";
  }

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${classes}`}
    >
      {status.replace("_", " ")}
    </span>
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

function formatTime(time: string | null) {
  if (!time) {
    return "Anytime";
  }

  const [hourString, minuteString] =
    time.split(":");

  const hour = Number(hourString);

  const period =
    hour >= 12 ? "PM" : "AM";

  const displayHour =
    hour % 12 || 12;

  return `${displayHour}:${minuteString} ${period}`;
}