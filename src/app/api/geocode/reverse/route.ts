import { NextRequest, NextResponse } from "next/server";
import { HTTP_USER_AGENT } from "@/lib/brand";

const NOMINATIM_REVERSE = "https://nominatim.openstreetmap.org/reverse";

/**
 * Geocodificación inversa (lat/lng → dirección) vía Nominatim.
 * El proxy respeta la política de uso: User-Agent identificable desde el servidor.
 */
export async function GET(req: NextRequest) {
  const latRaw = req.nextUrl.searchParams.get("lat");
  const lngRaw = req.nextUrl.searchParams.get("lng") ?? req.nextUrl.searchParams.get("lon");
  if (latRaw == null || lngRaw == null) {
    return NextResponse.json({ error: "Faltan lat y lng" }, { status: 400 });
  }
  const lat = Number.parseFloat(latRaw);
  const lon = Number.parseFloat(lngRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ error: "Coordenadas inválidas" }, { status: 400 });
  }

  const url = new URL(NOMINATIM_REVERSE);
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lon));
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("accept-language", "es");

  try {
    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": `${HTTP_USER_AGENT} (reverse geocode; inventory form)`,
      },
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: "No se pudo obtener la dirección" },
        { status: 502 },
      );
    }
    const data: { display_name?: string; error?: string } = await res.json();
    if (data.error || typeof data.display_name !== "string" || !data.display_name.trim()) {
      return NextResponse.json({ error: "Sin dirección para este punto" }, { status: 404 });
    }
    return NextResponse.json({ label: data.display_name.trim() });
  } catch {
    return NextResponse.json({ error: "Error al consultar la dirección" }, { status: 502 });
  }
}
