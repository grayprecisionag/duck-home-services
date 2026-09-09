import { createClient } from "@/lib/supabase/server";
import {
  completeJob,
  startJob,
} from "./actions";

export default async function WorkerPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const { saved } = await searchParams;

  const supabase = await createClient();

  const { data: jobs, error } = await supabase
    .from("jobs")
    .select(`
      id,
      scheduled_date,
      scheduled_time,
      status,
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
    .in("status", ["scheduled", "in_progress"])
    .order("scheduled_date", { ascending: true })
    .order("scheduled_time", { ascending: true });

  const today = getTodayDate();

  const todayJobs =
    jobs?.filter(
      (job) => job.scheduled_date === today
    ) ?? [];

  const upcomingJobs =
    jobs?.filter(
      (job) => job.scheduled_date > today
    ) ?? [];

  return (
    <main className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-stone-500">
              Duck Home Services
            </p>

            <h1 className="text-2xl font-semibold text-stone-900">
              Worker Dashboard
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

      <section className="mx-auto max-w-5xl px-6 py-10">
        {saved === "started" && (
          <SuccessMessage message="Job started." />
        )}

        {saved === "completed" && (
          <SuccessMessage message="Job completed." />
        )}

        <div>
          <p className="text-sm font-medium uppercase tracking-[0.16em] text-stone-500">
            Today
          </p>

          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900">
            Today&apos;s Work
          </h2>

          <p className="mt-3 text-stone-600">
            Start each job when you arrive and mark it complete when the work is finished.
          </p>
        </div>

        <div className="mt-8">
          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
              Unable to load jobs: {error.message}
            </div>
          ) : todayJobs.length === 0 ? (
            <EmptyState message="No jobs scheduled for today." />
          ) : (
            <div className="space-y-5">
              {todayJobs.map((job) => (
                <WorkerJobCard
                  key={job.id}
                  job={job}
                />
              ))}
            </div>
          )}
        </div>

        <div className="mt-12 border-t border-stone-200 pt-10">
          <h2 className="text-2xl font-semibold text-stone-900">
            Upcoming Jobs
          </h2>

          <p className="mt-2 text-sm text-stone-600">
            Jobs scheduled after today.
          </p>

          <div className="mt-6">
            {upcomingJobs.length === 0 ? (
              <EmptyState message="No upcoming jobs scheduled." />
            ) : (
              <div className="space-y-4">
                {upcomingJobs.map((job) => (
                  <UpcomingJobCard
                    key={job.id}
                    job={job}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function WorkerJobCard({
  job,
}: {
  job: any;
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
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-xl font-semibold text-stone-900">
              {service?.name ?? "Service"}
            </h3>

            <StatusBadge status={job.status} />
          </div>

          <p className="mt-3 text-lg font-medium text-stone-700">
            {customer
              ? `${customer.first_name} ${customer.last_name}`
              : "Customer"}
          </p>

          {customer?.street_address && (
            <p className="mt-2 text-sm leading-6 text-stone-600">
              {customer.street_address}
              {customer.city ? `, ${customer.city}` : ""}
              {customer.state ? `, ${customer.state}` : ""}
              {customer.zip_code ? ` ${customer.zip_code}` : ""}
            </p>
          )}

          {job.notes && (
            <div className="mt-4 rounded-xl bg-stone-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
                Job Notes
              </p>

              <p className="mt-2 text-sm leading-6 text-stone-700">
                {job.notes}
              </p>
            </div>
          )}
        </div>

        <div className="shrink-0">
          <p className="font-semibold text-stone-900 sm:text-right">
            {formatTime(job.scheduled_time)}
          </p>
        </div>
      </div>

      <div className="mt-6 border-t border-stone-100 pt-5">
        {job.status === "scheduled" && (
          <form action={startJob}>
            <input
              type="hidden"
              name="job_id"
              value={job.id}
            />

            <button
              type="submit"
              className="w-full rounded-xl bg-stone-900 px-5 py-3 font-medium text-white transition hover:bg-stone-700 sm:w-auto"
            >
              Start Job
            </button>
          </form>
        )}

        {job.status === "in_progress" && (
          <form action={completeJob}>
            <input
              type="hidden"
              name="job_id"
              value={job.id}
            />

            <button
              type="submit"
              className="w-full rounded-xl bg-stone-900 px-5 py-3 font-medium text-white transition hover:bg-stone-700 sm:w-auto"
            >
              Complete Job
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function UpcomingJobCard({
  job,
}: {
  job: any;
}) {
  const customer = Array.isArray(job.customers)
    ? job.customers[0]
    : job.customers;

  const service = Array.isArray(job.services)
    ? job.services[0]
    : job.services;

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col justify-between gap-4 sm:flex-row">
        <div>
          <h3 className="font-semibold text-stone-900">
            {service?.name ?? "Service"}
          </h3>

          <p className="mt-1 text-sm text-stone-600">
            {customer
              ? `${customer.first_name} ${customer.last_name}`
              : "Customer"}
          </p>

          {customer?.street_address && (
            <p className="mt-2 text-sm text-stone-500">
              {customer.street_address}
            </p>
          )}
        </div>

        <div className="shrink-0 sm:text-right">
          <p className="font-medium text-stone-900">
            {formatDate(job.scheduled_date)}
          </p>

          <p className="mt-1 text-sm text-stone-500">
            {formatTime(job.scheduled_time)}
          </p>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const classes =
    status === "in_progress"
      ? "bg-blue-100 text-blue-700"
      : "bg-stone-100 text-stone-600";

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

function getTodayDate() {
  const now = new Date();

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(now);
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

function formatTime(time: string | null) {
  if (!time) {
    return "Anytime";
  }

  const [hourString, minuteString] = time.split(":");
  const hour = Number(hourString);

  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;

  return `${displayHour}:${minuteString} ${period}`;
}