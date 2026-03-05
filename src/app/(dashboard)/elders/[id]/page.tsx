"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Clock, Heart, MessageSquare, Shield, Settings as SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const mockElder = {
  id: "1",
  preferredName: "Grandma Rose",
  fullName: "Rose Marie Johnson",
  timezone: "America/New_York",
  checkInTime: "09:00",
  frequency: "daily",
  isActive: true,
  lastCheckInAt: "2024-01-15T14:12:00Z",
  moodTrend: "stable",
  medicalNotes: "Type 2 diabetes, managed with diet. Mild arthritis in hands.",
  medications: "Metformin 500mg twice daily, Glucosamine supplement",
  emergencyContactName: "Dr. Sarah Chen",
  emergencyContactPhone: "+1 (555) 987-6543",
};

const mockCheckIns = [
  { id: "1", date: "2024-01-15", status: "completed", moodScore: 7, messages: 7 },
  { id: "2", date: "2024-01-14", status: "completed", moodScore: 8, messages: 6 },
  { id: "3", date: "2024-01-13", status: "completed", moodScore: 6, messages: 5 },
  { id: "4", date: "2024-01-12", status: "missed", moodScore: null, messages: 0 },
  { id: "5", date: "2024-01-11", status: "completed", moodScore: 7, messages: 6 },
];

export default function ElderDetailPage() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/elders">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                {mockElder.preferredName}
              </h1>
              <Badge variant={mockElder.isActive ? "success" : "secondary"}>
                {mockElder.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            <p className="text-gray-500">
              Last check-in: {new Date(mockElder.lastCheckInAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="history">Check-in History</TabsTrigger>
          <TabsTrigger value="medical">Medical Info</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <Heart className="h-5 w-5 text-teal-600" />
                <div>
                  <p className="text-xs text-gray-500">Mood Trend</p>
                  <p className="font-medium capitalize">{mockElder.moodTrend}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <Clock className="h-5 w-5 text-teal-600" />
                <div>
                  <p className="text-xs text-gray-500">Check-in Time</p>
                  <p className="font-medium">{mockElder.checkInTime} ET</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <MessageSquare className="h-5 w-5 text-teal-600" />
                <div>
                  <p className="text-xs text-gray-500">Frequency</p>
                  <p className="font-medium capitalize">{mockElder.frequency}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Mood Trend (Last 7 days)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2 h-32">
                {[7, 8, 6, 0, 7, 8, 7].map((score, i) => (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1">
                    <div
                      className={`w-full rounded-t ${score ? "bg-teal-400" : "bg-gray-200"}`}
                      style={{ height: `${score ? score * 10 : 5}%` }}
                    />
                    <span className="text-xs text-gray-400">
                      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i]}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {mockCheckIns.map((ci) => (
                  <Link
                    key={ci.id}
                    href={`/check-ins/${ci.id}`}
                    className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-sm font-medium text-gray-900">
                        {new Date(ci.date).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                      <Badge
                        variant={
                          ci.status === "completed"
                            ? "success"
                            : ci.status === "missed"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {ci.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-6 text-sm text-gray-500">
                      <span>{ci.moodScore ? `${ci.moodScore}/10` : "—"}</span>
                      <span>{ci.messages} messages</span>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Medical Tab */}
        <TabsContent value="medical" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-teal-600" />
                Medical Notes
              </CardTitle>
              <CardDescription>This information is encrypted at rest</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700">{mockElder.medicalNotes}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Medications</CardTitle>
              <CardDescription>Current prescriptions and supplements</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700">{mockElder.medications}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Emergency Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-gray-700">{mockElder.emergencyContactName}</p>
              <p className="text-gray-500 text-sm">{mockElder.emergencyContactPhone}</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Check-in Schedule</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Preferred time</Label>
                <Input type="time" defaultValue={mockElder.checkInTime} />
              </div>
              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select defaultValue={mockElder.frequency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Once daily</SelectItem>
                    <SelectItem value="twice_daily">Twice daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Timezone</Label>
                <Select defaultValue={mockElder.timezone}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="America/New_York">Eastern Time</SelectItem>
                    <SelectItem value="America/Chicago">Central Time</SelectItem>
                    <SelectItem value="America/Denver">Mountain Time</SelectItem>
                    <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button>Save Changes</Button>
            </CardContent>
          </Card>

          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-base text-red-700">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Pause check-ins</p>
                  <p className="text-sm text-gray-500">Temporarily stop all check-ins for this elder</p>
                </div>
                <Button variant="outline">Pause</Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Remove elder</p>
                  <p className="text-sm text-gray-500">Permanently remove this elder and all their data</p>
                </div>
                <Button variant="destructive">Remove</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
