"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/utils/cn";
import {
  User,
  Users,
  Bell,
  Mail,
  Phone,
  Trash2,
  UserPlus,
  Save,
  Shield,
  MessageSquare,
} from "lucide-react";

interface FamilyMember {
  id: string;
  name: string;
  email: string;
  role: "admin" | "member";
  joinedAt: string;
}

const mockUser = {
  name: "Sarah Johnson",
  email: "sarah.johnson@example.com",
  phone: "+1 (555) 234-5678",
};

const mockFamilyMembers: FamilyMember[] = [
  {
    id: "1",
    name: "Michael Johnson",
    email: "michael.j@example.com",
    role: "admin",
    joinedAt: "2025-08-15",
  },
  {
    id: "2",
    name: "Emily Chen",
    email: "emily.chen@example.com",
    role: "member",
    joinedAt: "2025-11-02",
  },
];

export default function SettingsPage() {
  const [profile, setProfile] = useState(mockUser);
  const [familyMembers, setFamilyMembers] =
    useState<FamilyMember[]>(mockFamilyMembers);
  const [inviteEmail, setInviteEmail] = useState("");
  const [notifications, setNotifications] = useState({
    escalationSms: true,
    escalationEmail: true,
    dailySummary: false,
  });
  const [saving, setSaving] = useState(false);

  const handleSaveProfile = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    setSaving(false);
    alert("Profile saved successfully!");
  };

  const handleInvite = () => {
    if (!inviteEmail.trim()) return;
    const newMember: FamilyMember = {
      id: String(Date.now()),
      name: inviteEmail.split("@")[0],
      email: inviteEmail,
      role: "member",
      joinedAt: new Date().toISOString().split("T")[0],
    };
    setFamilyMembers((prev) => [...prev, newMember]);
    setInviteEmail("");
    alert(`Invitation sent to ${inviteEmail}`);
  };

  const handleRemoveMember = (id: string) => {
    if (confirm("Are you sure you want to remove this family member?")) {
      setFamilyMembers((prev) => prev.filter((m) => m.id !== id));
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">
          Manage your account, family, and notification preferences.
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="family" className="gap-2">
            <Users className="h-4 w-4" />
            Family Members
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card className="p-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Profile Information
              </h2>
              <p className="text-sm text-gray-500">
                Update your personal details.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={profile.name}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, name: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    className="pl-10"
                    value={profile.email}
                    onChange={(e) =>
                      setProfile((p) => ({ ...p, email: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="phone"
                    type="tel"
                    className="pl-10"
                    value={profile.phone}
                    onChange={(e) =>
                      setProfile((p) => ({ ...p, phone: e.target.value }))
                    }
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleSaveProfile}
                disabled={saving}
                className="bg-teal-600 hover:bg-teal-700 text-white gap-2"
              >
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* Family Members Tab */}
        <TabsContent value="family">
          <Card className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Family Members
                </h2>
                <p className="text-sm text-gray-500">
                  Manage who has access to your CheckMate account.
                </p>
              </div>
            </div>

            {/* Invite */}
            <div className="flex gap-3">
              <Input
                placeholder="Enter email to invite..."
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={handleInvite}
                className="bg-teal-600 hover:bg-teal-700 text-white gap-2"
              >
                <UserPlus className="h-4 w-4" />
                Invite
              </Button>
            </div>

            {/* Member List */}
            <div className="divide-y divide-gray-100">
              {familyMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between py-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-teal-100 flex items-center justify-center">
                      <User className="h-5 w-5 text-teal-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{member.name}</p>
                      <p className="text-sm text-gray-500">{member.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge
                      className={cn(
                        member.role === "admin"
                          ? "bg-teal-100 text-teal-700 border-teal-200"
                          : "bg-gray-100 text-gray-700 border-gray-200"
                      )}
                    >
                      <Shield className="h-3 w-3 mr-1" />
                      {member.role}
                    </Badge>
                    <span className="text-xs text-gray-400">
                      Joined {member.joinedAt}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveMember(member.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card className="p-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Notification Preferences
              </h2>
              <p className="text-sm text-gray-500">
                Choose how and when you want to be notified.
              </p>
            </div>

            <div className="space-y-4">
              {/* Escalation SMS */}
              <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-teal-50 flex items-center justify-center">
                    <MessageSquare className="h-5 w-5 text-teal-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      Escalation Alerts (SMS)
                    </p>
                    <p className="text-sm text-gray-500">
                      Receive SMS when an elder misses a check-in or needs
                      attention.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() =>
                    setNotifications((n) => ({
                      ...n,
                      escalationSms: !n.escalationSms,
                    }))
                  }
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                    notifications.escalationSms
                      ? "bg-teal-600"
                      : "bg-gray-300"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                      notifications.escalationSms
                        ? "translate-x-6"
                        : "translate-x-1"
                    )}
                  />
                </button>
              </div>

              {/* Escalation Email */}
              <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-teal-50 flex items-center justify-center">
                    <Mail className="h-5 w-5 text-teal-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      Escalation Alerts (Email)
                    </p>
                    <p className="text-sm text-gray-500">
                      Receive email when an elder misses a check-in or needs
                      attention.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() =>
                    setNotifications((n) => ({
                      ...n,
                      escalationEmail: !n.escalationEmail,
                    }))
                  }
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                    notifications.escalationEmail
                      ? "bg-teal-600"
                      : "bg-gray-300"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                      notifications.escalationEmail
                        ? "translate-x-6"
                        : "translate-x-1"
                    )}
                  />
                </button>
              </div>

              {/* Daily Summary */}
              <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-teal-50 flex items-center justify-center">
                    <Bell className="h-5 w-5 text-teal-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Daily Summary</p>
                    <p className="text-sm text-gray-500">
                      Receive a daily digest of all check-in activity.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() =>
                    setNotifications((n) => ({
                      ...n,
                      dailySummary: !n.dailySummary,
                    }))
                  }
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                    notifications.dailySummary ? "bg-teal-600" : "bg-gray-300"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                      notifications.dailySummary
                        ? "translate-x-6"
                        : "translate-x-1"
                    )}
                  />
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() => alert("Notification preferences saved!")}
                className="bg-teal-600 hover:bg-teal-700 text-white gap-2"
              >
                <Save className="h-4 w-4" />
                Save Preferences
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
