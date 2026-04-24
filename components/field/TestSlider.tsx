"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface TestSliderProps {
  label: string;
  unit: string;
  min: number;
  max: number;
  step?: number;
  targetMin: number;
  targetMax: number;
  initial?: number;
  onChange?: (value: number) => void;
}

export function TestSlider({
  label,
  unit,
  min,
  max,
  step = 0.25,
  targetMin,
  targetMax,
  initial,
  onChange,
}: TestSliderProps) {
  const [value, setValue] = useState(initial ?? (targetMin + targetMax) / 2);
  const inSpec = value >= targetMin && value <= targetMax;

  function update(next: number) {
    setValue(next);
    onChange?.(next);
  }

  return (
    <div className="space-y-4">
      <h2 className="text-field-action font-bold uppercase tracking-wide">
        {label}
      </h2>
      <div
        className={cn(
          "rounded-xl p-6 text-center",
          inSpec ? "bg-green-500 text-white" : "bg-yellow-400 text-black"
        )}
      >
        <div className="text-field-mega font-black leading-none">
          {value.toFixed(2)}
          <span className="text-field-action ml-2 font-bold">{unit}</span>
        </div>
        <div className="mt-2 text-field-body font-semibold">
          Target: {targetMin}–{targetMax} {unit}
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => update(Number(e.target.value))}
        className="h-12 w-full"
        aria-label={label}
      />
    </div>
  );
}
