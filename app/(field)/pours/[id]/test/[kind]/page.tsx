"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { notFound } from "next/navigation";
import { TestSlider } from "@/components/field/TestSlider";
import { BigButton } from "@/components/field/BigButton";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { enqueue } from "@/lib/offline/queue";

type Kind = "slump" | "air" | "temp";

const SPECS: Record<Kind, { label: string; unit: string; min: number; max: number; step: number; testType: string }> = {
  slump: { label: "Slump Test", unit: "in", min: 1, max: 10, step: 0.25, testType: "slump" },
  air: { label: "Air Content", unit: "%", min: 1, max: 12, step: 0.1, testType: "air_content" },
  temp: { label: "Concrete Temp", unit: "°F", min: 40, max: 110, step: 1, testType: "concrete_temp" },
};

export default function TestEntryPage({
  params,
}: {
  params: { id: string; kind: string };
}) {
  const kind = params.kind as Kind;
  if (!SPECS[kind]) notFound();
  const spec = SPECS[kind];
  const router = useRouter();

  // Default target bands — in a real app these come from the mix_design.
  const defaults = useMemo(() => {
    if (kind === "slump") return { targetMin: 3, targetMax: 5 };
    if (kind === "air") return { targetMin: 5, targetMax: 7 };
    return { targetMin: 50, targetMax: 90 };
  }, [kind]);

  const [value, setValue] = useState((defaults.targetMin + defaults.targetMax) / 2);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const row = {
      pour_id: params.id,
      test_type: spec.testType,
      value,
      unit: spec.unit,
    };
    if (navigator.onLine) {
      const supabase = createBrowserSupabase();
      await supabase.from("quality_tests").insert(row);
    } else {
      await enqueue({
        endpoint: `/api/pours/${params.id}/tests`,
        method: "POST",
        body: row,
      });
    }
    router.push(`/field/pours/${params.id}/log`);
  }

  return (
    <div className="space-y-6">
      <TestSlider
        label={spec.label}
        unit={spec.unit}
        min={spec.min}
        max={spec.max}
        step={spec.step}
        targetMin={defaults.targetMin}
        targetMax={defaults.targetMax}
        onChange={setValue}
      />
      <BigButton tone="green" onClick={save}>
        {saving ? "Saving…" : "Log"}
      </BigButton>
    </div>
  );
}
