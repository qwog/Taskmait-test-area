"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { cn } from "@/utils/cn";
import {
  ArrowLeft,
  User,
  Phone,
  Clock,
  Globe,
  Stethoscope,
  Pill,
  AlertCircle,
  Save,
  Loader2,
} from "lucide-react";

interface FormData {
  preferredName: string;
  fullName: string;
  phone: string;
  timezone: string;
  checkInTime: string;
  frequency: string;
  medicalNotes: string;
  medications: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
}

interface FormErrors {
  [key: string]: string;
}

const timezones = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
];

const frequencies = [
  { value: "daily", label: "Daily" },
  { value: "twice_daily", label: "Twice Daily" },
  { value: "every_other_day", label: "Every Other Day" },
  { value: "weekly", label: "Weekly" },
];

export default function NewElderPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [form, setForm] = useState<FormData>({
    preferredName: "",
    fullName: "",
    phone: "",
    timezone: "",
    checkInTime: "09:00",
    frequency: "daily",
    medicalNotes: "",
    medications: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
  });

  const updateField = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!form.preferredName.trim()) {
      newErrors.preferredName = "Preferred name is required.";
    }
    if (!form.fullName.trim()) {
      newErrors.fullName = "Full name is required.";
    }
    if (!form.phone.trim()) {
      newErrors.phone = "Phone number is required.";
    } else if (!/^\+?[\d\s()-]{7,}$/.test(form.phone.trim())) {
      newErrors.phone = "Please enter a valid phone number.";
    }
    if (!form.timezone) {
      newErrors.timezone = "Timezone is required.";
    }
    if (!form.checkInTime) {
      newErrors.checkInTime = "Check-in time is required.";
    }
    if (!form.frequency) {
      newErrors.frequency = "Frequency is required.";
    }
    if (
      form.emergencyContactPhone.trim() &&
      !/^\+?[\d\s()-]{7,}$/.test(form.emergencyContactPhone.trim())
    ) {
      newErrors.emergencyContactPhone =
        "Please enter a valid emergency contact phone number.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const response = await fetch("/api/elders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preferred_name: form.preferredName,
          full_name: form.fullName,
          phone: form.phone,
          timezone: form.timezone,
          check_in_time: form.checkInTime,
          frequency: form.frequency,
          medical_notes: form.medicalNotes,
          medications: form.medications,
          emergency_contact_name: form.emergencyContactName,
          emergency_contact_phone: form.emergencyContactPhone,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create elder");
      }

      router.push("/elders");
    } catch (error) {
      alert("Failed to add elder. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const fieldError = (field: string) =>
    errors[field] ? (
      <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
        <AlertCircle className="h-3 w-3" />
        {errors[field]}
      </p>
    ) : null;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/elders")}
          className="gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Elders
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Add New Elder</h1>
        <p className="text-gray-500 mt-1">
          Fill in the details below to set up check-ins for a new elder.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <User className="h-5 w-5 text-teal-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Basic Information
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="preferredName">
                Preferred Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="preferredName"
                placeholder="e.g., Grandma Rose"
                value={form.preferredName}
                onChange={(e) => updateField("preferredName", e.target.value)}
                className={cn(errors.preferredName && "border-red-500")}
              />
              {fieldError("preferredName")}
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName">
                Full Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="fullName"
                placeholder="e.g., Rosemary Johnson"
                value={form.fullName}
                onChange={(e) => updateField("fullName", e.target.value)}
                className={cn(errors.fullName && "border-red-500")}
              />
              {fieldError("fullName")}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">
              Phone Number <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 000-0000"
                className={cn("pl-10", errors.phone && "border-red-500")}
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
              />
            </div>
            {fieldError("phone")}
          </div>
        </Card>

        {/* Check-in Schedule */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-5 w-5 text-teal-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Check-in Schedule
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="timezone">
                Timezone <span className="text-red-500">*</span>
              </Label>
              <Select
                value={form.timezone}
                onValueChange={(val) => updateField("timezone", val)}
              >
                <SelectTrigger
                  className={cn(errors.timezone && "border-red-500")}
                >
                  <Globe className="h-4 w-4 text-gray-400 mr-2" />
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  {timezones.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz.replace("_", " ").split("/").pop()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldError("timezone")}
            </div>

            <div className="space-y-2">
              <Label htmlFor="checkInTime">
                Check-in Time <span className="text-red-500">*</span>
              </Label>
              <Input
                id="checkInTime"
                type="time"
                value={form.checkInTime}
                onChange={(e) => updateField("checkInTime", e.target.value)}
                className={cn(errors.checkInTime && "border-red-500")}
              />
              {fieldError("checkInTime")}
            </div>

            <div className="space-y-2">
              <Label htmlFor="frequency">
                Frequency <span className="text-red-500">*</span>
              </Label>
              <Select
                value={form.frequency}
                onValueChange={(val) => updateField("frequency", val)}
              >
                <SelectTrigger
                  className={cn(errors.frequency && "border-red-500")}
                >
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  {frequencies.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldError("frequency")}
            </div>
          </div>
        </Card>

        {/* Medical Information */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Stethoscope className="h-5 w-5 text-teal-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Medical Information
            </h2>
          </div>

          <div className="space-y-2">
            <Label htmlFor="medicalNotes">Medical Notes</Label>
            <Textarea
              id="medicalNotes"
              placeholder="Any relevant medical conditions, allergies, or notes..."
              rows={4}
              value={form.medicalNotes}
              onChange={(e) => updateField("medicalNotes", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="medications" className="flex items-center gap-1">
              <Pill className="h-3.5 w-3.5" />
              Medications
            </Label>
            <Textarea
              id="medications"
              placeholder="List current medications, dosages, and schedules..."
              rows={3}
              value={form.medications}
              onChange={(e) => updateField("medications", e.target.value)}
            />
          </div>
        </Card>

        {/* Emergency Contact */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-5 w-5 text-teal-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Emergency Contact
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="emergencyContactName">Contact Name</Label>
              <Input
                id="emergencyContactName"
                placeholder="e.g., Dr. Smith"
                value={form.emergencyContactName}
                onChange={(e) =>
                  updateField("emergencyContactName", e.target.value)
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="emergencyContactPhone">Contact Phone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="emergencyContactPhone"
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  className={cn(
                    "pl-10",
                    errors.emergencyContactPhone && "border-red-500"
                  )}
                  value={form.emergencyContactPhone}
                  onChange={(e) =>
                    updateField("emergencyContactPhone", e.target.value)
                  }
                />
              </div>
              {fieldError("emergencyContactPhone")}
            </div>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/elders")}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={submitting}
            className="bg-teal-600 hover:bg-teal-700 text-white gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Adding Elder...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Add Elder
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
