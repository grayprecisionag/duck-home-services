import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateCustomer } from "../../actions";

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();

  const { data: customer, error } = await supabase
    .from("customers")
    .select(
      "id, first_name, last_name, email, phone, street_address, city, state, zip_code, notes"
    )
    .eq("id", id)
    .single();

  if (error || !customer) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-stone-500">
              Duck Home Services
            </p>

            <h1 className="text-2xl font-semibold text-stone-900">
              Edit Customer
            </h1>
          </div>

          <Link
            href="/admin/customers"
            className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100"
          >
            Back
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-6 py-10">
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <form action={updateCustomer} className="space-y-4">
            <input type="hidden" name="id" value={customer.id} />

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
                  defaultValue={customer.first_name}
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
                  defaultValue={customer.last_name}
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
                defaultValue={customer.email ?? ""}
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
                defaultValue={customer.phone ?? ""}
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
                defaultValue={customer.street_address ?? ""}
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
                  defaultValue={customer.city ?? ""}
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
                  defaultValue={customer.state ?? "CA"}
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
                  defaultValue={customer.zip_code ?? ""}
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
                rows={4}
                defaultValue={customer.notes ?? ""}
                className="w-full rounded-xl border border-stone-300 px-4 py-3"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-stone-900 px-5 py-3 text-sm font-medium text-white hover:bg-stone-700"
            >
              Save Changes
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}