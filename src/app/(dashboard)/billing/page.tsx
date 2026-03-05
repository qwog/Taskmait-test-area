"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/utils/cn";
import {
  CreditCard,
  Download,
  Users,
  PhoneCall,
  Crown,
  Check,
  X,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  Settings,
} from "lucide-react";

interface Invoice {
  id: string;
  date: string;
  amount: string;
  status: "paid" | "pending" | "failed";
  description: string;
}

const mockCurrentPlan = "basic" as const;

const mockUsage = {
  eldersUsed: 1,
  eldersMax: 2,
  checkInsThisMonth: 27,
};

const plans = [
  {
    id: "basic",
    name: "Basic",
    price: "$9.99",
    period: "/month",
    description: "Perfect for getting started with one or two elders.",
    features: [
      { text: "Up to 2 elders", included: true },
      { text: "Daily check-ins", included: true },
      { text: "SMS & email alerts", included: true },
      { text: "Basic mood tracking", included: true },
      { text: "Priority escalation", included: false },
      { text: "Custom check-in scripts", included: false },
      { text: "Family member seats (unlimited)", included: false },
      { text: "API access", included: false },
    ],
  },
  {
    id: "premium",
    name: "Premium",
    price: "$24.99",
    period: "/month",
    description: "For families managing care for multiple elders.",
    features: [
      { text: "Up to 10 elders", included: true },
      { text: "Daily check-ins", included: true },
      { text: "SMS & email alerts", included: true },
      { text: "Advanced mood tracking & trends", included: true },
      { text: "Priority escalation", included: true },
      { text: "Custom check-in scripts", included: true },
      { text: "Family member seats (unlimited)", included: true },
      { text: "API access", included: true },
    ],
  },
];

const mockInvoices: Invoice[] = [
  {
    id: "INV-2026-003",
    date: "2026-03-01",
    amount: "$9.99",
    status: "paid",
    description: "Basic Plan - March 2026",
  },
  {
    id: "INV-2026-002",
    date: "2026-02-01",
    amount: "$9.99",
    status: "paid",
    description: "Basic Plan - February 2026",
  },
  {
    id: "INV-2026-001",
    date: "2026-01-01",
    amount: "$9.99",
    status: "paid",
    description: "Basic Plan - January 2026",
  },
  {
    id: "INV-2025-012",
    date: "2025-12-01",
    amount: "$9.99",
    status: "paid",
    description: "Basic Plan - December 2025",
  },
];

