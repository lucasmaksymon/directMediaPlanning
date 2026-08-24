import { HTTP_USER_AGENT } from "@/lib/brand";

export type OverpassResult = {
  type: string;
  tags?: Record<string, string>;
  lat?: number;
  lon?: number;
};

export type POICategories = {
  transit: number;
  commerce: number;
  education: number;
  health: number;
  entertainment: number;
  total: number;
};

export async function getNearbyPOIs(lat: number, lng: number, radiusMeters = 400): Promise<POICategories> {
  const query = `
    [out:json][timeout:8];
    (
      node["public_transport"="stop_position"](around:${radiusMeters},${lat},${lng});
      node["highway"="bus_stop"](around:${radiusMeters},${lat},${lng});
      node["shop"](around:${radiusMeters},${lat},${lng});
      node["amenity"="school"](around:${radiusMeters},${lat},${lng});
      node["amenity"="university"](around:${radiusMeters},${lat},${lng});
      node["amenity"="hospital"](around:${radiusMeters},${lat},${lng});
      node["amenity"="restaurant"](around:${radiusMeters},${lat},${lng});
      node["amenity"="cafe"](around:${radiusMeters},${lat},${lng});
      node["amenity"="bank"](around:${radiusMeters},${lat},${lng});
      node["leisure"](around:${radiusMeters},${lat},${lng});
    );
    out ids 3000;
  `;

  try {
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: query,
      headers: {
        "Content-Type": "text/plain",
        // Overpass recomienda identificar al cliente; sin UA a veces falla o devuelve HTML.
        "User-Agent": `${HTTP_USER_AGENT} (server-side audience estimate)`,
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) throw new Error("Overpass API error");
    const data = (await res.json()) as { elements?: unknown[] };
    // `out count` en JSON no trae `tags.total` como asumíamos → siempre 0 → audiencia = base fija.
    // `out ids` devuelve un elemento por nodo; el largo del array es el conteo real.
    const count = Array.isArray(data.elements) ? data.elements.length : 0;

    // Estimación simplificada por tipo
    return {
      transit: Math.floor(count * 0.15),
      commerce: Math.floor(count * 0.35),
      education: Math.floor(count * 0.1),
      health: Math.floor(count * 0.05),
      entertainment: Math.floor(count * 0.2),
      total: Number(count),
    };
  } catch {
    return { transit: 0, commerce: 0, education: 0, health: 0, entertainment: 0, total: 0 };
  }
}

export function estimateWeeklyAudience(pois: POICategories, format: string): number {
  const base = format === "digital_ooh" ? 50000 : format === "static_ooh" ? 30000 : 40000;
  const multiplier = 1 + Math.log10(Math.max(1, pois.total)) * 0.3;
  return Math.round(base * multiplier);
}

export function estimateCPM(price: number, weeklyAudience: number): number {
  if (weeklyAudience <= 0) return 0;
  return Math.round((price / weeklyAudience) * 1000);
}
