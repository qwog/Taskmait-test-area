import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Bell,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Download,
  Edit,
  FileText,
  Filter,
  Menu,
  Plus,
  Printer,
  Save,
  Search,
  Settings,
  Trash2,
  TrendingDown,
  Upload,
  Users,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const STORAGE_KEY = "taskmait_renewal_tracker";
const AUDIT_URL = "https://www.taskmait.com/contact";

const NAV_ITEMS = [
  "Dashboard",
  "Contract Manager",
  "Renewal Calendar",
  "Usage & Utilization Tracker",
  "Savings Report",
  "Settings",
];

const STATUS_OPTIONS = [
  "Not Reviewed",
  "Under Review",
  "Renewing",
  "Renegotiating",
  "Canceling",
  "Canceled",
  "Renewed",
];

const CONTRACT_TYPE_LENGTHS = {
  "Month-to-Month": 1,
  Annual: 12,
  "Multi-Year": 24,
};

const PAYMENT_TERMS = ["Monthly", "Quarterly", "Annually", "Prepaid"];
const LICENSE_TYPES = ["Per User", "Per Seat", "Flat Rate", "Usage-Based", "Tiered", "Other"];
const TEAM_OPTIONS = [
  "Sales",
  "Marketing",
  "Operations",
  "Finance",
  "HR",
  "IT",
  "Executive",
  "Engineering",
  "Customer Support",
  "Other",
];

const money = (value = 0) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);

const pct = (value = 0) => `${Math.round(value)}%`;
const fmtDate = (value) => (value ? new Date(value).toLocaleDateString() : "—");

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const daysUntil = (dateStr) => {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
};

const uid = () => Math.random().toString(36).slice(2, 10);

const derive = (contract) => {
  const length = Number(contract.contractLengthMonths || 1);
  const seats = Number(contract.licensedSeats || 0);
  const active = Number(contract.activeSeats || 0);
  const totalValue = Number(contract.totalContractValue || 0);
  const monthlyCost = totalValue / Math.max(1, length);
  const costPerSeatMonthly = seats ? monthlyCost / seats : 0;
  const utilization = seats ? (active / seats) * 100 : 0;
  const unusedSeats = Math.max(0, seats - active);
  const monthlyWaste = unusedSeats * costPerSeatMonthly;
  const annualWaste = monthlyWaste * 12;
  const renewalInDays = daysUntil(contract.contractEndDate);
  const cancelDeadline = contract.autoRenew
    ? addDays(new Date(contract.contractEndDate), -Number(contract.cancellationNoticeWindowDays || 0)).toISOString()
    : null;
  const lockIn = contract.autoRenew && cancelDeadline ? daysUntil(cancelDeadline) < 0 : false;
  return {
    ...contract,
    monthlyCost,
    costPerSeatMonthly,
    costPerSeatAnnual: costPerSeatMonthly * 12,
    utilization,
    unusedSeats,
    monthlyWaste,
    annualWaste,
    renewalInDays,
    cancellationNoticeDeadline: cancelDeadline,
    isLockedIn: lockIn,
  };
};

