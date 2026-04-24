import { createServerSupabase } from "@/lib/supabase/server";

export default async function SuppliersPage() {
  const supabase = createServerSupabase();
  const { data } = await supabase
    .from("suppliers")
    .select("id, name, contact_name, contact_phone")
    .order("name");
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Suppliers</h1>
      <table className="w-full divide-y border">
        <thead className="bg-slate-50 text-left text-sm">
          <tr>
            <th className="p-3">Name</th>
            <th className="p-3">Contact</th>
            <th className="p-3">Phone</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {(data ?? []).map((s) => (
            <tr key={s.id}>
              <td className="p-3 font-medium">{s.name}</td>
              <td className="p-3">{s.contact_name ?? "—"}</td>
              <td className="p-3">{s.contact_phone ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
