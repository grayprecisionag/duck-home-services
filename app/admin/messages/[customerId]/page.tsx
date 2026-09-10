import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { sendAdminMessage } from "./actions";

type Message = {
  message_id: string;
  body: string;
  sender_profile_id: string;
  sender_role: string;
  read_at: string | null;
  created_at: string;
};

type Customer = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
};

export default async function AdminConversationPage({
  params,
  searchParams,
}: {
  params: Promise<{
    customerId: string;
  }>;
  searchParams: Promise<{
    saved?: string;
  }>;
}) {
  const { customerId } = await params;
  const { saved } = await searchParams;

  const supabase = await createClient();

  const { data: customer } = await supabase
    .from("customers")
    .select(`
      id,
      first_name,
      last_name,
      email,
      phone
    `)
    .eq("id", customerId)
    .single();

  const { error: markReadError } = await supabase.rpc(
    "admin_mark_customer_messages_read",
    {
      p_customer_id: customerId,
    }
  );

  const { data, error } = await supabase.rpc(
    "admin_get_messages",
    {
      p_customer_id: customerId,
    }
  );

  const messages =
    (data as Message[] | null) ?? [];

  return (
    <main className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-stone-500">
              Duck Home Services
            </p>

            <h1 className="text-2xl font-semibold text-stone-900">
              {customer
                ? `${customer.first_name} ${customer.last_name}`
                : "Customer Conversation"}
            </h1>
          </div>

          <Link
            href="/admin/messages"
            className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
          >
            Back to Messages
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-6 py-10">
        {saved === "sent" && (
          <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 px-5 py-4">
            <p className="font-medium text-green-800">
              Message sent successfully.
            </p>
          </div>
        )}

        {markReadError && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
            <p className="text-sm text-amber-800">
              Messages loaded, but unread status could not be updated:{" "}
              {markReadError.message}
            </p>
          </div>
        )}

        {customer && (
          <div className="mb-6 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <p className="font-medium text-stone-900">
              {customer.first_name}{" "}
              {customer.last_name}
            </p>

            {customer.email && (
              <p className="mt-1 text-sm text-stone-600">
                {customer.email}
              </p>
            )}

            {customer.phone && (
              <p className="mt-1 text-sm text-stone-600">
                {customer.phone}
              </p>
            )}
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
          <div className="border-b border-stone-200 px-6 py-5">
            <h2 className="text-lg font-semibold text-stone-900">
              Conversation
            </h2>
          </div>

          <div className="min-h-[420px] bg-stone-50 p-6">
            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm text-red-700">
                  Unable to load messages:{" "}
                  {error.message}
                </p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex min-h-[350px] items-center justify-center">
                <p className="text-sm text-stone-500">
                  No messages in this conversation.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => {
                  const isAdmin =
                    message.sender_role === "admin";

                  return (
                    <div
                      key={message.message_id}
                      className={`flex ${
                        isAdmin
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                          isAdmin
                            ? "bg-stone-900 text-white"
                            : "border border-stone-200 bg-white text-stone-900"
                        }`}
                      >
                        {!isAdmin && (
                          <p className="mb-1 text-xs font-medium text-stone-500">
                            {customer
                              ? customer.first_name
                              : "Customer"}
                          </p>
                        )}

                        <p className="whitespace-pre-wrap text-sm leading-6">
                          {message.body}
                        </p>

                        <p
                          className={`mt-2 text-xs ${
                            isAdmin
                              ? "text-stone-300"
                              : "text-stone-400"
                          }`}
                        >
                          {formatDateTime(
                            message.created_at
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t border-stone-200 bg-white p-5">
            <form
              action={sendAdminMessage}
              className="space-y-3"
            >
              <input
                type="hidden"
                name="customer_id"
                value={customerId}
              />

              <label
                htmlFor="body"
                className="block text-sm font-medium text-stone-700"
              >
                Reply
              </label>

              <textarea
                id="body"
                name="body"
                rows={4}
                required
                placeholder="Type your reply..."
                className="w-full resize-none rounded-xl border border-stone-300 px-4 py-3 text-sm outline-none focus:border-stone-500"
              />

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="rounded-xl bg-stone-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-stone-700"
                >
                  Send Reply
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}

function formatDateTime(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}