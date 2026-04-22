export function Header() {
  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
      <input
        className="w-full max-w-md rounded-md border border-slate-300 px-3 py-2 text-sm"
        placeholder="Search companies, contacts, leads, deals, ad sales, issues..."
      />
      <button className="ml-4 rounded-md bg-slate-900 px-3 py-2 text-sm text-white">Create</button>
    </header>
  );
}
