import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";

const TONE: Record<string, string> = {
  green: "bg-green-100 text-green-800",
  yellow: "bg-yellow-100 text-yellow-900",
  red: "bg-red-100 text-red-800",
};

export default async function PoursPage() {
  const supabase = createServerSupabase();
  const { data } = await supabase
    .from("pours")
    .select("id, scheduled_at, status, pre_pour_risk_level, jobs(client_name)")
    .order("scheduled_at", { ascending: false });

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Pours</h1>
      <table className="w-full divide-y border">
        <thead className="bg-slate-50 text-left text-sm">
          <tr>
            <th className="p-3">Scheduled</th>
            <th className="p-3">Client</th>
            <th className="p-3">Status</th>
            <th className="p-3">Risk</th>
            <th className="p-3 text-right">PDF</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {(data ?? []).map((p) => (
            <tr key={p.id}>
              <td className="p-3">{new Date(p.scheduled_at).toLocaleString()}</td>
              <td className="p-3">
                <Link href={`/pours/${p.id}`} className="underline">
                  {(p.jobs as { client_name?: string } | null)?.client_name ?? "—"}
                </Link>
              </td>
              <td className="p-3">{p.status}</td>
              <td className="p-3">
                {p.pre_pour_risk_level && (
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-semibold ${
                      TONE[p.pre_pour_risk_level] ?? ""
                    }`}
                  >
                    {p.pre_pour_risk_level.toUpperCase()}
                  </span>
                )}
              </td>
              <td className="p-3 text-right">
                <Link
                  href={`/api/pours/${p.id}/pdf`}
                  className="text-blue-700 underline"
                >
                  Download
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
