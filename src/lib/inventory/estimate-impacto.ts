import { prisma } from "@/lib/prisma";
import { estimateWeeklyAudience, getNearbyPOIs } from "@/lib/audience";
import { HTTP_USER_AGENT } from "@/lib/brand";
import {
  formatImpacto,
  normalizeImpactoDisplay,
  parseImpactoNumber,
  type ImpactoPeriodo,
} from "@/lib/inventory/impacto";
import { parseUnitSpecs } from "@/lib/inventory/unit-specs";

export type EnsuredImpacto = {
  impacto: string;
  periodo: ImpactoPeriodo;
  source: "kit" | "estimated" | "ai";
};

function asMeta(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (v == null) continue;
    const s = String(v).trim();
    if (s) out[k] = s;
  }
  return out;
}

async function geocodeLabel(label: string, zona?: string): Promise<{ lat: number; lng: number } | null> {
  const q = [label, zona, "Buenos Aires", "Argentina"].filter(Boolean).join(", ");
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "ar");
  url.searchParams.set("accept-language", "es");
  try {
    const res = await fetch(url.toString(), {
      headers: { "User-Agent": `${HTTP_USER_AGENT} (impacto geocode)`, Accept: "application/json" },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { lat: string; lon: string }[];
    if (!data?.[0]) return null;
    const lat = Number(data[0].lat);
    const lng = Number(data[0].lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}

async function estimateFromCatalog(
  lat: number,
  lng: number,
  format: string,
): Promise<number> {
  const pois = await getNearbyPOIs(lat, lng);
  return estimateWeeklyAudience(pois, format);
}

async function estimateFromAi(input: {
  locationLabel: string;
  zona?: string;
  visibilidad?: string;
  medida?: string;
  format: string;
}): Promise<number | null> {
  if (!process.env.OPENAI_API_KEY) return null;
  try {
    const { openai } = await import("@/lib/openai");
    const tipo = input.format === "digital_ooh" ? "pantalla LED" : "cartel OOH estático";
    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      max_tokens: 40,
      messages: [
        {
          role: "user",
          content: `Estimá impactos semanales (personas que ven el soporte) para un ${tipo} en Argentina.
Ubicación: ${input.locationLabel}
Zona: ${input.zona || "AMBA"}
Visibilidad: ${input.visibilidad || "n/d"}
Medida: ${input.medida || "n/d"}
Usá rangos típicos de vía pública AMBA (80.000 a 2.500.000 semanales). Autopistas y accesos altos; calles barriales más bajos.
Respondé SOLO un número entero, sin puntos ni texto.`,
        },
      ],
    });
    const raw = res.choices[0]?.message?.content ?? "";
    const n = Number(raw.replace(/[^\d]/g, ""));
    return Number.isFinite(n) && n >= 10_000 && n <= 8_000_000 ? n : null;
  } catch {
    return null;
  }
}

export async function ensureInventoryImpacto(unitId: string): Promise<EnsuredImpacto | null> {
  const unit = await prisma.inventoryUnit.findUnique({
    where: { id: unitId },
    select: {
      id: true,
      name: true,
      description: true,
      locationLabel: true,
      format: true,
      latitude: true,
      longitude: true,
      metadata: true,
    },
  });
  if (!unit) return null;

  const meta = asMeta(unit.metadata);
  const specs = parseUnitSpecs({
    name: unit.name,
    description: unit.description,
    locationLabel: unit.locationLabel,
    format: unit.format,
    latitude: unit.latitude,
    longitude: unit.longitude,
    metadata: meta,
  });

  const existing = specs.impacto || meta.impacto || "";
  if (parseImpactoNumber(existing)) {
    const normalized = normalizeImpactoDisplay(existing);
    const already =
      meta.impacto === normalized.impacto && meta.impactoPeriodo === normalized.periodo;
    if (!already) {
      await prisma.inventoryUnit.update({
        where: { id: unit.id },
        data: {
          metadata: {
            ...meta,
            impacto: normalized.impacto,
            impactoPeriodo: normalized.periodo,
            impactoSource: meta.impactoSource || "kit",
          },
        },
      });
    }
    return { ...normalized, source: (meta.impactoSource as EnsuredImpacto["source"]) || "kit" };
  }

  let lat = unit.latitude;
  let lng = unit.longitude;
  let source: EnsuredImpacto["source"] = "estimated";
  let weekly: number | null = null;

  if (lat == null || lng == null) {
    const geo = await geocodeLabel(unit.locationLabel, specs.zona || meta.zona);
    if (geo) {
      lat = geo.lat;
      lng = geo.lng;
    }
  }

  if (lat != null && lng != null) {
    weekly = await estimateFromCatalog(lat, lng, unit.format);
  }

  if (!weekly || weekly <= 0) {
    const ai = await estimateFromAi({
      locationLabel: unit.locationLabel,
      zona: specs.zona || meta.zona,
      visibilidad: specs.visibilidad || meta.visibilidad,
      medida: specs.medida || meta.medida,
      format: unit.format,
    });
    if (ai) {
      weekly = ai;
      source = "ai";
    }
  }

  if (!weekly || weekly <= 0) {
    weekly = unit.format === "digital_ooh" ? 50_000 : 30_000;
    source = "estimated";
  }

  const periodo: ImpactoPeriodo = "semanal";
  const impacto = formatImpacto(weekly, periodo);
  await prisma.inventoryUnit.update({
    where: { id: unit.id },
    data: {
      ...(unit.latitude == null && lat != null && lng != null ? { latitude: lat, longitude: lng } : {}),
      metadata: {
        ...meta,
        impacto,
        impactoPeriodo: periodo,
        impactoSource: source,
      },
    },
  });

  return { impacto, periodo, source };
}
