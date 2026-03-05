"use client";

import { useState } from "react";
import { Plus, Search, Phone, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatRelative, getMoodEmoji } from "@/utils/format";
import { cn } from "@/utils/cn";
import Link from "next/link";

const elders = [
  {
    id: "elder-1",
    preferredName: "Margaret",
    fullName: "Margaret Johnson",
    phone: "+1 (555) 123-4567",
    status: "active",
    lastCheckIn: new Date(Date.now() - 1000 * 60 * 25),
    moodTrend: 8,
    caregiverName: "Sarah Johnson",
    timezone: "America/New_York",
  },
  {
    id: "elder-2",
    preferredName: "Robert",
    fullName: "Robert Williams",
    phone: "+1 (555) 234-5678",
    status: "active",
    lastCheckIn: new Date(Date.now() - 1000 * 60 * 50),
    moodTrend: 6,
    caregiverName: "Michael Williams",
    timezone: "America/Chicago",
  },
  {
    id: "elder-3",
    preferredName: "Dorothy",
    fullName: "Dorothy Chen",
    phone: "+1 (555) 345-6789",
    status: "inactive",
    lastCheckIn: new Date(Date.now() - 1000 * 60 * 60 * 48),
    moodTrend: 3,
    caregiverName: "Lisa Chen",
    timezone: "America/Los_Angeles",
  },
];

export default function EldersPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredElders = elders.filter(
    (elder) =>
      elder.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      elder.preferredName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Elders</h1>
          <p className="mt-1 text-gray-500">
            Manage the elders enrolled in CheckMate check-ins.
          </p>
        </div>
        <Link href="/elders/new">
          <Button className="bg-teal-600 hover:bg-teal-700">
            <Plus className="mr-2 h-4 w-4" />
            Add Elder
          </Button>
        </Link>
      </div>

      {/* Search / Filter Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search elders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Elder Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredElders.map((elder) => (
          <Link key={elder.id} href={`/elders/${elder.id}`}>
            <Card className="transition-all hover:shadow-md hover:border-teal-200 cursor-pointer">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-2xl">
                      {getMoodEmoji(elder.moodTrend)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{elder.preferredName}</h3>
                      <p className="text-sm text-gray-500">{elder.fullName}</p>
                    </div>
                  </div>
                  <Badge
                    className={cn(
                      elder.status === "active"
                        ? "bg-green-100 text-green-800 border-green-200"
                        : "bg-gray-100 text-gray-600 border-gray-200"
                    )}
                  >
                    {elder.status}
                  </Badge>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="h-3.5 w-3.5" />
                    <span>{elder.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Last check-in: {formatRelative(elder.lastCheckIn)}</span>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t pt-3">
                  <span className="text-xs text-gray-500">
                    Caregiver: {elder.caregiverName}
                  </span>
                  <span className="text-xs text-gray-400">{elder.timezone}</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {filteredElders.length === 0 && (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-gray-500">No elders found matching your search.</p>
        </div>
      )}
    </div>
  );
}
