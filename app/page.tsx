import { PageShell } from "@/components/ui/page-shell";

const cards = [
  ["Open Deals", "24"],
  ["Current Issue Revenue", "$8,340"],
  ["Next Issue Revenue", "$4,200"],
  ["Renewal Opportunities", "11"],
  ["Unpaid Ad Sales", "6"],
  ["Slot Occupancy", "62%"]
];

export default function DashboardPage() {
  return (
    <div>
      <PageShell title="Dashboard" description="Snapshot of pipeline, revenue, renewals, and inventory occupancy." />
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map(([label, value]) => (
          <article key={label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold">{value}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
