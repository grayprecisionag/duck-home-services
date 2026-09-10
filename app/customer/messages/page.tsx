import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { sendCustomerMessage } from "./actions";

type Message = {
  message_id: string;
  body: string;
  sender_profile_id: string;
  sender_role: string;
  read_at: string | null;
  created_at: string;
};

export default async function CustomerMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{
    saved?: string;
  }>;
}) {
  const { saved } = await searchParams;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const {
    data,
    error,
  } = await supabase.rpc(
    "customer_get_messages"
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
              Messages
            </h1>
          </div>

          <Link
            href="/customer"
            className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
          >
            Back to Dashboard
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

        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
          <div className="border-b border-stone-200 px-6 py-5">
            <h2 className="text-lg font-semibold text-stone-900">
              Conversation
            </h2>

            <p className="mt-1 text-sm text-stone-600">
              Send a message directly to Duck Home
              Services.
            </p>
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
                <div className="max-w-sm text-center">
                  <p className="font-medium text-stone-800">
                    No messages yet
                  </p>

                  <p className="mt-2 text-sm leading-6 text-stone-500">
                    Send your first message below if you
                    have a question about a service,
                    booking, payment, or upcoming job.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => {
                  const isCustomer =
                    message.sender_profile_id ===
                    user.id;

                  return (
                    <div
                      key={message.message_id}
                      className={`flex ${
                        isCustomer
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                          isCustomer
                            ? "bg-stone-900 text-white"
                            : "border border-stone-200 bg-white text-stone-900"
                        }`}
                      >
                        {!isCustomer && (
                          <p className="mb-1 text-xs font-medium text-stone-500">
                            Duck Home Services
                          </p>
                        )}

                        <p className="whitespace-pre-wrap text-sm leading-6">
                          {message.body}
                        </p>

                        <p
                          className={`mt-2 text-xs ${
                            isCustomer
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
              action={sendCustomerMessage}
              className="space-y-3"
            >
              <label
                htmlFor="body"
                className="block text-sm font-medium text-stone-700"
              >
                New Message
              </label>

              <textarea
                id="body"
                name="body"
                rows={4}
                required
                placeholder="Type your message..."
                className="w-full resize-none rounded-xl border border-stone-300 px-4 py-3 text-sm outline-none focus:border-stone-500"
              />

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="rounded-xl bg-stone-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-stone-700"
                >
                  Send Message
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