import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateService } from "../../actions";

export default async function EditServicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();

  const { data: service, error } = await supabase
    .from("services")
    .select(
      "id, name, description, category, price_cents, pricing_label, service_type"
    )
    .eq("id", id)
    .single();

  if (error || !service) {
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
              Edit Service
            </h1>
          </div>

          <Link
            href="/admin/services"
            className="rounded-xl border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100"
          >
            Back
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-6 py-10">
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <form action={updateService} className="space-y-4">
            <input type="hidden" name="id" value={service.id} />

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
                defaultValue={service.name}
                required
                className="w-full rounded-xl border border-stone-300 px-4 py-3"
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
                rows={4}
                defaultValue={service.description ?? ""}
                className="w-full rounded-xl border border-stone-300 px-4 py-3"
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
                defaultValue={service.category}
                className="w-full rounded-xl border border-stone-300 px-4 py-3"
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
                defaultValue={
                  service.price_cents === null
                    ? ""
                    : (service.price_cents / 100).toFixed(2)
                }
                className="w-full rounded-xl border border-stone-300 px-4 py-3"
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
                defaultValue={service.pricing_label ?? ""}
                className="w-full rounded-xl border border-stone-300 px-4 py-3"
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
                defaultValue={service.service_type}
                className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3"
              >
                <option value="one_time">One-time</option>
                <option value="recurring">Recurring</option>
                <option value="custom_quote">Custom quote</option>
              </select>
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