export default function BillingPage() {
  const [currentPlan] = useState(mockCurrentPlan);

  const handleManageSubscription = () => {
    alert(
      "This would open the subscription management portal (e.g., Stripe Customer Portal)."
    );
  };

  const handleUpdatePayment = () => {
    alert(
      "This would open the payment method update form (e.g., Stripe Checkout for updating card)."
    );
  };

  const handlePlanAction = (planId: string) => {
    if (planId === currentPlan) return;
    if (planId === "premium") {
      alert("This would initiate an upgrade to Premium. Redirecting to Stripe Checkout...");
    } else {
      alert("This would initiate a downgrade to Basic. Your plan will change at the next billing cycle.");
    }
  };

  const handleDownloadInvoice = (invoiceId: string) => {
    alert(`Downloading invoice ${invoiceId}...`);
  };

  const usagePercentage =
    (mockUsage.eldersUsed / mockUsage.eldersMax) * 100;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing & Plans</h1>
        <p className="text-gray-500 mt-1">
          Manage your subscription, view usage, and download invoices.
        </p>
      </div>

      {/* Current Plan & Usage */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="p-6 border-2 border-teal-600 bg-teal-50/30">
          <div className="flex items-center justify-between mb-4">
            <Crown className="h-8 w-8 text-teal-600" />
            <Badge className="bg-teal-100 text-teal-700 border-teal-200">
              Current Plan
            </Badge>
          </div>
          <h3 className="text-xl font-bold text-gray-900 capitalize">
            {currentPlan}
          </h3>
          <p className="text-3xl font-bold text-teal-600 mt-1">
            {plans.find((p) => p.id === currentPlan)?.price}
            <span className="text-sm font-normal text-gray-500">/month</span>
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Next billing date: April 1, 2026
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-teal-600" />
            <h3 className="font-semibold text-gray-900">Elders</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {mockUsage.eldersUsed}
            <span className="text-lg font-normal text-gray-400">
              {" "}
              / {mockUsage.eldersMax}
            </span>
          </p>
          <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal-600 rounded-full transition-all"
              style={{ width: `${usagePercentage}%` }}
            />
          </div>
          <p className="text-sm text-gray-500 mt-2">
            {mockUsage.eldersMax - mockUsage.eldersUsed} slot
            {mockUsage.eldersMax - mockUsage.eldersUsed !== 1 ? "s" : ""}{" "}
            remaining
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <PhoneCall className="h-5 w-5 text-teal-600" />
            <h3 className="font-semibold text-gray-900">Check-ins</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {mockUsage.checkInsThisMonth}
          </p>
          <p className="text-sm text-gray-500 mt-2">This month (March 2026)</p>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3 flex-wrap">
        <Button
          onClick={handleManageSubscription}
          variant="outline"
          className="gap-2 border-teal-200 text-teal-700 hover:bg-teal-50"
        >
          <Settings className="h-4 w-4" />
          Manage Subscription
        </Button>
        <Button
          onClick={handleUpdatePayment}
          variant="outline"
          className="gap-2 border-teal-200 text-teal-700 hover:bg-teal-50"
        >
          <CreditCard className="h-4 w-4" />
          Update Payment Method
        </Button>
      </div>

      {/* Plan Comparison */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Compare Plans
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          {plans.map((plan) => {
            const isCurrent = plan.id === currentPlan;
            const isUpgrade = plan.id === "premium" && currentPlan === "basic";
            const isDowngrade = plan.id === "basic" && currentPlan === "premium";

            return (
              <Card
                key={plan.id}
                className={cn(
                  "p-6",
                  isCurrent && "border-2 border-teal-600 ring-1 ring-teal-600/20"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-bold text-gray-900">
                    {plan.name}
                  </h3>
                  {isCurrent && (
                    <Badge className="bg-teal-100 text-teal-700 border-teal-200">
                      Current
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-500 mb-4">
                  {plan.description}
                </p>
                <p className="text-3xl font-bold text-gray-900 mb-6">
                  {plan.price}
                  <span className="text-sm font-normal text-gray-500">
                    {plan.period}
                  </span>
                </p>

                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      {feature.included ? (
                        <Check className="h-4 w-4 text-teal-600 flex-shrink-0" />
                      ) : (
                        <X className="h-4 w-4 text-gray-300 flex-shrink-0" />
                      )}
                      <span
                        className={
                          feature.included ? "text-gray-700" : "text-gray-400"
                        }
                      >
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <Button disabled className="w-full">
                    Current Plan
                  </Button>
                ) : isUpgrade ? (
                  <Button
                    onClick={() => handlePlanAction(plan.id)}
                    className="w-full bg-teal-600 hover:bg-teal-700 text-white gap-2"
                  >
                    <ArrowUpRight className="h-4 w-4" />
                    Upgrade to {plan.name}
                  </Button>
                ) : (
                  <Button
                    onClick={() => handlePlanAction(plan.id)}
                    variant="outline"
                    className="w-full gap-2"
                  >
                    <ArrowDownRight className="h-4 w-4" />
                    Downgrade to {plan.name}
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      {/* Billing History */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Receipt className="h-5 w-5 text-teal-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            Billing History
          </h2>
        </div>
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                    Invoice
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                    Date
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                    Description
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                    Amount
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                    Status
                  </th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {mockInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {invoice.id}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {invoice.date}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {invoice.description}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {invoice.amount}
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        className={cn(
                          invoice.status === "paid" &&
                            "bg-green-100 text-green-700 border-green-200",
                          invoice.status === "pending" &&
                            "bg-yellow-100 text-yellow-700 border-yellow-200",
                          invoice.status === "failed" &&
                            "bg-red-100 text-red-700 border-red-200"
                        )}
                      >
                        {invoice.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadInvoice(invoice.id)}
                        className="text-teal-600 hover:text-teal-700 hover:bg-teal-50 gap-1"
                      >
                        <Download className="h-4 w-4" />
                        Download
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
