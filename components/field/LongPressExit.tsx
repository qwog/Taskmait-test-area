"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

const HOLD_MS = 2000;

export function LongPressExit() {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [progress, setProgress] = useState(0);

  function start() {
    const startedAt = Date.now();
    const interval = setInterval(() => {
      setProgress(Math.min(1, (Date.now() - startedAt) / HOLD_MS));
    }, 50);
    timer.current = setTimeout(() => {
      clearInterval(interval);
      router.push("/dashboard");
    }, HOLD_MS);
    (timer.current as unknown as { _interval?: unknown })._interval = interval;
  }

  function cancel() {
    if (timer.current) {
      clearTimeout(timer.current);
      const int = (timer.current as unknown as { _interval?: ReturnType<typeof setInterval> })
        ._interval;
      if (int) clearInterval(int);
      timer.current = null;
    }
    setProgress(0);
  }

  return (
    <button
      type="button"
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      className="relative w-full rounded-lg bg-slate-800 p-4 text-white text-field-body font-semibold"
    >
      <span>Hold to exit field mode</span>
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 bg-red-600/50 rounded-lg pointer-events-none"
        style={{ width: `${progress * 100}%` }}
      />
    </button>
  );
}
