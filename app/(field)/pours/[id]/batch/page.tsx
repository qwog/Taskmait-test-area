"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BigButton } from "@/components/field/BigButton";
import { PhotoCapture } from "@/components/field/PhotoCapture";
import { createBrowserSupabase } from "@/lib/supabase/client";

export default function BatchTicketPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [form, setForm] = useState({
    ticket_number: "",
    batched_at: "",
    delivered_at: "",
    truck_number: "",
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const supabase = createBrowserSupabase();
    await supabase.from("batch_tickets").insert({
      pour_id: params.id,
      ticket_number: form.ticket_number || null,
      batched_at: form.batched_at || null,
      delivered_at: form.delivered_at || null,
      truck_number: form.truck_number || null,
      photo_url: photoUrl,
    });
    router.push(`/field/pours/${params.id}/log`);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-field-action font-bold">Batch Ticket</h1>
      <PhotoCapture
        bucket="pours"
        pathPrefix={`${params.id}/batch-tickets`}
        onUploaded={setPhotoUrl}
      />
      {photoUrl && (
        <img
          src={photoUrl}
          alt="Batch ticket"
          className="w-full rounded-lg border border-slate-700"
        />
      )}
      <Field
        label="Ticket #"
        value={form.ticket_number}
        onChange={(v) => setForm({ ...form, ticket_number: v })}
      />
      <Field
        label="Batched at"
        type="datetime-local"
        value={form.batched_at}
        onChange={(v) => setForm({ ...form, batched_at: v })}
      />
      <Field
        label="Delivered at"
        type="datetime-local"
        value={form.delivered_at}
        onChange={(v) => setForm({ ...form, delivered_at: v })}
      />
      <Field
        label="Truck #"
        value={form.truck_number}
        onChange={(v) => setForm({ ...form, truck_number: v })}
      />
      <BigButton tone="green" onClick={save}>
        {saving ? "Saving…" : "Save Ticket"}
      </BigButton>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="block text-field-body font-semibold">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg bg-slate-800 p-4 text-field-action text-white"
      />
    </label>
  );
}
