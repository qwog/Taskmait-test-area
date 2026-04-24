"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createBrowserSupabase();
  const [form, setForm] = useState({ email: "", password: "", orgName: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { org_name: form.orgName } },
    });
    if (error || !data.user) {
      setError(error?.message ?? "signup failed");
      setLoading(false);
      return;
    }

    // Client-side bootstrap: create org + profile. In production, prefer a
    // Supabase auth hook that runs server-side so the browser session doesn't
    // need RLS exceptions.
    const { data: org, error: orgErr } = await supabase
      .from("organizations")
      .insert({ name: form.orgName, owner_user_id: data.user.id })
      .select()
      .single();
    if (orgErr || !org) {
      setError(orgErr?.message ?? "org create failed");
      setLoading(false);
      return;
    }
    await supabase.from("users_profile").insert({
      id: data.user.id,
      org_id: org.id,
      email: form.email,
      role: "owner",
    });

    setLoading(false);
    router.push("/dashboard");
  }

  return (
    <main className="mx-auto max-w-sm p-8">
      <h1 className="text-2xl font-bold">Start your PourGuard trial</h1>
      <p className="mt-1 text-sm text-slate-600">
        5 pours free. No credit card.
      </p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <input
          required
          placeholder="Company name"
          className="w-full rounded border p-3"
          value={form.orgName}
          onChange={(e) => setForm({ ...form, orgName: e.target.value })}
        />
        <input
          type="email"
          required
          placeholder="you@company.com"
          className="w-full rounded border p-3"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <input
          type="password"
          required
          minLength={8}
          placeholder="password (8+ chars)"
          className="w-full rounded border p-3"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-green-600 p-3 font-semibold text-white disabled:opacity-50"
        >
          {loading ? "Creating…" : "Start trial"}
        </button>
      </form>
    </main>
  );
}
