"use client";

import { Users, MessageSquare, AlertTriangle, Heart, Clock, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/stat-card";
import { formatRelative, getMoodEmoji, getSeverityColor, getStatusColor } from "@/utils/format";
import { cn } from "@/utils/cn";
import Link from "next/link";

const stats = [
  {
    title: "Active Elders",
    value: "12",
    description: "2 added this week",
    icon: Users,
    trend: "up" as const,
    trendValue: "+2",
  },
  {
    title: "Today's Check-ins",
    value: "8",
    description: "4 remaining today",
    icon: MessageSquare,
    trend: "up" as const,
    trendValue: "+3",
  },
  {
    title: "Open Escalations",
    value: "3",
    description: "1 high severity",
    icon: AlertTriangle,
    trend: "down" as const,
    trendValue: "-1",
  },
  {
    title: "Avg Mood Score",
    value: "7.4",
    description: "Across all elders",
    icon: Heart,
    trend: "up" as const,
    trendValue: "+0.3",
  },
];

const recentCheckIns = [
  {
    id: "ci-1",
    elderName: "Margaret Johnson",
    time: new Date(Date.now() - 1000 * 60 * 25),
    status: "completed",
    mood: 8,
  },
  {
    id: "ci-2",
    elderName: "Robert Williams",
    time: new Date(Date.now() - 1000 * 60 * 50),
    status: "completed",
    mood: 6,
  },
  {
    id: "ci-3",
    elderName: "Dorothy Chen",
    time: new Date(Date.now() - 1000 * 60 * 90),
    status: "escalated",
    mood: 3,
  },
  {
    id: "ci-4",
    elderName: "Harold Davis",
    time: new Date(Date.now() - 1000 * 60 * 120),
    status: "in_progress",
    mood: 7,
  },
];

const recentEscalations = [
  {
    id: "esc-1",
    elderName: "Dorothy Chen",
    type: "Mood Alert",
    severity: "high",
    description: "Reported feeling very lonely and not eating well for two days.",
    createdAt: new Date(Date.now() - 1000 * 60 * 85),
    status: "open",
  },
  {
    id: "esc-2",
    elderName: "Robert Williams",
    type: "Missed Medication",
    severity: "medium",
    description: "Mentioned forgetting to take morning medication again.",
    createdAt: new Date(Date.now() - 1000 * 60 * 200),
    status: "acknowledged",
  },
  {
    id: "esc-3",
    elderName: "Margaret Johnson",
    type: "Fall Risk",
    severity: "high",
    description: "Mentioned feeling dizzy when standing up this morning.",
    createdAt: new Date(Date.now() - 1000 * 60 * 310),
    status: "open",
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Dashboard</h1>
        <p className="mt-1 text-gray-500">
          Welcome back. Here&apos;s an overview of today&apos;s activity.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <StatCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            description={stat.description}
            icon={stat.icon}
            trend={stat.trend}
            trendValue={stat.trendValue}
          />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Check-ins */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Recent Check-ins</CardTitle>
              <CardDescription>Latest check-in sessions today</CardDescription>
            </div>
            <Link href="/check-ins">
              <Button variant="ghost" size="sm" className="text-teal-600 hover:text-teal-700">
                View all <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentCheckIns.map((checkIn) => (
                <Link
                  key={checkIn.id}
                  href={`/check-ins/${checkIn.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-50 text-lg">
                      {getMoodEmoji(checkIn.mood)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{checkIn.elderName}</p>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        {formatRelative(checkIn.time)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500">Mood: {checkIn.mood}/10</span>
                    <Badge className={cn(getStatusColor(checkIn.status))}>
                      {checkIn.status.replace("_", " ")}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Escalations */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Recent Escalations</CardTitle>
              <CardDescription>Issues requiring attention</CardDescription>
            </div>
            <Link href="/escalations">
              <Button variant="ghost" size="sm" className="text-teal-600 hover:text-teal-700">
                View all <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentEscalations.map((escalation) => (
                <div
                  key={escalation.id}
                  className={cn(
                    "rounded-lg border-l-4 border p-3",
                    escalation.severity === "high"
                      ? "border-l-red-500"
                      : escalation.severity === "medium"
                      ? "border-l-yellow-500"
                      : "border-l-blue-500"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900">
                          {escalation.elderName}
                        </p>
                        <Badge className={cn(getSeverityColor(escalation.severity))}>
                          {escalation.severity}
                        </Badge>
                        <Badge variant="outline">{escalation.type}</Badge>
                      </div>
                      <p className="text-xs text-gray-600 line-clamp-2">
                        {escalation.description}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatRelative(escalation.createdAt)}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {escalation.status === "open" && (
                        <Button size="sm" variant="outline" className="text-xs h-7">
                          Acknowledge
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7 text-teal-600 border-teal-300 hover:bg-teal-50"
                      >
                        Resolve
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
