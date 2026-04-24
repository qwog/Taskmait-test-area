"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

type Tone = "green" | "blue" | "amber" | "red" | "slate";

const tones: Record<Tone, string> = {
  green: "bg-green-500 text-white",
  blue: "bg-blue-600 text-white",
  amber: "bg-yellow-400 text-black",
  red: "bg-red-600 text-white",
  slate: "bg-slate-700 text-white",
};

interface BigButtonProps {
  href?: string;
  onClick?: () => void;
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}

export function BigButton({
  href,
  onClick,
  tone = "green",
  children,
  className,
}: BigButtonProps) {
  const classes = cn(
    "w-full flex items-center justify-center rounded-xl font-bold uppercase tracking-wide text-field-action min-h-field-btn px-6 py-5 active:scale-[0.99] transition-none select-none",
    tones[tone],
    className
  );
  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={classes}>
      {children}
    </button>
  );
}
