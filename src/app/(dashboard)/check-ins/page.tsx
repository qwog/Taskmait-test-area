"use client";

import { useState } from "react";
import { Eye, Clock, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDateTime, getMoodEmoji, getStatusColor } from "@/utils/format";
import { cn } from "@/utils/cn";
import Link from "next/link";

type SessionStatus = "completed" | "in_progress" | "missed" | "escalated";

interface CheckInSession {
  id: string;
  elderName: string;
  elderId: string;
  scheduledTime: Date;
  status: SessionStatus;
  moodScore: number | null;
  messageCount: number;
}

const sessions: CheckInSession[] = [
  {
    id: "ci-1",
    elderName: "Margaret Johnson",
    elderId: "elder-1",
    scheduledTime: new Date(Date.now() - 1000 * 60 * 25),
    status: "completed",
    moodScore: 8,
    messageCount: 6,
  },
  {
    id: "ci-2",
    elderName: "Robert Williams",
    elderId: "elder-2",
    scheduledTime: new Date(Date.now() - 1000 * 60 * 50),
    status: "completed",
    moodScore: 6,
    messageCount: 5,
  },
  {
    id: "ci-3",
    elderName: "Dorothy Chen",
    elderId: "elder-3",
    scheduledTime: new Date(Date.now() - 1000 * 60 * 90),
    status: "escalated",
    moodScore: 3,
    messageCount: 4,
  },
  {
    id: "ci-4",
    elderName: "Harold Davis",
    elderId: "elder-4",
    scheduledTime: new Date(Date.now() - 1000 * 60 * 120),
    status: "in_progress",
    moodScore: null,
    messageCount: 2,
  },
  {
    id: "ci-5",
    elderName: "Betty Thompson",
    elderId: "elder-5",
    scheduledTime: new Date(Date.now() - 1000 * 60 * 180),
    status: "missed",
    moodScore: null,
    messageCount: 0,
  },
];

const statusTabs = ["all", "completed", "in_progress", "missed", "escalated"] as const;

export default function CheckInsPage() {
  const [activeTab, setActiveTab] = useState<string>("all");

  const filteredSessions =
    activeTab === "all"
      ? sessions
      : sessions.filter((s) => s.status === activeTab);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Check-ins</h1>
        <p className="mt-1 text-gray-500">
          View and manage all scheduled check-in sessions.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          {statusTabs.map((tab) => (
            <TabsTrigger key={tab} value={tab} className="capitalize">
              {tab.replace("_", " ")}
              <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                {tab === "all"
                  ? sessions.length
                  : sessions.filter((s) => s.status === tab).length}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Table Header */}
              <div className="hidden md:grid md:grid-cols-6 gap-4 px-3 pb-3 text-xs font-medium uppercase text-gray-500 border-b">
                <span className="col-span-1">Elder</span>
                <span className="col-span-1">Scheduled Time</span>
                <span className="col-span-1">Status</span>
                <span className="col-span-1">Mood Score</span>
                <span className="col-span-1">Messages</span>
                <span className="col-span-1 text-right">Actions</span>
              </div>

              {/* Table Rows */}
              <div className="divide-y">
                {filteredSessions.map((session) => (
                  <div
                    key={session.id}
                    className="grid grid-cols-1 md:grid-cols-6 gap-2 md:gap-4 items-center px-3 py-3 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <div className="col-span-1">
                      <p className="text-sm font-medium text-gray-900">
                        {session.elderName}
                      </p>
                    </div>
                    <div className="col-span-1 flex items-center gap-1.5 text-sm text-gray-600">
                      <Clock className="h-3.5 w-3.5" />
                      {formatDateTime(session.scheduledTime)}
                    </div>
                    <div className="col-span-1">
                      <Badge className={cn(getStatusColor(session.status))}>
                        {session.status.replace("_", " ")}
                      </Badge>
                    </div>
                    <div className="col-span-1 text-sm text-gray-700">
                      {session.moodScore !== null ? (
                        <span className="flex items-center gap-1.5">
                          {getMoodEmoji(session.moodScore)} {session.moodScore}/10
                        </span>
                      ) : (
                        <span className="text-gray-400">--</span>
                      )}
                    </div>
                    <div className="col-span-1 flex items-center gap-1.5 text-sm text-gray-600">
                      <MessageSquare className="h-3.5 w-3.5" />
                      {session.messageCount}
                    </div>
                    <div className="col-span-1 text-right">
                      <Link href={`/check-ins/${session.id}`}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-teal-600 border-teal-300 hover:bg-teal-50"
                        >
                          <Eye className="mr-1 h-3.5 w-3.5" />
                          View
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>

              {filteredSessions.length === 0 && (
                <div className="py-12 text-center text-gray-500">
                  No check-in sessions found for this filter.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
