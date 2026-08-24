"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

type PlaylistItem = { id: string; url: string; durationSec: number; order: number };

export default function WebPlayerPage() {
  const params = useSearchParams();
  const deviceKey = params.get("key") ?? "";
  const [items, setItems] = useState<PlaylistItem[]>([]);
  const [index, setIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!deviceKey) {
      setError("Falta ?key=DEVICE_KEY en la URL");
      return;
    }

    async function tick() {
      await fetch("/api/player/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceKey }),
      });
    }

    tick();
    const hb = setInterval(tick, 30000);
    return () => clearInterval(hb);
  }, [deviceKey]);

  useEffect(() => {
    if (!deviceKey) return;

    fetch(`/api/player/playlist?deviceKey=${encodeURIComponent(deviceKey)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setItems(data.items ?? []);
      })
      .catch(() => setError("Error al cargar playlist"));
  }, [deviceKey]);

  useEffect(() => {
    if (items.length === 0) return;
    const current = items[index % items.length];
    if (!current) return;

    fetch("/api/player/play-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deviceKey,
        creativeUrl: current.url,
        playlistItemId: current.id,
        durationSec: current.durationSec,
      }),
    }).catch(() => {});

    timerRef.current = setTimeout(() => {
      setIndex((i) => (i + 1) % items.length);
    }, current.durationSec * 1000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [items, index, deviceKey]);

  const current = items[index % Math.max(items.length, 1)];

  return (
    <main className="min-h-screen bg-black flex items-center justify-center text-white">
      {error && <p className="text-red-400 p-8">{error}</p>}
      {!error && items.length === 0 && <p className="text-gray-400">Sin playlist publicada</p>}
      {current && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={current.url} alt="" className="max-h-screen max-w-full object-contain" />
      )}
    </main>
  );
}
