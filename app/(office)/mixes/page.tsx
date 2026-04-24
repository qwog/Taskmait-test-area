import { createServerSupabase } from "@/lib/supabase/server";

export default async function MixesPage() {
  const supabase = createServerSupabase();
  const { data } = await supabase
    .from("mix_designs")
    .select("id, name, cement_type, design_strength_psi, wc_ratio, target_air_pct_min, target_air_pct_max")
    .order("name");
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Mix Designs</h1>
      <table className="w-full divide-y border">
        <thead className="bg-slate-50 text-left text-sm">
          <tr>
            <th className="p-3">Name</th>
            <th className="p-3">Cement</th>
            <th className="p-3">Strength</th>
            <th className="p-3">W/C</th>
            <th className="p-3">Air %</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {(data ?? []).map((m) => (
            <tr key={m.id}>
              <td className="p-3 font-medium">{m.name}</td>
              <td className="p-3">{m.cement_type}</td>
              <td className="p-3">{m.design_strength_psi} psi</td>
              <td className="p-3">{m.wc_ratio}</td>
              <td className="p-3">
                {m.target_air_pct_min != null && m.target_air_pct_max != null
                  ? `${m.target_air_pct_min}–${m.target_air_pct_max}`
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
