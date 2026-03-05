"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle, Clock, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatRelative, getSeverityColor } from "@/utils/format";
import { cn } from "@/utils/cn";

interface Escalation {
  id: string;
  elderName: string;
  elderId: string;
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  status: "open" | "acknowledged" | "resolved";
  createdAt: Date;
  resolvedAt?: Date;
  notes?: string;
}

const escalationsData: Escalation[] = [
  {
    id: "esc-1",
    elderName: "Dorothy Chen",
    elderId: "elder-3",
    type: "Mood Alert",
    severity: "high",
    description:
      "Reported feeling very lonely and not eating well for two days. Expressed sadness about not seeing family recently.",
    status: "open",
    createdAt: new Date(Date.now() - 1000 * 60 * 85),
  },
  {
    id: "esc-2",
    elderName: "Robert Williams",
    elderId: "elder-2",
    type: "Missed Medication",
    severity: "medium",
    description:
      "Mentioned forgetting to take morning medication again. This is the third time this week.",
    status: "acknowledged",
    createdAt: new Date(Date.now() - 1000 * 60 * 200),
  },
  {
    id: "esc-3",
    elderName: "Margaret Johnson",
    elderId: "elder-1",
    type: "Fall Risk",
    severity: "high",
    description:
      "Mentioned feeling dizzy when standing up this morning. Has a history of falls.",
    status: "open",
    createdAt: new Date(Date.now() - 1000 * 60 * 310),
  },
  {
    id: "esc-4",
    elderName: "Harold Davis",
    elderId: "elder-4",
    type: "Missed Check-in",
    severity: "low",
    description:
      "Did not respond to scheduled check-in. First missed session this month.",
    status: "resolved",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
    resolvedAt: new Date(Date.now() - 1000 * 60 * 60 * 20),
    notes: "Caregiver confirmed elder was at a doctor appointment.",
  },
  {
    id: "esc-5",
    elderName: "Dorothy Chen",
    elderId: "elder-3",
    type: "Pain Report",
    severity: "critical",
    description:
      "Mentioned severe chest pain during check-in. Immediate attention required.",
    status: "open",
    createdAt: new Date(Date.now() - 1000 * 60 * 30),
  },
];

const statusTabs = ["open", "acknowledged", "resolved"] as const;

const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };

export default function EscalationsPage() {
  const [activeTab, setActiveTab] = useState<string>("open");
  const [resolveDialogId, setResolveDialogId] = useState<string | null>(null);
  const [resolveNotes, setResolveNotes] = useState("");
  const [escalations, setEscalations] = useState(escalationsData);

  const filteredEscalations = escalations
    .filter((e) => e.status === activeTab)
    .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  const handleAcknowledge = (id: string) => {
    setEscalations((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status: "acknowledged" as const } : e))
    );
  };

  const handleResolve = (id: string) => {
    setEscalations((prev) =>
      prev.map((e) =>
        e.id === id
          ? {
              ...e,
              status: "resolved" as const,
              resolvedAt: new Date(),
              notes: resolveNotes || undefined,
            }
          : e
      )
    );
    setResolveDialogId(null);
    setResolveNotes("");
  };

  const getSeverityBorderColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "border-l-red-600";
      case "high":
        return "border-l-red-400";
      case "medium":
        return "border-l-yellow-500";
      case "low":
        return "border-l-blue-400";
      default:
        return "border-l-gray-300";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "acknowledged":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "resolved":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Escalations</h1>
        <p className="mt-1 text-gray-500">
          Review and act on flagged concerns from check-in sessions.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          {statusTabs.map((tab) => (
            <TabsTrigger key={tab} value={tab} className="capitalize">
              <span className="flex items-center gap-1.5">
                {getStatusIcon(tab)}
                {tab}
              </span>
              <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                {escalations.filter((e) => e.status === tab).length}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <div className="space-y-3">
            {filteredEscalations.map((escalation) => (
              <Card
                key={escalation.id}
                className={cn("border-l-4", getSeverityBorderColor(escalation.severity))}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-gray-900">
                          {escalation.elderName}
                        </h3>
                        <Badge variant="outline">{escalation.type}</Badge>
                        <Badge className={cn(getSeverityColor(escalation.severity))}>
                          {escalation.severity}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{escalation.description}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span>Created {formatRelative(escalation.createdAt)}</span>
                        {escalation.resolvedAt && (
                          <span>Resolved {formatRelative(escalation.resolvedAt)}</span>
                        )}
                      </div>
                      {escalation.notes && (
                        <div className="mt-2 rounded-md bg-gray-50 p-2 text-xs text-gray-600">
                          <span className="font-medium">Notes:</span> {escalation.notes}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-shrink-0 gap-2">
                      {escalation.status === "open" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAcknowledge(escalation.id)}
                        >
                          Acknowledge
                        </Button>
                      )}
                      {escalation.status !== "resolved" && (
                        <Button
                          size="sm"
                          className="bg-teal-600 hover:bg-teal-700 text-white"
                          onClick={() => setResolveDialogId(escalation.id)}
                        >
                          Resolve
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Inline Resolve Dialog */}
                  {resolveDialogId === escalation.id && (
                    <div className="mt-4 rounded-lg border bg-gray-50 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium text-gray-900">
                          Resolve Escalation
                        </h4>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setResolveDialogId(null)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <Input
                        placeholder="Add resolution notes (optional)..."
                        value={resolveNotes}
                        onChange={(e) => setResolveNotes(e.target.value)}
                        className="mb-3"
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setResolveDialogId(null)}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          className="bg-teal-600 hover:bg-teal-700 text-white"
                          onClick={() => handleResolve(escalation.id)}
                        >
                          Confirm Resolve
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {filteredEscalations.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  No {activeTab} escalations found.
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
