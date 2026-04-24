import { ConnectionBadge } from "@/components/field/ConnectionBadge";
import { LongPressExit } from "@/components/field/LongPressExit";

export default function FieldLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="field-root flex min-h-screen flex-col">
      <header className="flex items-center justify-between p-3">
        <span className="text-field-body font-black uppercase tracking-wider">
          PourGuard · Field
        </span>
        <ConnectionBadge />
      </header>
      <main className="flex-1 p-4">{children}</main>
      <footer className="sticky bottom-0 p-3 bg-slate-950">
        <LongPressExit />
      </footer>
    </div>
  );
}
