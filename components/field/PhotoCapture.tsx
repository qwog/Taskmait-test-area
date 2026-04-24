"use client";

import { useRef, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";

interface PhotoCaptureProps {
  bucket: string;    // e.g. "pours"
  pathPrefix: string; // e.g. `${pourId}/batch-tickets`
  onUploaded: (publicUrl: string) => void;
}

export function PhotoCapture({ bucket, pathPrefix, onUploaded }: PhotoCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    const supabase = createBrowserSupabase();
    const path = `${pathPrefix}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage
      .from(bucket)
      .upload(path, file, { upsert: false });
    if (upErr) {
      setError(upErr.message);
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    onUploaded(data.publicUrl);
    setUploading(false);
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleChange}
        className="sr-only"
        aria-label="Capture photo"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="w-full rounded-xl bg-blue-600 p-5 text-field-action font-bold text-white disabled:opacity-60"
      >
        {uploading ? "Uploading…" : "Take Photo"}
      </button>
      {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
    </div>
  );
}
