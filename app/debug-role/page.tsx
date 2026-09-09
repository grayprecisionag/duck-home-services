import { createClient } from "@/lib/supabase/server";

export default async function DebugRolePage() {
  const supabase = await createClient();

  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  const userId = claimsData?.claims?.sub;

  if (claimsError || !userId) {
    return (
      <main className="p-10">
        <h1 className="text-2xl font-bold">Role Debug</h1>

        <pre className="mt-6">
          {JSON.stringify(
            {
              claimsError: claimsError?.message,
              userId,
            },
            null,
            2
          )}
        </pre>
      </main>
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, role")
    .eq("id", userId)
    .single();

  return (
    <main className="min-h-screen bg-stone-50 p-10">
      <div className="mx-auto max-w-2xl rounded-2xl border border-stone-200 bg-white p-8">
        <h1 className="text-2xl font-semibold text-stone-900">
          Duck Home Services — Role Debug
        </h1>

        <div className="mt-6">
          <p className="font-medium">Current authenticated profile:</p>

          <pre className="mt-4 overflow-auto rounded-xl bg-stone-100 p-4 text-sm">
            {JSON.stringify(
              {
                userId,
                profile,
                profileError: profileError?.message,
              },
              null,
              2
            )}
          </pre>
        </div>
      </div>
    </main>
  );
}