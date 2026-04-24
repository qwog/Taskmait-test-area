import type { Severity } from "@/lib/rules/types";
import { cn } from "@/lib/utils";

const labels: Record<Severity, string> = {
  green: "GO",
  yellow: "CAUTION",
  red: "STOP",
};

const styles: Record<Severity, string> = {
  green: "bg-green-500 text-white",
  yellow: "bg-yellow-400 text-black",
  red: "bg-red-600 text-white",
};

export function StatusLight({ level }: { level: Severity }) {
  return (
    <div
      role="status"
      aria-label={`Risk level ${labels[level]}`}
      className={cn(
        "flex items-center justify-center rounded-2xl",
        "h-[40vh] min-h-[240px]",
        styles[level]
      )}
    >
      <span className="text-field-mega font-black tracking-tight">
        {labels[level]}
      </span>
    </div>
  );
}
