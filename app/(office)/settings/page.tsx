import { createServerSupabase } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("users_profile").select("*, organizations(*)").eq("id", user.id).single()
    : { data: null };

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-3xl font-bold">Settings</h1>
      <section className="rounded border p-4">
        <h2 className="text-xl font-semibold">Organization</h2>
        <dl className="mt-3 grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-slate-600">Name</dt>
          <dd>{(profile?.organizations as { name?: string } | null)?.name ?? "—"}</dd>
          <dt className="text-slate-600">Plan</dt>
          <dd>{(profile?.organizations as { subscription_tier?: string } | null)?.subscription_tier ?? "—"}</dd>
          <dt className="text-slate-600">Status</dt>
          <dd>{(profile?.organizations as { subscription_status?: string } | null)?.subscription_status ?? "—"}</dd>
        </dl>
      </section>
      <section className="rounded border p-4">
        <h2 className="text-xl font-semibold">Billing</h2>
        <a
          href="/api/stripe/portal"
          className="mt-2 inline-block rounded bg-slate-800 px-4 py-2 text-sm text-white"
        >
          Manage subscription
        </a>
      </section>
    </div>
  );
}
