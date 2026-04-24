"use client";

import { useEffect, useState } from "react";
import { BigButton } from "@/components/field/BigButton";
import { createBrowserSupabase } from "@/lib/supabase/client";

export default function CurePage({ params }: { params: { id: string } }) {
  const [cureStartedAt, setCureStartedAt] = useState<string | null>(null);
  const supabase = createBrowserSupabase();

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("pour_logs")
        .select("timestamp")
        .eq("pour_id", params.id)
        .eq("event_type", "cure_started")
        .order("timestamp", { ascending: false })
        .limit(1);
      if (data?.[0]) setCureStartedAt(data[0].timestamp);
    })();
  }, [params.id, supabase]);

  async function logEvent(event_type: "cure_started" | "cure_ended") {
    await supabase
      .from("pour_logs")
      .insert({ pour_id: params.id, event_type });
    if (event_type === "cure_started") {
      setCureStartedAt(new Date().toISOString());
    }
  }

  const hoursSince = cureStartedAt
    ? Math.round(
        (Date.now() - new Date(cureStartedAt).getTime()) / 3_600_000
      )
    : null;

  return (
    <div className="space-y-4">
      <h1 className="text-field-action font-bold">Cure</h1>
      {cureStartedAt ? (
        <div className="rounded-xl bg-blue-700 p-6 text-center">
          <div className="text-field-mega font-black">{hoursSince}</div>
          <div className="text-field-body">hours curing</div>
        </div>
      ) : (
        <BigButton tone="blue" onClick={() => logEvent("cure_started")}>
          Start Cure
        </BigButton>
      )}
      {cureStartedAt && (
        <BigButton tone="slate" onClick={() => logEvent("cure_ended")}>
          End Cure
        </BigButton>
      )}
    </div>
  );
}
