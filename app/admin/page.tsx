import Link from "next/link";

export default async function AdminPage() {
  return (
    <main className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-stone-500">
              Duck Home Services
            </p>

            <h1 className="text-2xl font-semibold text-stone-900">
              Admin Dashboard
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

      <section className="mx-auto max-w-7xl px-6 py-10">
        <h2 className="text-3xl font-semibold tracking-tight text-stone-900">
          Business Management
        </h2>

        <p className="mt-3 text-stone-600">
          Manage Duck Home Services from one place.
        </p>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <DashboardCard
            title="Schedule"
            description="View and manage upcoming jobs."
            href="/admin/schedule"
          />

          <DashboardCard
            title="Booking Requests"
            description="Review and approve bookings for existing services."
            href="/admin/booking-requests"
          />

          <DashboardCard
            title="Service Requests"
            description="Review custom requests, send quotes, and schedule accepted jobs."
            href="/admin/service-requests"
          />

          <DashboardCard
            title="Customers"
            description="Manage customer information and service history."
            href="/admin/customers"
          />

          <DashboardCard
            title="Services"
            description="Manage services and pricing."
            href="/admin/services"
          />

          <DashboardCard
            title="Subscriptions"
            description="Manage recurring customer service plans."
            href="/admin/subscriptions"
          />

          <DashboardCard
            title="Invoices & Payments"
            description="Track invoices, receipts, and payments."
            href="/admin/invoices"
          />

          <DashboardCard
            title="Messages"
            description="View and respond to customer messages."
          />

          <DashboardCard
            title="Business Settings"
            description="Manage business and account settings."
          />
        </div>
      </section>
    </main>
  );
}

function DashboardCard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href?: string;
}) {
  const content = (
    <>
      <h3 className="text-lg font-semibold text-stone-900">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-stone-600">
        {description}
      </p>

      <p className="mt-6 text-sm font-medium text-stone-900">
        {href ? "Open →" : "Coming soon →"}
      </p>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
      >
        {content}
      </Link>
    );
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      {content}
    </div>
  );
}