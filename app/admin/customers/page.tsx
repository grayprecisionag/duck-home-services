import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  createCustomer,
  linkCustomerAccount,
  toggleCustomerStatus,
} from "./actions";

type UnlinkedProfile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
};

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{
    saved?: string;
    error?: string;
  }>;
}) {
  const { saved, error: pageError } = await searchParams;

  const supabase = await createClient();

  const { data: customers, error: customersError } = await supabase
    .from("customers")
    .select(
      "id, profile_id, first_name, last_name, email, phone, street_address, city, state, zip_code, notes, is_active"
    )
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true });

  const {
    data: unlinkedProfilesData,
    error: profilesError,
  } = await supabase.rpc("get_unlinked_customer_profiles");

  const unlinkedProfiles =
    (unlinkedProfilesData as UnlinkedProfile[] | null) ?? [];

  return (
    <main className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-stone-500">
              Duck Home Services
            </p>

            <h1 className="text-2xl font-semibold text-stone-900">
              Customers
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
        {saved && (
          <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 px-5 py-4">
            <p className="font-medium text-green-800">
              {saved === "created"
                ? "Customer added successfully."
                : saved === "updated"
                  ? "Changes saved successfully."
                  : saved === "archived"
                    ? "Customer archived successfully."
                    : saved === "reactivated"
                      ? "Customer reactivated successfully."
                      : saved === "linked"
                        ? "Customer account linked successfully."
                        : "Changes saved successfully."}
            </p>
          </div>
        )}

        {pageError && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
            <p className="font-medium text-red-800">
              {pageError === "missing-link"
                ? "Please select a registered customer account before linking."
                : `Unable to link customer account: ${pageError}`}
            </p>
          </div>
        )}

        {profilesError && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
            <p className="font-medium text-red-800">
              Unable to load registered customer accounts:{" "}
              {profilesError.message}
            </p>
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-[400px_1fr]">
          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-stone-900">
              Add Customer
            </h2>

            <p className="mt-2 text-sm leading-6 text-stone-600">
              Add a customer even if they have not created an app
              account yet.
            </p>

            <form action={createCustomer} className="mt-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="first_name"
                    className="mb-2 block text-sm font-medium text-stone-700"
                  >
                    First name
                  </label>

                  <input
                    id="first_name"
                    name="first_name"
                    required
                    className="w-full rounded-xl border border-stone-300 px-4 py-3"
                  />
                </div>

                <div>
                  <label
                    htmlFor="last_name"
                    className="mb-2 block text-sm font-medium text-stone-700"
                  >
                    Last name
                  </label>

                  <input
                    id="last_name"
                    name="last_name"
                    required
                    className="w-full rounded-xl border border-stone-300 px-4 py-3"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-stone-700"
                >
                  Email
                </label>

                <input
                  id="email"
                  name="email"
                  type="email"
                  className="w-full rounded-xl border border-stone-300 px-4 py-3"
                />
              </div>

              <div>
                <label
                  htmlFor="phone"
                  className="mb-2 block text-sm font-medium text-stone-700"
                >
                  Phone
                </label>

                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  className="w-full rounded-xl border border-stone-300 px-4 py-3"
                />
              </div>

              <div>
                <label
                  htmlFor="street_address"
                  className="mb-2 block text-sm font-medium text-stone-700"
                >
                  Street address
                </label>

                <input
                  id="street_address"
                  name="street_address"
                  className="w-full rounded-xl border border-stone-300 px-4 py-3"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-[1fr_90px_110px]">
                <div>
                  <label
                    htmlFor="city"
                    className="mb-2 block text-sm font-medium text-stone-700"
                  >
                    City
                  </label>

                  <input
                    id="city"
                    name="city"
                    className="w-full rounded-xl border border-stone-300 px-4 py-3"
                  />
                </div>

                <div>
                  <label
                    htmlFor="state"
                    className="mb-2 block text-sm font-medium text-stone-700"
                  >
                    State
                  </label>

                  <input
                    id="state"
                    name="state"
                    defaultValue="CA"
                    className="w-full rounded-xl border border-stone-300 px-4 py-3"
                  />
                </div>

                <div>
                  <label
                    htmlFor="zip_code"
                    className="mb-2 block text-sm font-medium text-stone-700"
                  >
                    ZIP
                  </label>

                  <input
                    id="zip_code"
                    name="zip_code"
                    className="w-full rounded-xl border border-stone-300 px-4 py-3"
                  />
                </div>
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
                  className="w-full rounded-xl border border-stone-300 px-4 py-3"
                  placeholder="Gate code, preferred service notes, etc."
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-stone-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-stone-700"
              >
                Add Customer
              </button>
            </form>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-stone-900">
              Customer List
            </h2>

            <p className="mt-2 text-sm text-stone-600">
              Manage customer records and app account access.
            </p>

            <div className="mt-6">
              {customersError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
                  Unable to load customers: {customersError.message}
                </div>
              ) : !customers || customers.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-10 text-center">
                  <h3 className="text-lg font-semibold text-stone-900">
                    No customers yet
                  </h3>

                  <p className="mt-2 text-sm text-stone-600">
                    Add your first customer using the form.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {customers.map((customer) => (
                    <div
                      key={customer.id}
                      className={`rounded-2xl border bg-white p-6 shadow-sm ${
                        customer.is_active
                          ? "border-stone-200"
                          : "border-stone-200 opacity-70"
                      }`}
                    >
                      <div className="flex flex-col justify-between gap-5 sm:flex-row">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-semibold text-stone-900">
                              {customer.first_name}{" "}
                              {customer.last_name}
                            </h3>

                            {customer.profile_id ? (
                              <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                                App Account Linked
                              </span>
                            ) : (
                              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                                No App Account
                              </span>
                            )}

                            {!customer.is_active && (
                              <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
                                Archived
                              </span>
                            )}
                          </div>

                          {customer.email && (
                            <p className="mt-2 text-sm text-stone-600">
                              {customer.email}
                            </p>
                          )}

                          {customer.phone && (
                            <p className="mt-1 text-sm text-stone-600">
                              {customer.phone}
                            </p>
                          )}

                          {(customer.street_address ||
                            customer.city ||
                            customer.zip_code) && (
                            <p className="mt-3 text-sm leading-6 text-stone-600">
                              {customer.street_address}
                              {customer.street_address &&
                              customer.city
                                ? ", "
                                : ""}
                              {customer.city}
                              {customer.city && customer.state
                                ? ", "
                                : ""}
                              {customer.state} {customer.zip_code}
                            </p>
                          )}

                          {customer.notes && (
                            <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-500">
                              {customer.notes}
                            </p>
                          )}

                          {!customer.profile_id && (
                            <div className="mt-5 rounded-xl border border-stone-200 bg-stone-50 p-4">
                              <p className="text-sm font-semibold text-stone-900">
                                Link App Account
                              </p>

                              {profilesError ? (
                                <p className="mt-2 text-sm text-red-700">
                                  Registered accounts could not be
                                  loaded.
                                </p>
                              ) : unlinkedProfiles.length === 0 ? (
                                <p className="mt-2 text-sm text-stone-600">
                                  No unlinked customer accounts are
                                  currently available.
                                </p>
                              ) : (
                                <form
                                  action={linkCustomerAccount}
                                  className="mt-3 flex flex-col gap-3 lg:flex-row"
                                >
                                  <input
                                    type="hidden"
                                    name="customer_id"
                                    value={customer.id}
                                  />

                                  <select
                                    name="profile_id"
                                    required
                                    defaultValue=""
                                    className="min-w-0 flex-1 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-700"
                                  >
                                    <option value="" disabled>
                                      Select registered account
                                    </option>

                                    {unlinkedProfiles.map(
                                      (profile) => {
                                        const fullName = [
                                          profile.first_name,
                                          profile.last_name,
                                        ]
                                          .filter(Boolean)
                                          .join(" ");

                                        const label =
                                          fullName &&
                                          profile.email
                                            ? `${fullName} — ${profile.email}`
                                            : fullName ||
                                              profile.email ||
                                              "Customer account";

                                        return (
                                          <option
                                            key={profile.id}
                                            value={profile.id}
                                          >
                                            {label}
                                          </option>
                                        );
                                      }
                                    )}
                                  </select>

                                  <button
                                    type="submit"
                                    className="rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-stone-700"
                                  >
                                    Link Account
                                  </button>
                                </form>
                              )}
                            </div>
                          )}

                          <div className="mt-5 flex flex-wrap gap-3">
                            <Link
                              href={`/admin/customers/${customer.id}/edit`}
                              className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
                            >
                              Edit
                            </Link>

                            <form action={toggleCustomerStatus}>
                              <input
                                type="hidden"
                                name="id"
                                value={customer.id}
                              />

                              <input
                                type="hidden"
                                name="is_active"
                                value={String(
                                  customer.is_active
                                )}
                              />

                              <button
                                type="submit"
                                className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
                              >
                                {customer.is_active
                                  ? "Archive"
                                  : "Reactivate"}
                              </button>
                            </form>
                          </div>
                        </div>

                        <div className="shrink-0">
                          <p className="text-sm font-medium text-stone-500">
                            Customer
                          </p>
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