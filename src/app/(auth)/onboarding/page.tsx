"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, ArrowRight, User, Phone, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";

const steps = [
  { title: "About your elder", icon: User },
  { title: "Contact details", icon: Phone },
  { title: "Check-in schedule", icon: Clock },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  const [elderData, setElderData] = useState({
    preferredName: "",
    fullName: "",
    phone: "",
    timezone: "America/New_York",
    checkInTime: "09:00",
    frequency: "daily",
  });

  function updateField(field: string, value: string) {
    setElderData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleComplete() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/elders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(elderData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add elder");
      }

      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-teal-600">
            <Heart className="h-6 w-6 text-white" />
          </div>
          <CardTitle className="mt-4 text-2xl">Set up your first check-in</CardTitle>
          <CardDescription>
            Let&apos;s get your loved one connected in just a few steps
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Step indicators */}
          <div className="mb-8 flex items-center justify-center gap-2">
            {steps.map((s, i) => (
              <div
                key={s.title}
                className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
                  i === step
                    ? "bg-teal-100 text-teal-700"
                    : i < step
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                <s.icon className="h-3 w-3" />
                {s.title}
              </div>
            ))}
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Step 1: About elder */}
          {step === 0 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="preferredName">
                  What do they like to be called?
                </Label>
                <Input
                  id="preferredName"
                  placeholder="e.g., Grandma Rose, Mom, Dad"
                  value={elderData.preferredName}
                  onChange={(e) => updateField("preferredName", e.target.value)}
                />
                <p className="text-xs text-gray-500">
                  We&apos;ll use this name in all conversations
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fullName">Full legal name</Label>
                <Input
                  id="fullName"
                  placeholder="Rose Marie Johnson"
                  value={elderData.fullName}
                  onChange={(e) => updateField("fullName", e.target.value)}
                />
                <p className="text-xs text-gray-500">
                  Encrypted and stored securely — used only for emergencies
                </p>
              </div>
              <Button
                className="w-full gap-2"
                onClick={() => setStep(1)}
                disabled={!elderData.preferredName || !elderData.fullName}
              >
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Step 2: Contact */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Their phone number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={elderData.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                />
                <p className="text-xs text-gray-500">
                  Must be able to receive SMS text messages
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Their timezone</Label>
                <Select
                  value={elderData.timezone}
                  onValueChange={(v) => updateField("timezone", v)}
                >
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
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(0)} className="flex-1">
                  Back
                </Button>
                <Button
                  className="flex-1 gap-2"
                  onClick={() => setStep(2)}
                  disabled={!elderData.phone}
                >
                  Continue <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Schedule */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="checkInTime">Preferred check-in time</Label>
                <Input
                  id="checkInTime"
                  type="time"
                  value={elderData.checkInTime}
                  onChange={(e) => updateField("checkInTime", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Check-in frequency</Label>
                <Select
                  value={elderData.frequency}
                  onValueChange={(v) => updateField("frequency", v)}
                >
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
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  Back
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleComplete}
                  disabled={loading}
                >
                  {loading ? "Setting up..." : "Complete setup"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