const demoContracts = () => {
  const today = new Date();
  const mk = ({ vendorName, programName, type, length, monthlyCost, seats, active, autoRenew, cancelWindow, escalation, status, renewalIn, notes }) => {
    const end = renewalIn === null ? addDays(today, 365) : addDays(today, renewalIn);
    const start = addDays(end, -length * 30);
    return derive({
      id: uid(),
      vendorName,
      programName,
      contractType: type,
      contractLengthMonths: length,
      contractStartDate: start.toISOString(),
      contractEndDate: end.toISOString(),
      totalContractValue: monthlyCost * length,
      paymentTerms: "Monthly",
      licensedSeats: seats,
      activeSeats: active,
      departmentTeams: ["IT"],
      licenseType: "Per Seat",
      autoRenew,
      cancellationNoticeWindowDays: cancelWindow,
      annualEscalationPct: escalation,
      discountPromotional: false,
      renewalDecisionStatus: status,
      remindersEnabled: true,
      reminderEarlyDays: 90,
      reminderDecisionDays: cancelWindow || 30,
      reminderFinalDays: Math.max(7, (cancelWindow || 30) - 7),
      notes: notes || "",
      lastUsageReviewDate: addDays(today, -15).toISOString(),
    });
  };

  return [
    mk({ vendorName: "Salesforce", programName: "Sales Cloud Professional", type: "Annual", length: 12, monthlyCost: 1875, seats: 25, active: 14, autoRenew: true, cancelWindow: 60, escalation: 7, status: "Not Reviewed", renewalIn: 22, notes: "Account rep offered 10% discount for 2-year commitment last quarter. Support response times have been slow." }),
    mk({ vendorName: "HubSpot", programName: "Marketing Hub Professional", type: "Annual", length: 12, monthlyCost: 890, seats: 10, active: 8, autoRenew: true, cancelWindow: 30, escalation: 5, status: "Not Reviewed", renewalIn: 45 }),
    mk({ vendorName: "Slack", programName: "Business+", type: "Annual", length: 12, monthlyCost: 937.5, seats: 75, active: 71, autoRenew: true, cancelWindow: 30, escalation: 0, status: "Under Review", renewalIn: 120 }),
    mk({ vendorName: "Google Workspace", programName: "Business Standard", type: "Annual", length: 12, monthlyCost: 1080, seats: 75, active: 73, autoRenew: true, cancelWindow: 30, escalation: 0, status: "Renewed", renewalIn: 340 }),
    mk({ vendorName: "Asana", programName: "Business", type: "Annual", length: 12, monthlyCost: 1872, seats: 60, active: 33, autoRenew: true, cancelWindow: 60, escalation: 5, status: "Not Reviewed", renewalIn: 88, notes: "Team barely uses this — most people use Monday.com instead. Consider consolidating." }),
    mk({ vendorName: "Zoom", programName: "Business", type: "Annual", length: 12, monthlyCost: 1387.5, seats: 75, active: 68, autoRenew: true, cancelWindow: 30, escalation: 3, status: "Renewing", renewalIn: 200 }),
    mk({ vendorName: "Adobe Creative Cloud", programName: "All Apps", type: "Multi-Year", length: 24, monthlyCost: 4195, seats: 12, active: 5, autoRenew: true, cancelWindow: 90, escalation: 0, status: "Not Reviewed", renewalIn: 155, notes: "Only the design team uses this. Most seats are from former employees who left." }),
    mk({ vendorName: "Dropbox", programName: "Business Advanced", type: "Annual", length: 12, monthlyCost: 1440, seats: 75, active: 22, autoRenew: true, cancelWindow: 30, escalation: 8, status: "Not Reviewed", renewalIn: 67 }),
    mk({ vendorName: "Monday.com", programName: "Pro", type: "Month-to-Month", length: 1, monthlyCost: 576, seats: 40, active: 18, autoRenew: false, cancelWindow: 0, escalation: 0, status: "Not Reviewed", renewalIn: null }),
    mk({ vendorName: "Zendesk", programName: "Suite Professional", type: "Annual", length: 12, monthlyCost: 1662.5, seats: 15, active: 9, autoRenew: true, cancelWindow: 60, escalation: 5, status: "Renegotiating", renewalIn: 52 }),
  ];
};

const cardClass = "bg-white rounded-xl shadow-sm border border-slate-200 p-4";

