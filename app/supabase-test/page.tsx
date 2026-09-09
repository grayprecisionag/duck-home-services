import { createClient } from "@/lib/supabase/server";

export default async function SupabaseTestPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getSession();

  return (
    <main className="min-h-screen bg-stone-50 p-10">
      <div className="mx-auto max-w-2xl rounded-2xl border border-stone-200 bg-white p-8">
        <h1 className="text-2xl font-semibold text-stone-900">
          Supabase Connection Test
        </h1>

        {error ? (
          <div className="mt-6 rounded-xl bg-red-50 p-4 text-red-700">
            Connection error: {error.message}
          </div>
        ) : (
          <div className="mt-6 rounded-xl bg-green-50 p-4 text-green-800">
            Supabase connection is working.
          </div>
        )}

        <pre className="mt-6 overflow-auto rounded-xl bg-stone-100 p-4 text-sm text-stone-700">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    </main>
  );
}