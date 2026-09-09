import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createService, toggleServiceStatus } from "./actions";
import SuccessAlert from "./success-alert";

export default async function AdminServicesPage({
    searchParams,
  }: {
    searchParams: Promise<{ saved?: string }>;
  }) {
    const { saved } = await searchParams;
  const supabase = await createClient();

  const { data: services, error } = await supabase
    .from("services")
    .select(
      "id, name, description, category, price_cents, pricing_label, service_type, is_active"
    )
    .order("created_at", { ascending: true });

  return (
    <main className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-stone-500">
              Duck Home Services
            </p>

            <h1 className="text-2xl font-semibold text-stone-900">
              Services & Pricing
            </h1>
          </div>

          <Link
            href="/admin"
            className="rounded-xl border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
          >
            Back to Dashboard
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-10">
      {saved && (
  <SuccessAlert
    message={
      saved === "created"
        ? "Service added successfully."
        : saved === "updated"
          ? "Changes saved successfully."
          : saved === "deactivated"
            ? "Service deactivated successfully."
            : saved === "reactivated"
              ? "Service reactivated successfully."
              : "Changes saved successfully."
    }
  />
)}
        <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-stone-900">
              Add Service
            </h2>

            <p className="mt-2 text-sm leading-6 text-stone-600">
              Add one-time, recurring, or custom-quote services.
            </p>

            <form action={createService} className="mt-6 space-y-4">
              <div>
                <label
                  htmlFor="name"
                  className="mb-2 block text-sm font-medium text-stone-700"
                >
                  Service name
                </label>

                <input
                  id="name"
                  name="name"
                  required
                  className="w-full rounded-xl border border-stone-300 px-4 py-3 text-stone-900 outline-none transition focus:border-stone-500"
                  placeholder="Trash Bin Cleaning"
                />
              </div>

              <div>
                <label
                  htmlFor="description"
                  className="mb-2 block text-sm font-medium text-stone-700"
                >
                  Description
                </label>

                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  className="w-full rounded-xl border border-stone-300 px-4 py-3 text-stone-900 outline-none transition focus:border-stone-500"
                  placeholder="Short description"
                />
              </div>

              <div>
                <label
                  htmlFor="category"
                  className="mb-2 block text-sm font-medium text-stone-700"
                >
                  Category
                </label>

                <input
                  id="category"
                  name="category"
                  defaultValue="General"
                  className="w-full rounded-xl border border-stone-300 px-4 py-3 text-stone-900 outline-none transition focus:border-stone-500"
                />
              </div>

              <div>
                <label
                  htmlFor="price"
                  className="mb-2 block text-sm font-medium text-stone-700"
                >
                  Price
                </label>

                <input
                  id="price"
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full rounded-xl border border-stone-300 px-4 py-3 text-stone-900 outline-none transition focus:border-stone-500"
                  placeholder="10.00"
                />
              </div>

              <div>
                <label
                  htmlFor="pricing_label"
                  className="mb-2 block text-sm font-medium text-stone-700"
                >
                  Pricing label
                </label>

                <input
                  id="pricing_label"
                  name="pricing_label"
                  className="w-full rounded-xl border border-stone-300 px-4 py-3 text-stone-900 outline-none transition focus:border-stone-500"
                  placeholder="per month"
                />
              </div>

              <div>
                <label
                  htmlFor="service_type"
                  className="mb-2 block text-sm font-medium text-stone-700"
                >
                  Service type
                </label>

                <select
                  id="service_type"
                  name="service_type"
                  defaultValue="one_time"
                  className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-stone-900 outline-none transition focus:border-stone-500"
                >
                  <option value="one_time">One-time</option>
                  <option value="recurring">Recurring</option>
                  <option value="custom_quote">Custom quote</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-stone-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-stone-700"
              >
                Add Service
              </button>
            </form>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-stone-900">
              Current Services
            </h2>

            <p className="mt-2 text-sm text-stone-600">
              Manage the services offered by Duck Home Services.
            </p>

            <div className="mt-6">
              {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
                  Unable to load services: {error.message}
                </div>
              ) : !services || services.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-10 text-center">
                  <h3 className="text-lg font-semibold text-stone-900">
                    No services yet
                  </h3>

                  <p className="mt-2 text-sm text-stone-600">
                    Add your first service using the form.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {services.map((service) => (
                    <div
                      key={service.id}
                      className={`rounded-2xl border bg-white p-6 shadow-sm ${
                        service.is_active
                          ? "border-stone-200"
                          : "border-stone-200 opacity-70"
                      }`}
                    >
                      <div className="flex flex-col justify-between gap-5 sm:flex-row">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-semibold text-stone-900">
                              {service.name}
                            </h3>

                            <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-600">
                              {service.service_type === "recurring"
                                ? "Recurring"
                                : service.service_type === "custom_quote"
                                  ? "Custom Quote"
                                  : "One-Time"}
                            </span>

                            {!service.is_active && (
                              <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
                                Inactive
                              </span>
                            )}
                          </div>

                          <p className="mt-1 text-sm font-medium text-stone-500">
                            {service.category}
                          </p>

                          {service.description && (
                            <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
                              {service.description}
                            </p>
                          )}

                          <div className="mt-5 flex flex-wrap gap-3">
                            <Link
                              href={`/admin/services/${service.id}/edit`}
                              className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
                            >
                              Edit
                            </Link>

                            <form action={toggleServiceStatus}>
                              <input
                                type="hidden"
                                name="id"
                                value={service.id}
                              />

                              <input
                                type="hidden"
                                name="is_active"
                                value={String(service.is_active)}
                              />

                              <button
                                type="submit"
                                className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
                              >
                                {service.is_active
                                  ? "Deactivate"
                                  : "Reactivate"}
                              </button>
                            </form>
                          </div>
                        </div>

                        <div className="shrink-0 sm:text-right">
                          <p className="text-xl font-semibold text-stone-900">
                            {service.price_cents === null
                              ? service.service_type === "custom_quote"
                                ? "Custom quote"
                                : "Price not set"
                              : `$${(service.price_cents / 100).toFixed(2)}`}
                          </p>

                          {service.pricing_label && (
                            <p className="mt-1 text-sm text-stone-500">
                              {service.pricing_label}
                            </p>
                          )}
                        </div>
                      </div>
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