export default function TaskmaitSaaSTracker() {
  const [contracts, setContracts] = useState([]);
  const [view, setView] = useState("Dashboard");
  const [mobileNav, setMobileNav] = useState(false);
  const [showChooser, setShowChooser] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState([]);
  const [editing, setEditing] = useState(null);
  const [sortBy, setSortBy] = useState("renewalInDays");
  const [sortDir, setSortDir] = useState("asc");
  const [toast, setToast] = useState("");

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      setShowChooser(true);
      return;
    }
    try {
      const data = JSON.parse(raw);
      setContracts((data.contracts || []).map(derive));
    } catch {
      setShowChooser(true);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ contracts }));
  }, [contracts]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const metrics = useMemo(() => {
    const totalAnnualSpend = contracts.reduce((sum, c) => sum + c.monthlyCost * 12, 0);
    const estimatedAnnualWaste = contracts.reduce((sum, c) => sum + c.annualWaste, 0);
    const avgUtilization = contracts.length ? contracts.reduce((sum, c) => sum + c.utilization, 0) / contracts.length : 0;
    const renew90 = contracts.filter((c) => c.renewalInDays !== null && c.renewalInDays <= 90 && c.renewalInDays >= 0);
    return {
      totalAnnualSpend,
      estimatedAnnualWaste,
      avgUtilization,
      renew90Count: renew90.length,
      renew90Value: renew90.reduce((sum, c) => sum + c.totalContractValue, 0),
      renew90AutoRenew: renew90.filter((c) => c.autoRenew).length,
    };
  }, [contracts]);

  const reminders = useMemo(() => {
    const items = [];
    contracts.forEach((c) => {
      if (!c.remindersEnabled || c.renewalInDays === null) return;
      [
        { key: "reminderEarlyDays", label: "Start evaluating this contract" },
        { key: "reminderDecisionDays", label: "Decision needed by this date" },
        { key: "reminderFinalDays", label: "Last chance to act" },
      ].forEach((r) => {
        const trigger = Number(c[r.key] || 0);
        if (c.renewalInDays <= trigger && c.renewalInDays >= 0) items.push({ id: `${c.id}-${r.key}`, contract: c, message: r.label });
      });
    });
    return items.sort((a, b) => a.contract.renewalInDays - b.contract.renewalInDays);
  }, [contracts]);

  const urgentItems = useMemo(() => {
    return contracts
      .flatMap((c) => {
        if (c.isLockedIn) return [{ severity: "red", text: "Locked In (notice deadline passed)", contract: c }];
        if (c.autoRenew && c.cancellationNoticeDeadline && daysUntil(c.cancellationNoticeDeadline) <= 30 && daysUntil(c.cancellationNoticeDeadline) >= 0)
          return [{ severity: "amber", text: "In cancellation notice window", contract: c }];
        if (c.renewalInDays !== null && c.renewalInDays <= 90 && c.renewalInDays >= 0)
          return [{ severity: "yellow", text: "Renewing in next 90 days", contract: c }];
        if (c.utilization < 60) return [{ severity: "blue", text: "Low utilization detected", contract: c }];
        return [];
      })
      .sort((a, b) => a.contract.renewalInDays - b.contract.renewalInDays);
  }, [contracts]);

  const filteredContracts = useMemo(() => {
    const needle = search.toLowerCase();
    return [...contracts]
      .filter((c) => `${c.vendorName} ${c.programName}`.toLowerCase().includes(needle))
      .sort((a, b) => {
        const av = a[sortBy] ?? 0;
        const bv = b[sortBy] ?? 0;
        if (av === bv) return 0;
        return sortDir === "asc" ? (av > bv ? 1 : -1) : av < bv ? 1 : -1;
      });
  }, [contracts, search, sortBy, sortDir]);

  const saveContract = useCallback(
    (draft, addAnother = false) => {
      const normalized = derive(draft);
      setContracts((prev) => {
        const has = prev.some((c) => c.id === normalized.id);
        return has ? prev.map((c) => (c.id === normalized.id ? normalized : c)) : [normalized, ...prev];
      });
      setToast("Contract saved");
      if (!addAnother) setEditing(null);
      else setEditing(defaultContract());
    },
    [setContracts]
  );

  const defaultContract = () => {
    const start = new Date();
    const end = addDays(start, 365);
    return {
      id: uid(),
      vendorName: "",
      programName: "",
      contractType: "Annual",
      contractLengthMonths: 12,
      contractStartDate: start.toISOString().slice(0, 10),
      contractEndDate: end.toISOString().slice(0, 10),
      totalContractValue: 0,
      paymentTerms: "Monthly",
      licensedSeats: 0,
      activeSeats: 0,
      departmentTeams: [],
      licenseType: "Per Seat",
      autoRenew: true,
      cancellationNoticeWindowDays: 30,
      annualEscalationPct: 0,
      discountPromotional: false,
      discountDetails: "",
      promotionalRateExpiration: "",
      renewalDecisionStatus: "Not Reviewed",
      lastNegotiationDate: "",
      vendorRepName: "",
      vendorRepEmail: "",
      vendorRepPhone: "",
      alternativeTools: "",
      notes: "",
      remindersEnabled: true,
      reminderEarlyDays: 90,
      reminderDecisionDays: 30,
      reminderFinalDays: 23,
      lastUsageReviewDate: "",
    };
  };

  const exportCSV = (rows, filename) => {
    const header = Object.keys(rows[0] || {});
    const csv = [header.join(","), ...rows.map((r) => header.map((h) => JSON.stringify(r[h] ?? "")).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  };

  const viewClass = "text-sm px-3 py-2 rounded-lg w-full text-left hover:bg-slate-100";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button className="md:hidden p-2 rounded hover:bg-slate-100" onClick={() => setMobileNav((v) => !v)} aria-label="Open menu">
            <Menu size={18} />
          </button>
          <div>
            <div className="text-2xl font-bold text-[#1B2A4A]">Taskmait</div>
            <div className="text-xs text-slate-500">Stop Overpaying for Software You Don’t Use</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="relative p-2 rounded hover:bg-slate-100" aria-label="Notifications">
            <Bell size={18} />
            {reminders.length > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full px-1">{reminders.length}</span>}
          </button>
          <a href={AUDIT_URL} className="bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">
            Get a Free Audit
          </a>
        </div>
      </header>

      <div className="flex">
        <aside className={`${mobileNav ? "block" : "hidden"} md:block w-72 p-4 border-r border-slate-200 bg-white min-h-[calc(100vh-65px)]`}>
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => (
              <button key={item} className={`${viewClass} ${view === item ? "bg-slate-100 font-semibold" : ""}`} onClick={() => { setView(item); setMobileNav(false); }}>
                {item}
              </button>
            ))}
          </nav>
          {contracts.length >= 3 && (
            <div className="mt-4 p-3 rounded-lg bg-sky-50 border border-sky-100 text-sm">
              Did you know? Taskmait clients save an average of 30% on SaaS spend. <a href={AUDIT_URL} className="text-sky-700 underline">Book a free call.</a>
            </div>
          )}
        </aside>

        <main className="flex-1 p-4 md:p-6 space-y-6">
          {showChooser && (
            <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4">
                <h2 className="text-xl font-semibold">Welcome to Taskmait Tracker</h2>
                <p className="text-slate-600">Start fresh or load demo contracts to instantly explore renewal risk and savings.</p>
                <div className="flex gap-3">
                  <button className="px-4 py-2 rounded-lg border" onClick={() => { setContracts([]); setShowChooser(false); }}>Start Fresh</button>
                  <button className="px-4 py-2 rounded-lg bg-[#1B2A4A] text-white" onClick={() => { setContracts(demoContracts()); setShowChooser(false); }}>Load Demo Data</button>
                </div>
              </div>
            </div>
          )}

          {view === "Dashboard" && (
            <>
              <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <MetricCard icon={<DollarSign size={18} />} title="Total Annual SaaS Spend" value={money(metrics.totalAnnualSpend)} sub={`Across ${contracts.length} contracts`} />
                <MetricCard icon={<TrendingDown size={18} />} title="Estimated Annual Waste" value={money(metrics.estimatedAnnualWaste)} sub="Based on current utilization data" danger />
                <MetricCard icon={<Calendar size={18} />} title="Contracts Renewing in 90 Days" value={metrics.renew90Count} sub={`Total value: ${money(metrics.renew90Value)}`} badge={metrics.renew90AutoRenew ? `${metrics.renew90AutoRenew} auto-renew` : null} />
                <MetricCard icon={<BarChart3 size={18} />} title="Average Utilization Rate" value={pct(metrics.avgUtilization)} sub="Across all tracked tools" tone={metrics.avgUtilization >= 80 ? "green" : metrics.avgUtilization >= 60 ? "amber" : "red"} />
              </section>

              <section className={cardClass}>
                <h3 className="font-semibold mb-3">Urgent Action Items</h3>
                {urgentItems.length === 0 ? (
                  <p className="text-slate-600">You’re all caught up! No urgent renewals in the next 90 days.</p>
                ) : (
                  <div className="space-y-3">
                    {urgentItems.slice(0, 8).map((u) => (
                      <div key={`${u.contract.id}-${u.text}`} className="border rounded-lg p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <div>
                          <div className="font-medium">{u.contract.vendorName} · {u.contract.programName}</div>
                          <div className="text-sm text-slate-600">{u.text} · Renewal {fmtDate(u.contract.contractEndDate)} · {u.contract.renewalInDays ?? "N/A"} days</div>
                        </div>
                        <div className="flex gap-2">
                          <button className="px-3 py-2 border rounded-lg text-sm" onClick={() => { setView("Contract Manager"); setEditing(u.contract); }}>Review Contract</button>
                          <button className="px-3 py-2 bg-slate-100 rounded-lg text-sm" onClick={() => setContracts((prev) => prev.map((c) => (c.id === u.contract.id ? derive({ ...c, renewalDecisionStatus: "Under Review" }) : c)))}>Mark as Reviewed</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className={cardClass}>
                  <h3 className="font-semibold mb-2">Monthly SaaS Spend Breakdown</h3>
                  <div className="h-80">
                    <ResponsiveContainer>
                      <BarChart data={[...contracts].sort((a, b) => b.monthlyCost - a.monthlyCost)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="vendorName" hide />
                        <YAxis />
                        <Tooltip formatter={(v) => money(v)} />
                        <Bar dataKey="monthlyCost">
                          {contracts.map((c) => (
                            <Cell key={c.id} fill={c.utilization >= 80 ? "#10B981" : c.utilization >= 60 ? "#F59E0B" : "#EF4444"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className={cardClass}>
                  <h3 className="font-semibold mb-2">Renewal Timeline (Next 12 Months)</h3>
                  <div className="h-80">
                    <ResponsiveContainer>
                      <ComposedChart data={contracts.filter((c) => c.renewalInDays !== null && c.renewalInDays <= 365)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="vendorName" hide />
                        <YAxis />
                        <Tooltip formatter={(v) => money(v)} />
                        <Bar dataKey="totalContractValue" fill="#93C5FD" />
                        <Line dataKey="renewalInDays" stroke="#1B2A4A" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </section>
            </>
          )}

          {view === "Contract Manager" && (
            <section className={cardClass + " space-y-4"}>
              <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
                <div className="flex gap-2 flex-wrap">
                  <button className="px-3 py-2 rounded-lg bg-[#1B2A4A] text-white text-sm flex items-center gap-2" onClick={() => setEditing(defaultContract())}><Plus size={14} /> Add Contract</button>
                  <button className="px-3 py-2 rounded-lg border text-sm flex items-center gap-2" onClick={() => exportCSV(filteredContracts, "contracts.csv")}><Download size={14} /> Download CSV</button>
                </div>
                <div className="relative w-full md:w-96">
                  <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
                  <input className="w-full pl-9 pr-3 py-2 border rounded-lg" placeholder="Search vendor or program" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
              </div>
              <div className="overflow-auto">
                <table className="min-w-[1100px] w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      {[
                        ["vendorName", "Vendor"],
                        ["programName", "Program"],
                        ["monthlyCost", "Monthly Cost"],
                        ["licensedSeats", "Seats"],
                        ["activeSeats", "Active"],
                        ["utilization", "Utilization"],
                        ["contractEndDate", "Renewal Date"],
                        ["renewalInDays", "Days"],
                        ["autoRenew", "Auto-Renew"],
                        ["renewalDecisionStatus", "Status"],
                      ].map(([key, label]) => (
                        <th key={key} className="text-left py-2 px-2 font-semibold">
                          <button onClick={() => { setSortBy(key); setSortDir(sortDir === "asc" ? "desc" : "asc"); }} className="flex items-center gap-1">{label}<ChevronDown size={12} /></button>
                        </th>
                      ))}
                      <th className="text-left py-2 px-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredContracts.map((c) => (
                      <tr key={c.id} className="border-b hover:bg-slate-50">
                        <td className="px-2 py-2">{c.vendorName}</td>
                        <td className="px-2 py-2">{c.programName}</td>
                        <td className="px-2 py-2">{money(c.monthlyCost)}</td>
                        <td className="px-2 py-2">{c.licensedSeats}</td>
                        <td className="px-2 py-2">{c.activeSeats}</td>
                        <td className={`px-2 py-2 font-medium ${c.utilization >= 80 ? "text-emerald-600" : c.utilization >= 60 ? "text-amber-600" : "text-red-600"}`}>{pct(c.utilization)}</td>
                        <td className="px-2 py-2">{fmtDate(c.contractEndDate)}</td>
                        <td className="px-2 py-2">{c.renewalInDays ?? "N/A"}</td>
                        <td className="px-2 py-2">{c.autoRenew ? "Yes" : "No"}</td>
                        <td className="px-2 py-2">{c.renewalDecisionStatus}</td>
                        <td className="px-2 py-2">
                          <div className="flex gap-2">
                            <button onClick={() => setEditing(c)} className="p-1 border rounded"><Edit size={14} /></button>
                            <button onClick={() => setContracts((prev) => prev.filter((x) => x.id !== c.id))} className="p-1 border rounded"><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {view === "Renewal Calendar" && (
            <section className={cardClass + " space-y-4"}>
              <h3 className="font-semibold">Renewal Timeline</h3>
              <p className="text-slate-600">You have {metrics.renew90Count} renewals worth {money(metrics.renew90Value)} in the next 90 days.</p>
              <div className="grid md:grid-cols-3 gap-3">
                {contracts
                  .filter((c) => c.renewalInDays !== null)
                  .sort((a, b) => a.renewalInDays - b.renewalInDays)
                  .map((c) => (
                    <button key={c.id} className="text-left border rounded-lg p-3 hover:bg-slate-50" onClick={() => { setView("Contract Manager"); setEditing(c); }}>
                      <div className="font-medium">{c.vendorName}</div>
                      <div className="text-sm text-slate-600">{fmtDate(c.contractEndDate)} · {money(c.totalContractValue)}</div>
                      <span className={`inline-block mt-2 text-xs px-2 py-1 rounded ${c.autoRenew ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>{c.autoRenew ? "Auto-renew" : "Manual"}</span>
                    </button>
                  ))}
              </div>
            </section>
          )}

          {view === "Usage & Utilization Tracker" && (
            <section className="space-y-4">
              <div className="grid md:grid-cols-4 gap-4">
                <MetricCard title="Overall Utilization" value={pct(metrics.avgUtilization)} tone={metrics.avgUtilization >= 80 ? "green" : metrics.avgUtilization >= 60 ? "amber" : "red"} icon={<Users size={18} />} />
                <MetricCard title="Total Unused Seats" value={contracts.reduce((s, c) => s + c.unusedSeats, 0)} icon={<TrendingDown size={18} />} />
                <MetricCard title="Estimated Monthly Waste" value={money(contracts.reduce((s, c) => s + c.monthlyWaste, 0))} icon={<DollarSign size={18} />} />
                <MetricCard title="Estimated Annual Waste" value={money(metrics.estimatedAnnualWaste)} icon={<DollarSign size={18} />} danger />
              </div>
              <div className={cardClass}>
                <h3 className="font-semibold mb-3">Utilization Table</h3>
                <div className="overflow-auto">
                  <table className="min-w-[900px] w-full text-sm">
                    <thead><tr className="border-b"><th>Vendor</th><th>Program</th><th>Licensed</th><th>Active</th><th>Utilization</th><th>Unused</th><th>Monthly Waste</th><th>Annual Waste</th></tr></thead>
                    <tbody>
                      {[...contracts].sort((a, b) => a.utilization - b.utilization).map((c) => (
                        <tr key={c.id} className="border-b"><td>{c.vendorName}</td><td>{c.programName}</td><td>{c.licensedSeats}</td><td>{c.activeSeats}</td><td>{pct(c.utilization)}</td><td>{c.unusedSeats}</td><td>{money(c.monthlyWaste)}</td><td>{money(c.annualWaste)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {view === "Savings Report" && (
            <section className="space-y-4">
              <div className={cardClass}>
                <h3 className="text-lg font-semibold">Executive Summary</h3>
                <div className="grid md:grid-cols-3 gap-3 mt-3">
                  <div>Total Annual Spend: <b>{money(metrics.totalAnnualSpend)}</b></div>
                  <div>Identified Savings: <b className="text-emerald-600">{money(metrics.estimatedAnnualWaste)}</b></div>
                  <div>Savings %: <b>{pct((metrics.estimatedAnnualWaste / Math.max(1, metrics.totalAnnualSpend)) * 100)}</b></div>
                </div>
                <p className="text-sm text-slate-600 mt-2">A full Taskmait audit typically identifies 20-40% additional savings through negotiation and stack optimization.</p>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div className={cardClass}>Unused Seats: <b>{contracts.reduce((s, c) => s + c.unusedSeats, 0)}</b></div>
                <div className={cardClass}>Auto-renew Exposure: <b>{money(contracts.filter((c) => c.autoRenew).reduce((s, c) => s + c.totalContractValue, 0))}</b></div>
                <div className={cardClass}>Escalation Impact: <b>{money(contracts.reduce((s, c) => s + (c.totalContractValue * (c.annualEscalationPct || 0)) / 100, 0))}</b></div>
              </div>
              <div className={cardClass + " flex flex-wrap gap-3"}>
                <a href={AUDIT_URL} className="px-4 py-2 rounded-lg bg-sky-500 text-white">Schedule a Free Consultation</a>
                <button className="px-4 py-2 rounded-lg border" onClick={() => window.print()}><Printer size={14} className="inline mr-2" />Print Report</button>
                <button className="px-4 py-2 rounded-lg border" onClick={() => exportCSV(contracts.map((c) => ({ vendor: c.vendorName, program: c.programName, savings: c.annualWaste })), "savings.csv")}><Download size={14} className="inline mr-2" />Download Full Report</button>
              </div>
            </section>
          )}

          {view === "Settings" && (
            <section className={cardClass + " space-y-3"}>
              <h3 className="font-semibold">Data Management</h3>
              <div className="flex flex-wrap gap-2">
                <button className="px-3 py-2 border rounded-lg" onClick={() => {
                  const blob = new Blob([JSON.stringify({ contracts }, null, 2)], { type: "application/json" });
                  const a = document.createElement("a");
                  a.href = URL.createObjectURL(blob);
                  a.download = "taskmait-data.json";
                  a.click();
                }}><Download size={14} className="inline mr-2" />Export All Data</button>
                <label className="px-3 py-2 border rounded-lg cursor-pointer"><Upload size={14} className="inline mr-2" />Import Data<input type="file" className="hidden" accept="application/json" onChange={async (e) => {
                  const f = e.target.files?.[0]; if (!f) return;
                  const data = JSON.parse(await f.text());
                  setContracts((data.contracts || []).map(derive));
                }} /></label>
                <button className="px-3 py-2 bg-red-600 text-white rounded-lg" onClick={() => {
                  if (!window.confirm("Are you sure? This will delete all your contract data.")) return;
                  if (!window.confirm("This cannot be undone. Continue?")) return;
                  setContracts([]);
                }}><Trash2 size={14} className="inline mr-2" />Reset All Data</button>
              </div>
            </section>
          )}

          <footer className="text-center text-xs text-slate-500 pt-6 border-t">
            Powered by Taskmait — SaaS Cost Optimization for Growing Businesses · © 2025 Taskmait. All rights reserved.
          </footer>
        </main>
      </div>

      {editing && <ContractModal draft={editing} onClose={() => setEditing(null)} onSave={saveContract} />}
      {toast && <div className="fixed bottom-4 right-4 bg-[#1B2A4A] text-white px-4 py-2 rounded-lg shadow">{toast}</div>}
    </div>
  );
}

function MetricCard({ icon, title, value, sub, badge, tone, danger }) {
  const toneClass = tone === "green" ? "text-emerald-600" : tone === "amber" ? "text-amber-600" : tone === "red" ? "text-red-600" : danger ? "text-red-600" : "text-slate-900";
  return (
    <div className={cardClass}>
      <div className="flex items-center justify-between text-sm text-slate-600"><span>{title}</span>{icon}</div>
      <div className={`text-2xl font-bold mt-1 ${toneClass}`}>{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
      {badge && <span className="inline-block mt-2 px-2 py-1 rounded bg-amber-100 text-amber-700 text-xs">{badge}</span>}
    </div>
  );
}

function ContractModal({ draft, onClose, onSave }) {
  const [form, setForm] = useState(draft);
  const d = derive(form);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const valid = form.vendorName && form.programName && form.contractType && form.contractStartDate && form.contractEndDate && Number(form.totalContractValue) > 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-3">
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[95vh] overflow-auto p-5 space-y-4">
        <div className="flex justify-between items-center"><h3 className="text-lg font-semibold">{form.vendorName ? "Edit Contract" : "Add Contract"}</h3><button onClick={onClose}><X /></button></div>

        <Section title="Contract Basics">
          <Field label="Vendor Name" required><input className="input" value={form.vendorName} onChange={(e) => set("vendorName", e.target.value)} /></Field>
          <Field label="Program Name" required><input className="input" value={form.programName} onChange={(e) => set("programName", e.target.value)} /></Field>
          <Field label="Contract Type" required><select className="input" value={form.contractType} onChange={(e) => { const type = e.target.value; set("contractType", type); set("contractLengthMonths", CONTRACT_TYPE_LENGTHS[type]); }}>{Object.keys(CONTRACT_TYPE_LENGTHS).map((o) => <option key={o}>{o}</option>)}</select></Field>
          <Field label="Length (months)" required><input type="number" className="input" value={form.contractLengthMonths} onChange={(e) => set("contractLengthMonths", Number(e.target.value))} /></Field>
          <Field label="Start Date" required><input type="date" className="input" value={form.contractStartDate?.slice(0,10)} onChange={(e) => set("contractStartDate", e.target.value)} /></Field>
          <Field label="End Date" required><input type="date" className="input" value={form.contractEndDate?.slice(0,10)} onChange={(e) => set("contractEndDate", e.target.value)} /></Field>
          <Field label="Total Contract Value" required><input type="number" className="input" value={form.totalContractValue} onChange={(e) => set("totalContractValue", Number(e.target.value))} /></Field>
          <Field label="Payment Terms" required><select className="input" value={form.paymentTerms} onChange={(e) => set("paymentTerms", e.target.value)}>{PAYMENT_TERMS.map((o) => <option key={o}>{o}</option>)}</select></Field>
        </Section>

        <Section title="Seat & Licensing Details">
          <Field label="Licensed Seats" required><input type="number" className="input" value={form.licensedSeats} onChange={(e) => set("licensedSeats", Number(e.target.value))} /></Field>
          <Field label="Active Seats"><input type="number" className="input" value={form.activeSeats} onChange={(e) => set("activeSeats", Number(e.target.value))} /></Field>
          <Field label="Cost/Seat Monthly"><input type="number" className="input" value={d.costPerSeatMonthly.toFixed(2)} readOnly /></Field>
          <Field label="Cost/Seat Annual"><input type="number" className="input" value={d.costPerSeatAnnual.toFixed(2)} readOnly /></Field>
          <Field label="Department"><div className="flex flex-wrap gap-2">{TEAM_OPTIONS.map((t) => <button key={t} type="button" onClick={() => set("departmentTeams", form.departmentTeams?.includes(t) ? form.departmentTeams.filter((x) => x !== t) : [...(form.departmentTeams || []), t])} className={`px-2 py-1 text-xs rounded border ${form.departmentTeams?.includes(t) ? "bg-sky-100 border-sky-300" : ""}`}>{t}</button>)}</div></Field>
          <Field label="License Type"><select className="input" value={form.licenseType} onChange={(e) => set("licenseType", e.target.value)}>{LICENSE_TYPES.map((o) => <option key={o}>{o}</option>)}</select></Field>
        </Section>

        <Section title="Renewal & Terms">
          <Field label="Auto-Renewal"><input type="checkbox" checked={!!form.autoRenew} onChange={(e) => set("autoRenew", e.target.checked)} /></Field>
          <Field label="Cancellation Window Days"><input type="number" className="input" value={form.cancellationNoticeWindowDays} onChange={(e) => set("cancellationNoticeWindowDays", Number(e.target.value))} /></Field>
          <Field label="Cancellation Deadline"><input className={`input ${d.cancellationNoticeDeadline && daysUntil(d.cancellationNoticeDeadline) <= 30 ? "text-red-600 font-semibold" : ""}`} value={fmtDate(d.cancellationNoticeDeadline)} readOnly /></Field>
          <Field label="Annual Escalation %"><input type="number" className="input" value={form.annualEscalationPct} onChange={(e) => set("annualEscalationPct", Number(e.target.value))} /></Field>
          <Field label="Decision Status" required><select className="input" value={form.renewalDecisionStatus} onChange={(e) => set("renewalDecisionStatus", e.target.value)}>{STATUS_OPTIONS.map((o) => <option key={o}>{o}</option>)}</select></Field>
          <Field label="Notes"><textarea className="input" rows={3} value={form.notes || ""} onChange={(e) => set("notes", e.target.value)} /></Field>
        </Section>

        {d.utilization < 60 && <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm">This tool is underutilized. You could save approximately {money(d.annualWaste)} per year by reducing to active seats at renewal.</div>}

        <div className="flex gap-2 justify-end">
          <button className="px-3 py-2 rounded-lg border" onClick={onClose}>Cancel</button>
          <button disabled={!valid} className="px-3 py-2 rounded-lg bg-slate-200 disabled:opacity-50" onClick={() => valid && onSave(form, true)}>Save & Add Another</button>
          <button disabled={!valid} className="px-3 py-2 rounded-lg bg-[#1B2A4A] text-white disabled:opacity-50" onClick={() => valid && onSave(form, false)}>Save & Close</button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return <div className="border rounded-lg p-3"><h4 className="font-semibold mb-2">{title}</h4><div className="grid md:grid-cols-2 gap-3">{children}</div></div>;
}
function Field({ label, required, children }) {
  return <label className="text-sm flex flex-col gap-1"><span className="text-slate-700">{label} {required && <span className="text-red-500">*</span>}</span>{React.cloneElement(children, { className: `${children.props.className || ""} w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400` })}</label>;
}
