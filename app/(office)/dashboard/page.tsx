import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = createServerSupabase();
  const [{ count: activeJobs }, { count: pourCount }, { data: reds }] =
    await Promise.all([
      supabase.from("jobs").select("*", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("pours").select("*", { count: "exact", head: true }),
      supabase
        .from("pours")
        .select("id, scheduled_at, pre_pour_risk_level, jobs(client_name, address)")
        .eq("pre_pour_risk_level", "red")
        .order("scheduled_at", { ascending: false })
        .limit(5),
    ]);

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-4 gap-4">
        <Card label="Active jobs" value={activeJobs ?? 0} />
        <Card label="Pours tracked" value={pourCount ?? 0} />
        <Card label="Red flags (recent)" value={reds?.length ?? 0} tone="red" />
        <Card label="Pours this period" value="—" />
      </div>
      {reds && reds.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold">Recent red flags</h2>
          <ul className="mt-2 divide-y rounded border">
            {reds.map((p) => (
              <li key={p.id} className="p-3">
                <Link href={`/pours/${p.id}`} className="text-red-700 underline">
                  {new Date(p.scheduled_at).toLocaleDateString()}
                </Link>{" "}
                — {(p.jobs as { client_name?: string } | null)?.client_name ?? "unknown"}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Card({ label, value, tone }: { label: string; value: string | number; tone?: "red" }) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        tone === "red" ? "border-red-300 bg-red-50" : "bg-white"
      }`}
    >
      <div className="text-sm text-slate-600">{label}</div>
      <div className="mt-1 text-3xl font-bold">{value}</div>
    </div>
  );
}
