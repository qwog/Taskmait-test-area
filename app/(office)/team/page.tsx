import { createServerSupabase } from "@/lib/supabase/server";

export default async function TeamPage() {
  const supabase = createServerSupabase();
  const { data } = await supabase
    .from("users_profile")
    .select("id, email, full_name, role")
    .order("created_at");
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Team</h1>
      <p className="text-sm text-slate-600">
        Invite a crew member by email. They'll receive a magic link. Roles:
        owner, PM, foreman, crew.
      </p>
      <table className="w-full divide-y border">
        <thead className="bg-slate-50 text-left text-sm">
          <tr>
            <th className="p-3">Name</th>
            <th className="p-3">Email</th>
            <th className="p-3">Role</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {(data ?? []).map((u) => (
            <tr key={u.id}>
              <td className="p-3">{u.full_name ?? "—"}</td>
              <td className="p-3">{u.email}</td>
              <td className="p-3 capitalize">{u.role}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
