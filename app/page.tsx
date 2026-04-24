import Link from "next/link";

export default function RootPage() {
  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-3xl font-bold">PourGuard</h1>
      <p className="mt-2 text-slate-600">
        Concrete pour QC and decision support grounded in ACI standards.
      </p>
      <div className="mt-8 flex gap-4">
        <Link
          href="/field"
          className="rounded-md bg-green-600 px-6 py-3 text-white font-semibold"
        >
          Field Mode
        </Link>
        <Link
          href="/dashboard"
          className="rounded-md bg-slate-800 px-6 py-3 text-white font-semibold"
        >
          Office Mode
        </Link>
      </div>
    </main>
  );
}
