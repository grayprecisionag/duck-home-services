import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateJob } from "../../actions";

export default async function EditJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();

  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select(`
      id,
      customer_id,
      service_id,
      scheduled_date,
      scheduled_time,
      price_cents,
      notes,
      status
    `)
    .eq("id", id)
    .single();

  if (jobError || !job) {
    notFound();
  }

  const { data: customers } = await supabase
    .from("customers")
    .select("id, first_name, last_name")
    .eq("is_active", true)
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true });

  const { data: services } = await supabase
    .from("services")
    .select("id, name, price_cents")
    .eq("is_active", true)
    .order("name", { ascending: true });

  return (
    <main className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-stone-500">
              Duck Home Services
            </p>

            <h1 className="text-2xl font-semibold text-stone-900">
              Edit Job
            </h1>
          </div>

          <Link
            href="/admin/schedule"
            className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
          >
            Back to Schedule
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-6 py-10">
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-stone-900">
            Job Details
          </h2>

          <p className="mt-2 text-sm text-stone-600">
            Update the customer, service, date, time, price, or job notes.
          </p>

          <form action={updateJob} className="mt-6 space-y-5">
            <input type="hidden" name="job_id" value={job.id} />

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
                defaultValue={job.customer_id}
                className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3"
              >
                {customers?.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.first_name} {customer.last_name}
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
                defaultValue={job.service_id}
                className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3"
              >
                {services?.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                    {service.price_cents !== null
                      ? ` — $${(service.price_cents / 100).toFixed(2)}`
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
                defaultValue={job.scheduled_date}
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
                defaultValue={
                  job.scheduled_time
                    ? job.scheduled_time.slice(0, 5)
                    : ""
                }
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
                defaultValue={
                  job.price_cents !== null
                    ? (job.price_cents / 100).toFixed(2)
                    : ""
                }
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
                rows={4}
                defaultValue={job.notes ?? ""}
                className="w-full rounded-xl border border-stone-300 px-4 py-3"
              />
            </div>

            <div className="flex flex-wrap gap-3 border-t border-stone-100 pt-5">
              <button
                type="submit"
                className="rounded-xl bg-stone-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-stone-700"
              >
                Save Changes
              </button>

              <Link
                href="/admin/schedule"
                className="rounded-xl border border-stone-300 bg-white px-5 py-3 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}