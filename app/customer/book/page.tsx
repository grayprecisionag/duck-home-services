import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createBookingRequest } from "./actions";

type Service = {
  id: string;
  name: string;
  description: string | null;
  price_cents: number | null;
  pricing_label: string | null;
  service_type: string;
};

function formatMoney(cents: number | null) {
  if (cents === null) {
    return null;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export default async function CustomerBookPage({
  searchParams,
}: {
  searchParams: Promise<{
    saved?: string;
  }>;
}) {
  const { saved } = await searchParams;

  const supabase = await createClient();

  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims?.sub) {
    redirect("/login");
  }

  const userId = claimsData.claims.sub;

  const { data: customer, error: customerError } =
    await supabase
      .from("customers")
      .select("id, first_name, last_name")
      .eq("profile_id", userId)
      .single();

  if (customerError || !customer) {
    return (
      <main className="min-h-screen bg-stone-50">
        <section className="mx-auto max-w-3xl px-6 py-16">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
            <h1 className="text-xl font-semibold text-amber-900">
              Customer account not linked
            </h1>

            <p className="mt-2 text-sm leading-6 text-amber-800">
              Your login is not connected to a Duck Home Services customer
              record yet.
            </p>

            <Link
              href="/customer"
              className="mt-5 inline-block rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-900"
            >
              Back to Customer Portal
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const { data: servicesData, error: servicesError } =
    await supabase
      .from("services")
      .select(
        "id, name, description, price_cents, pricing_label, service_type"
      )
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

  const services =
    (servicesData as Service[] | null) ?? [];

  return (
    <main className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-stone-500">
              Duck Home Services
            </p>

            <h1 className="text-2xl font-semibold text-stone-900">
              Book a Service
            </h1>
          </div>

          <Link
            href="/customer"
            className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
          >
            Back to Portal
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-10">
        {saved === "requested" && (
          <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 px-5 py-4">
            <p className="font-medium text-green-800">
              Booking request sent successfully.
            </p>

            <p className="mt-1 text-sm text-green-700">
              Duck Home Services will review your request before it is added
              to the schedule.
            </p>
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <div>
            <h2 className="text-2xl font-semibold text-stone-900">
              Available Services
            </h2>

            <p className="mt-2 text-sm text-stone-600">
              Choose a service and send us your preferred service date.
            </p>

            {servicesError ? (
              <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
                Unable to load services: {servicesError.message}
              </div>
            ) : services.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-stone-300 bg-white p-8">
                <p className="text-stone-600">
                  No services are currently available.
                </p>
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {services.map((service) => {
                  const price = formatMoney(service.price_cents);

                  return (
                    <div
                      key={service.id}
                      className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
                    >
                      <div className="flex flex-col justify-between gap-4 sm:flex-row">
                        <div>
                          <h3 className="text-lg font-semibold text-stone-900">
                            {service.name}
                          </h3>

                          {service.description && (
                            <p className="mt-2 max-w-xl text-sm leading-6 text-stone-600">
                              {service.description}
                            </p>
                          )}
                        </div>

                        <div className="shrink-0 text-left sm:text-right">
                          {price ? (
                            <>
                              <p className="font-semibold text-stone-900">
                                {price}
                              </p>

                              {service.pricing_label && (
                                <p className="mt-1 text-xs text-stone-500">
                                  {service.pricing_label}
                                </p>
                              )}
                            </>
                          ) : (
                            <p className="text-sm font-medium text-stone-600">
                              Contact for pricing
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-stone-900">
                Request Service
              </h2>

              <p className="mt-2 text-sm leading-6 text-stone-600">
                Tell us what you need and when you would prefer the service.
              </p>

              <form
                action={createBookingRequest}
                className="mt-6 space-y-4"
              >
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
                      Select a service
                    </option>

                    {services.map((service) => (
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
                    htmlFor="request_type"
                    className="mb-2 block text-sm font-medium text-stone-700"
                  >
                    Service type
                  </label>

                  <select
                    id="request_type"
                    name="request_type"
                    defaultValue="one_time"
                    className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3"
                  >
                    <option value="one_time">
                      One-time service
                    </option>

                    <option value="recurring">
                      Recurring service
                    </option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="preferred_date"
                    className="mb-2 block text-sm font-medium text-stone-700"
                  >
                    Preferred date
                  </label>

                  <input
                    id="preferred_date"
                    name="preferred_date"
                    type="date"
                    required
                    className="w-full rounded-xl border border-stone-300 px-4 py-3"
                  />
                </div>

                <div>
                  <label
                    htmlFor="preferred_time"
                    className="mb-2 block text-sm font-medium text-stone-700"
                  >
                    Preferred time
                  </label>

                  <input
                    id="preferred_time"
                    name="preferred_time"
                    type="time"
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
                    rows={4}
                    placeholder="Gate instructions, special requests, details about the job, etc."
                    className="w-full rounded-xl border border-stone-300 px-4 py-3"
                  />
                </div>

                <button
                  type="submit"
                  disabled={services.length === 0}
                  className="w-full rounded-xl bg-stone-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-300"
                >
                  Send Booking Request
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}