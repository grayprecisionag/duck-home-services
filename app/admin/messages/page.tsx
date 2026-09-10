import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type Conversation = {
  conversation_id: string;
  customer_id: string;
  customer_first_name: string;
  customer_last_name: string;
  customer_email: string | null;
  updated_at: string;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
};

export default async function AdminMessagesPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "admin_get_conversations"
  );

  const conversations =
    (data as Conversation[] | null) ?? [];

  return (
    <main className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-stone-500">
              Duck Home Services
            </p>

            <h1 className="text-2xl font-semibold text-stone-900">
              Messages
            </h1>
          </div>

          <Link
            href="/admin"
            className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
          >
            Back to Admin
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <div>
          <h2 className="text-2xl font-semibold text-stone-900">
            Customer Conversations
          </h2>

          <p className="mt-2 text-sm text-stone-600">
            View and reply to customer messages.
          </p>
        </div>

        {error ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-6">
            <p className="text-sm text-red-700">
              Unable to load conversations:{" "}
              {error.message}
            </p>
          </div>
        ) : conversations.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-stone-300 bg-white p-10 text-center">
            <p className="font-medium text-stone-800">
              No customer conversations yet.
            </p>

            <p className="mt-2 text-sm text-stone-500">
              New conversations will appear here
              when a customer sends a message.
            </p>
          </div>
        ) : (
          <div className="mt-6 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
            <div className="divide-y divide-stone-200">
              {conversations.map((conversation) => {
                const hasUnread =
                  conversation.unread_count > 0;

                return (
                  <Link
                    key={conversation.conversation_id}
                    href={`/admin/messages/${conversation.customer_id}`}
                    className={`block p-5 transition hover:bg-stone-50 ${
                      hasUnread ? "bg-stone-100" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p
                            className={`text-stone-900 ${
                              hasUnread
                                ? "font-bold"
                                : "font-semibold"
                            }`}
                          >
                            {
                              conversation.customer_first_name
                            }{" "}
                            {
                              conversation.customer_last_name
                            }
                          </p>

                          {hasUnread && (
                            <span className="rounded-full bg-stone-900 px-2.5 py-1 text-xs font-semibold text-white">
                              {conversation.unread_count}{" "}
                              unread
                            </span>
                          )}
                        </div>

                        {conversation.customer_email && (
                          <p className="mt-1 text-xs text-stone-500">
                            {
                              conversation.customer_email
                            }
                          </p>
                        )}

                        <p
                          className={`mt-3 line-clamp-2 text-sm leading-6 ${
                            hasUnread
                              ? "font-medium text-stone-900"
                              : "text-stone-600"
                          }`}
                        >
                          {conversation.last_message ??
                            "No messages yet."}
                        </p>
                      </div>

                      <div className="shrink-0 text-right">
                        {conversation.last_message_at && (
                          <p
                            className={`text-xs ${
                              hasUnread
                                ? "font-medium text-stone-700"
                                : "text-stone-400"
                            }`}
                          >
                            {formatDateTime(
                              conversation.last_message_at
                            )}
                          </p>
                        )}

                        <p className="mt-3 text-sm font-medium text-stone-900">
                          Open →
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
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