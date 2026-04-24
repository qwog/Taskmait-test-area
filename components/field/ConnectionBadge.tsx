"use client";

import { useEffect, useState } from "react";

export function ConnectionBadge() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  if (online) return null;
  return (
    <div className="rounded-md bg-yellow-400 px-3 py-1 text-field-body font-bold text-black">
      OFFLINE — logs queued
    </div>
  );
}
