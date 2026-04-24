import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";

export default async function JobsPage() {
  const supabase = createServerSupabase();
  const { data } = await supabase
    .from("jobs")
    .select("id, client_name, address, job_type, exposure_class, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Jobs</h1>
        <Link
          href="/jobs/new"
          className="rounded bg-green-600 px-4 py-2 font-semibold text-white"
        >
          New Job
        </Link>
      </div>
      <table className="w-full divide-y border">
        <thead className="bg-slate-50 text-left text-sm">
          <tr>
            <th className="p-3">Client</th>
            <th className="p-3">Address</th>
            <th className="p-3">Type</th>
            <th className="p-3">Exposure</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {(data ?? []).map((j) => (
            <tr key={j.id}>
              <td className="p-3">
                <Link href={`/jobs/${j.id}`} className="text-green-800 underline">
                  {j.client_name}
                </Link>
              </td>
              <td className="p-3">{j.address}</td>
              <td className="p-3">{j.job_type}</td>
              <td className="p-3">{j.exposure_class}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
