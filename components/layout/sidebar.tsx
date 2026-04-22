import Link from "next/link";

const nav = [
  ["Dashboard", "/"],
  ["Leads", "/leads"],
  ["Companies", "/companies"],
  ["Contacts", "/contacts"],
  ["Deals", "/deals"],
  ["Products", "/products"],
  ["Inventory", "/inventory"],
  ["Issues", "/issues"],
  ["Ad Sales", "/ad-sales"],
  ["Tasks", "/tasks"],
  ["Reports", "/reports"],
  ["Settings", "/settings"]
];

export function Sidebar() {
  return (
    <aside className="w-56 border-r border-slate-200 bg-white p-4">
      <p className="mb-4 text-sm font-semibold text-slate-500">Localendar CRM</p>
      <nav className="space-y-1">
        {nav.map(([label, href]) => (
          <Link key={href} className="block rounded-md px-3 py-2 text-sm hover:bg-slate-100" href={href}>
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
