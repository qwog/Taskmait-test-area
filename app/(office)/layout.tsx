import Link from "next/link";

const NAV = [
  ["/dashboard", "Dashboard"],
  ["/jobs", "Jobs"],
  ["/pours", "Pours"],
  ["/mixes", "Mix Designs"],
  ["/suppliers", "Suppliers"],
  ["/team", "Team"],
  ["/settings", "Settings"],
] as const;

export default function OfficeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-60 shrink-0 border-r bg-slate-50 p-4">
        <Link href="/" className="block text-lg font-bold">
          PourGuard
        </Link>
        <nav className="mt-6 space-y-1">
          {NAV.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="block rounded px-3 py-2 text-sm hover:bg-slate-200"
            >
              {label}
            </Link>
          ))}
        </nav>
        <Link
          href="/field"
          className="mt-8 block rounded bg-green-600 px-3 py-2 text-center text-sm font-semibold text-white"
        >
          Enter Field Mode
        </Link>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
