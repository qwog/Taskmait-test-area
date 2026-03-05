import { format, formatDistanceToNow, parseISO } from "date-fns";

export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "MMM d, yyyy");
}

export function formatTime(date: string | Date): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "h:mm a");
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "MMM d, yyyy 'at' h:mm a");
}

export function formatRelative(date: string | Date): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

export function getMoodEmoji(mood: string | null): string {
  switch (mood) {
    case "improving":
      return "📈";
    case "stable":
      return "😊";
    case "declining":
      return "📉";
    default:
      return "❓";
  }
}

export function getSeverityColor(severity: string): string {
  switch (severity) {
    case "critical":
      return "text-red-700 bg-red-50 border-red-200";
    case "high":
      return "text-orange-700 bg-orange-50 border-orange-200";
    case "medium":
      return "text-yellow-700 bg-yellow-50 border-yellow-200";
    case "low":
      return "text-blue-700 bg-blue-50 border-blue-200";
    default:
      return "text-gray-700 bg-gray-50 border-gray-200";
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "completed":
      return "text-green-700 bg-green-50";
    case "in_progress":
      return "text-blue-700 bg-blue-50";
    case "scheduled":
      return "text-gray-700 bg-gray-50";
    case "missed":
      return "text-red-700 bg-red-50";
    case "escalated":
      return "text-orange-700 bg-orange-50";
    default:
      return "text-gray-700 bg-gray-50";
  }
}
