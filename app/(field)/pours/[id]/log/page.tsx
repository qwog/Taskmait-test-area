"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BigButton } from "@/components/field/BigButton";
import { createBrowserSupabase } from "@/lib/supabase/client";

interface PageProps {
  params: { id: string };
}

export default function QuickLogPage({ params }: PageProps) {
  const [lastLogMins, setLastLogMins] = useState<number | null>(null);

  useEffect(() => {
    const supabase = createBrowserSupabase();
    async function refresh() {
      const { data } = await supabase
        .from("pour_logs")
        .select("timestamp")
        .eq("pour_id", params.id)
        .order("timestamp", { ascending: false })
        .limit(1);
      if (data?.[0]) {
        const delta = (Date.now() - new Date(data[0].timestamp).getTime()) / 60000;
        setLastLogMins(Math.round(delta));
      }
    }
    refresh();
    const t = setInterval(refresh, 30_000);
    return () => clearInterval(t);
  }, [params.id]);

  const base = `/field/pours/${params.id}`;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Tile href={`${base}/batch`} tone="blue" emoji="📋" label="Batch Ticket" />
        <Tile href={`${base}/test/slump`} tone="green" emoji="🧪" label="Slump" />
        <Tile href={`${base}/test/air`} tone="green" emoji="💨" label="Air Test" />
        <Tile href={`${base}/test/temp`} tone="green" emoji="🌡" label="Temp" />
        <Tile href={`${base}/placement`} tone="amber" emoji="🏁" label="Placement" />
        <Tile href={`${base}/cure`} tone="blue" emoji="💧" label="Cure" />
      </div>

      <div className="rounded-xl bg-slate-800 p-4 text-center">
        <div className="text-field-action font-bold">
          {lastLogMins == null ? "No logs yet" : `${lastLogMins} min since last log`}
        </div>
      </div>

      <BigButton href={`${base}/pre-check`} tone="slate">
        Back to pre-check
      </BigButton>
    </div>
  );
}

function Tile({
  href,
  tone,
  emoji,
  label,
}: {
  href: string;
  tone: "green" | "blue" | "amber" | "red" | "slate";
  emoji: string;
  label: string;
}) {
  return (
    <Link href={href}>
      <BigButton tone={tone}>
        <span className="flex flex-col items-center gap-2">
          <span className="text-4xl">{emoji}</span>
          <span>{label}</span>
        </span>
      </BigButton>
    </Link>
  );
}
