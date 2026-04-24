"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StatusLight } from "@/components/field/StatusLight";
import { BigButton } from "@/components/field/BigButton";
import { menzelEvaporationRate } from "@/lib/rules/menzel";
import type { PrePourEvaluation } from "@/lib/rules/types";

interface PageProps {
  params: { id: string };
}

export default function PreCheckPage({ params }: PageProps) {
  const [result, setResult] = useState<PrePourEvaluation | null>(null);
  const [weather, setWeather] = useState<{ tempF: number; humidity: number; wind: number } | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function run() {
      try {
        const res = await fetch("/api/rules/evaluate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pourId: params.id }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as PrePourEvaluation;
        setResult(data);
        // Show the ambient snapshot from the first forecast row if we have it.
        const first = data.evaluations.find((e) => e.inputsSnapshot.ambientTempF);
        if (first) {
          setWeather({
            tempF: Number(first.inputsSnapshot.ambientTempF),
            humidity: Number(first.inputsSnapshot.humidityPct),
            wind: Number(first.inputsSnapshot.windMph),
          });
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "evaluation failed");
      } finally {
        setLoading(false);
      }
    }
    run();
  }, [params.id]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-[40vh] rounded-2xl bg-slate-700" />
        <div className="h-24 rounded-2xl bg-slate-700" />
      </div>
    );
  }
  if (error || !result) {
    return (
      <div className="rounded-xl bg-red-600 p-6 text-white">
        <h2 className="text-field-action font-bold">Cannot evaluate</h2>
        <p className="mt-2">{error ?? "unknown error"}</p>
        <p className="mt-2 text-field-body">Connect to run pre-pour check.</p>
      </div>
    );
  }

  const evap =
    weather &&
    menzelEvaporationRate({
      concreteTempF: weather.tempF + 5,
      ambientTempF: weather.tempF,
      humidityPct: weather.humidity,
      windMph: weather.wind,
    });

  const triggered = result.evaluations.filter((e) => e.triggered);

  return (
    <div className="space-y-4">
      <StatusLight level={result.level} />

      {weather && (
        <div className="grid grid-cols-3 gap-2 text-center">
          <DataRow label="Evap" value={evap ? evap.toFixed(2) : "—"} unit="lb/ft²/hr" />
          <DataRow label="Temp" value={weather.tempF.toFixed(0)} unit="°F" />
          <DataRow label="Wind" value={weather.wind.toFixed(0)} unit="mph" />
        </div>
      )}

      {result.level === "yellow" && result.mitigations[0] && (
        <div className="rounded-xl bg-yellow-400 p-4 text-black">
          <p className="text-field-body font-bold">{result.mitigations[0]}</p>
        </div>
      )}

      {result.level === "red" ? (
        <BigButton
          href={`/field/pours/${params.id}/override`}
          tone="red"
        >
          Override & Start
        </BigButton>
      ) : (
        <BigButton
          href={`/field/pours/${params.id}/log`}
          tone="green"
        >
          Start Pour
        </BigButton>
      )}

      <button
        type="button"
        onClick={() => setShowDetails((v) => !v)}
        className="w-full rounded-lg bg-slate-800 p-3 text-white text-field-body font-semibold"
      >
        {showDetails ? "Hide details" : `Details (${triggered.length} flagged)`}
      </button>

      {showDetails && (
        <div className="space-y-2">
          {triggered.map((e) => (
            <div
              key={e.ruleId}
              className={`rounded-lg p-3 ${
                e.severity === "red" ? "bg-red-600 text-white" : "bg-yellow-400 text-black"
              }`}
            >
              <div className="text-field-body font-bold">{e.title}</div>
              <div className="text-sm">{e.message}</div>
              <div className="mt-1 text-xs opacity-80">{e.citation}</div>
              {e.mitigation && <div className="mt-1 text-xs italic">{e.mitigation}</div>}
            </div>
          ))}
          {triggered.length === 0 && (
            <div className="rounded-lg bg-green-600 p-3 text-white text-field-body">
              All rules green. Pour away.
            </div>
          )}
          <Link href={`/pours/${params.id}`} className="block text-sm text-slate-300 underline">
            Full office-mode pour detail
          </Link>
        </div>
      )}
    </div>
  );
}

function DataRow({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-lg bg-slate-800 p-3">
      <div className="text-xs uppercase text-slate-400">{label}</div>
      <div className="text-field-hero font-black">{value}</div>
      <div className="text-xs text-slate-400">{unit}</div>
    </div>
  );
}
