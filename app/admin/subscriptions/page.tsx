import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  createSubscription,
  toggleSubscriptionStatus,
} from "./actions";

export default async function AdminSubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const { saved } = await searchParams;

  const supabase = await createClient();

  const { data: customers } = await supabase
    .from("customers")
    .select("id, first_name, last_name")
    .eq("is_active", true)
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true });

  const { data: services } = await supabase
    .from("services")
    .select("id, name")
    .eq("is_active", true)
    .order("name", { ascending: true });

  const { data: subscriptions, error } = await supabase
    .from("subscriptions")
    .select(`
      id,
      name,
      price_cents,
      billing_frequency,
      service_frequency,
      service_day,
      start_date,
      next_service_date,
      notes,
      is_active,
      customers (
        first_name,
        last_name
      ),
      services (
        name
      )
    `)
    .order("is_active", { ascending: false })
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-stone-500">
              Duck Home Services
            </p>

            <h1 className="text-2xl font-semibold text-stone-900">
              Subscriptions
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
          <SuccessMessage message="Subscription created successfully." />
        )}

        {saved === "paused" && (
          <SuccessMessage message="Subscription paused." />
        )}

        {saved === "reactivated" && (
          <SuccessMessage message="Subscription reactivated." />
        )}

        <div className="grid gap-8 lg:grid-cols-[400px_1fr]">
          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-stone-900">
              Add Subscription
            </h2>

            <p className="mt-2 text-sm leading-6 text-stone-600">
              Assign a recurring service plan to a customer.
            </p>

            <form
              action={createSubscription}
              className="mt-6 space-y-4"
            >
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
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="name"
                  className="mb-2 block text-sm font-medium text-stone-700"
                >
                  Plan Name
                </label>

                <input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="2 Bin Monthly Plan"
                  className="w-full rounded-xl border border-stone-300 px-4 py-3"
                />

                <p className="mt-2 text-xs text-stone-500">
                  Example: 1 Bin Plan, 2 Bin Plan, or 3 Bin Plan.
                </p>
              </div>

              <div>
                <label
                  htmlFor="price"
                  className="mb-2 block text-sm font-medium text-stone-700"
                >
                  Subscription Price
                </label>

                <input
                  id="price"
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="18.00"
                  required
                  className="w-full rounded-xl border border-stone-300 px-4 py-3"
                />
              </div>

              <div>
                <label
                  htmlFor="billing_frequency"
                  className="mb-2 block text-sm font-medium text-stone-700"
                >
                  Billing Frequency
                </label>

                <select
                  id="billing_frequency"
                  name="billing_frequency"
                  defaultValue="monthly"
                  className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3"
                >
                  <option value="monthly">
                    Monthly
                  </option>

                  <option value="weekly">
                    Weekly
                  </option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="service_frequency"
                  className="mb-2 block text-sm font-medium text-stone-700"
                >
                  Service Frequency
                </label>

                <select
                  id="service_frequency"
                  name="service_frequency"
                  defaultValue="weekly"
                  className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3"
                >
                  <option value="weekly">
                    Weekly
                  </option>

                  <option value="biweekly">
                    Every Other Week
                  </option>

                  <option value="monthly">
                    Monthly
                  </option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="service_day"
                  className="mb-2 block text-sm font-medium text-stone-700"
                >
                  Service Day
                </label>

                <select
                  id="service_day"
                  name="service_day"
                  defaultValue=""
                  className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3"
                >
                  <option value="">
                    No specific day
                  </option>

                  <option value="0">Sunday</option>
                  <option value="1">Monday</option>
                  <option value="2">Tuesday</option>
                  <option value="3">Wednesday</option>
                  <option value="4">Thursday</option>
                  <option value="5">Friday</option>
                  <option value="6">Saturday</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="start_date"
                  className="mb-2 block text-sm font-medium text-stone-700"
                >
                  Start Date
                </label>

                <input
                  id="start_date"
                  name="start_date"
                  type="date"
                  required
                  className="w-full rounded-xl border border-stone-300 px-4 py-3"
                />
              </div>

              <div>
                <label
                  htmlFor="notes"
                  className="mb-2 block text-sm font-medium text-stone-700"
                >
                  Notes
                </label>

                <textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  placeholder="Bin location, service instructions, etc."
                  className="w-full rounded-xl border border-stone-300 px-4 py-3"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-stone-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-stone-700"
              >
                Create Subscription
              </button>
            </form>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-stone-900">
              Active Subscriptions
            </h2>

            <p className="mt-2 text-sm text-stone-600">
              Recurring services currently assigned to customers.
            </p>

            <div className="mt-6">
              {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
                  Unable to load subscriptions:{" "}
                  {error.message}
                </div>
              ) : !subscriptions ||
                subscriptions.length === 0 ? (
                <EmptyState message="No subscriptions have been created yet." />
              ) : (
                <div className="space-y-4">
                  {subscriptions.map((subscription) => {
                    const customer = Array.isArray(
                      subscription.customers
                    )
                      ? subscription.customers[0]
                      : subscription.customers;

                    const service = Array.isArray(
                      subscription.services
                    )
                      ? subscription.services[0]
                      : subscription.services;

                    return (
                      <div
                        key={subscription.id}
                        className={`rounded-2xl border border-stone-200 bg-white p-6 shadow-sm ${
                          subscription.is_active
                            ? ""
                            : "opacity-60"
                        }`}
                      >
                        <div className="flex flex-col justify-between gap-5 sm:flex-row">
                          <div>
                            <div className="flex flex-wrap items-center gap-3">
                              <h3 className="text-lg font-semibold text-stone-900">
                                {subscription.name ||
                                  service?.name ||
                                  "Subscription"}
                              </h3>

                              <span
                                className={`rounded-full px-3 py-1 text-xs font-medium ${
                                  subscription.is_active
                                    ? "bg-green-100 text-green-700"
                                    : "bg-stone-100 text-stone-600"
                                }`}
                              >
                                {subscription.is_active
                                  ? "Active"
                                  : "Paused"}
                              </span>
                            </div>

                            <p className="mt-2 font-medium text-stone-700">
                              {customer
                                ? `${customer.first_name} ${customer.last_name}`
                                : "Customer"}
                            </p>

                            <p className="mt-2 text-sm text-stone-600">
                              {service?.name ?? "Service"}
                            </p>

                            <p className="mt-2 text-sm text-stone-500">
                              Service:{" "}
                              {formatFrequency(
                                subscription.service_frequency
                              )}
                              {subscription.service_day !== null
                                ? ` on ${formatDay(
                                    subscription.service_day
                                  )}`
                                : ""}
                            </p>

                            <p className="mt-1 text-sm text-stone-500">
                              Billing:{" "}
                              {formatFrequency(
                                subscription.billing_frequency
                              )}
                            </p>

                            {subscription.next_service_date && (
                              <p className="mt-1 text-sm text-stone-500">
                                Next service:{" "}
                                {formatDate(
                                  subscription.next_service_date
                                )}
                              </p>
                            )}

                            {subscription.notes && (
                              <p className="mt-3 text-sm leading-6 text-stone-500">
                                {subscription.notes}
                              </p>
                            )}
                          </div>

                          <div className="shrink-0 sm:text-right">
                            <p className="text-xl font-semibold text-stone-900">
                              $
                              {(
                                subscription.price_cents / 100
                              ).toFixed(2)}
                            </p>

                            <p className="mt-1 text-xs text-stone-500">
                              per{" "}
                              {subscription.billing_frequency ===
                              "monthly"
                                ? "month"
                                : "week"}
                            </p>
                          </div>
                        </div>

                        <div className="mt-5 border-t border-stone-100 pt-5">
                          <form
                            action={toggleSubscriptionStatus}
                          >
                            <input
                              type="hidden"
                              name="subscription_id"
                              value={subscription.id}
                            />

                            <input
                              type="hidden"
                              name="is_active"
                              value={String(
                                subscription.is_active
                              )}
                            />

                            <button
                              type="submit"
                              className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
                            >
                              {subscription.is_active
                                ? "Pause Subscription"
                                : "Reactivate Subscription"}
                            </button>
                          </form>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
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

function formatFrequency(value: string) {
  if (value === "biweekly") {
    return "Every other week";
  }

  return (
    value.charAt(0).toUpperCase() +
    value.slice(1)
  );
}

function formatDay(day: number) {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  return days[day] ?? "";
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}