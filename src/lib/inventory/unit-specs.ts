export type InventoryUnitSpecs = {
  medida?: string;
  visibilidad?: string;
  caras?: string;
  impacto?: string;
  frecuencia?: string;
  spot?: string;
  encendido?: string;
  resolucion?: string;
  zona?: string;
  mapsUrl?: string;
};

type SpecSource = {
  name?: string | null;
  description?: string | null;
  locationLabel?: string | null;
  format?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  metadata?: unknown;
};

type Meta = Record<string, string | undefined>;

function asMeta(raw: unknown): Meta {
  if (!raw || typeof raw !== "object") return {};
  const out: Meta = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (v == null) continue;
    const s = String(v).trim();
    if (s) out[k] = s;
  }
  return out;
}

function firstMatch(text: string, patterns: RegExp[]): string {
  for (const re of patterns) {
    const m = text.match(re);
    if (m?.[1]?.trim()) return m[1].trim();
    if (m?.[0]?.trim() && !m[1]) return m[0].trim();
  }
  return "";
}

function cleanNoise(value: string): string {
  return value
    .replace(/\s*[·|]\s*Opción\s+\d+\/\d+.*$/i, "")
    .replace(/\s*[·|]\s*Precio\s*\/\s*Disp\..*$/i, "")
    .replace(/\s*[·|]\s*\$\s*[\d.]+.*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Extrae "12 x 8 mts" de blobs tipo "12 m x 8 m Detalle …". */
export function cleanMedida(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  const m =
    t.match(
      /(\d+[.,]?\d*)\s*m(?:ts|etros)?\s*[x×]\s*(\d+[.,]?\d*)\s*m(?:ts|etros)?/i,
    ) ||
    t.match(/(\d+[.,]?\d*)\s*[x×]\s*(\d+[.,]?\d*)\s*(?:m|mts|metros)?/i);
  if (m) return `${m[1]} x ${m[2]} mts`;
  // Evitar meter "Detalle…" entero como medida
  const beforeDetalle = t.split(/\s+Detalle\b/i)[0]?.trim() ?? t;
  return beforeDetalle.slice(0, 80);
}

export function mapsUrlFromCoords(
  latitude?: number | null,
  longitude?: number | null,
): string | undefined {
  if (latitude == null || longitude == null) return undefined;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return undefined;
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
}

/** True si el link es solo lat,lng (Google suele reverse-geocodificar mal a una calle paralela). */
export function isLatLngMapsUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (!/google\.[^/]*\/maps/i.test(u.href)) return false;
    const q = u.searchParams.get("q") || "";
    if (/^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(q.trim())) return true;
    if (/\/maps\/place\/-?\d/.test(u.pathname)) return true;
    if (/\/@-?\d+(\.\d+)?,-?\d+(\.\d+)?/.test(u.href)) return true;
    return false;
  } catch {
    return /maps\?q=-?\d+[.,]\d+\s*,\s*-?\d+[.,]\d+/i.test(url);
  }
}

/**
 * Link de Maps por dirección textual (más fiable que lat/lng para OOH en CABA).
 * Ej: "Cabildo 3422" + zona CABA → busca Av. Cabildo 3422, no un edificio en calle paralela.
 */
export function mapsUrlFromLocation(opts: {
  locationLabel?: string | null;
  zona?: string | null;
}): string | undefined {
  let label = (opts.locationLabel || "").trim();
  if (label.length < 4) return undefined;

  label = label
    .split(/\s+Tipo\b/i)[0]
    ?.split(/\s+Detalle\b/i)[0]
    ?.split(/\s+Impactos?\b/i)[0]
    ?.trim() || label;
  label = label.replace(/\s+/g, " ").slice(0, 160);
  if (label.length < 4) return undefined;

  const parts: string[] = [label];
  const zona = (opts.zona || "").trim();
  const blob = label.toLowerCase();
  if (zona && !blob.includes(zona.toLowerCase())) {
    parts.push(zona);
  }
  const joined = parts.join(", ");
  if (!/\bargentina\b/i.test(joined)) {
    if (!/\b(caba|buenos aires|gba|amba)\b/i.test(joined)) {
      parts.push("Buenos Aires");
    }
    parts.push("Argentina");
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parts.join(", "))}`;
}

export function detectCaras(text: string): string {
  if (/doble\s*faz|doble\s*cara|2\s*caras|dos\s*caras|bifaz/i.test(text)) {
    return "Doble";
  }
  if (/simple\s*faz|simple\s*cara|1\s*cara|una\s*cara|monofaz/i.test(text)) {
    return "Simple";
  }
  return "";
}

/**
 * Parsea specs comerciales desde name/description/metadata del inventario.
 * Prioriza metadata ya estructurada; completa desde texto libre del seed/import.
 */
export function parseUnitSpecs(unit: SpecSource): InventoryUnitSpecs {
  const meta = asMeta(unit.metadata);
  const blob = [unit.name, unit.description, unit.locationLabel, ...Object.values(meta)]
    .filter(Boolean)
    .join("\n");

  const medidaRaw =
    meta.medida ||
    firstMatch(blob, [
      /Medida\s*[:：]\s*([^\n]+)/i,
      /(\d+[.,]?\d*\s*m(?:ts)?\s*[x×]\s*\d+[.,]?\d*\s*m(?:ts)?)/i,
      /(\d+[.,]?\d*\s*[x×]\s*\d+[.,]?\d*\s*(?:mts|m)\b)/i,
    ]);
  const medida = medidaRaw ? cleanMedida(medidaRaw) : "";

  let visibilidad =
    meta.visibilidad ||
    firstMatch(blob, [
      /Visibilidad\s*[:：]\s*([^\n·]+)/i,
      /Visual\s*[:：]\s*([^\n]+)/i,
      /((?:Tr[aá]nsito|Transito)\s+hacia\s+[^\n·]+)/i,
      /(Hacia\s+[A-ZÁÉÍÓÚÑ][^\n·|]{3,60})/i,
      /Detalle\s+((?:Tr[aá]nsito|Transito)[^\n·]+)/i,
    ]);
  if (visibilidad) {
    visibilidad = cleanNoise(visibilidad)
      .replace(/^Visual\s*[:：]\s*/i, "")
      .replace(/^Detalle\s+/i, "")
      .replace(/\s+[\d.]{3,}\s*impactos?\s*(?:semanales|diarios|mensuales)?.*$/i, "")
      .replace(/\s+Impactos?\s+[\d.].*$/i, "")
      .trim();
  }
  // Si visual del meta trae precio, quedarse con la parte de dirección
  if (meta.visual && !meta.visibilidad) {
    const fromVisual = cleanNoise(meta.visual);
    if (fromVisual && (!visibilidad || visibilidad.length > fromVisual.length + 20)) {
      visibilidad = fromVisual;
    } else if (!visibilidad && fromVisual) {
      visibilidad = fromVisual;
    }
  }

  const caras =
    meta.caras ||
    detectCaras(blob) ||
    detectCaras(meta.medida || "") ||
    "";

  let impacto =
    meta.impacto ||
    firstMatch(blob, [
      /Impacto\s*[:：]\s*([^\n]+)/i,
      /Impactos?\s*[:：]?\s*([\d.]+(?:\s*impactos?)?(?:\s*(?:semanales|diarios|mensuales))?)/i,
      /([\d.]{4,}\s*impactos?\s*(?:semanales|diarios|mensuales)?)/i,
    ]);
  if (impacto && !/impacto/i.test(impacto)) {
    impacto = `${impacto} impactos`;
  }

  const frecuencia =
    meta.frecuencia ||
    firstMatch(blob, [
      /Frecuencia\s*[:：]\s*([^\n]+)/i,
      /(\d+\s*(?:pasadas|salidas)\s*diarias)/i,
      /(Participaci[oó]n\s+[^·\n]+)/i,
      /(\d+\s*min(?:utos)?(?:\s*por|\s*\/)\s*hora)/i,
      /(\d+\s*minutos?\s*diarios)/i,
    ]);

  const spot =
    meta.spot ||
    firstMatch(blob, [
      /Spot\s*[:：]\s*([^\n]+)/i,
      /(Spot\s+\d+[""″'′]?[^\n·|]*)/i,
      /(Comerciales?\s+\d+[""″'′]?[^\n·|]*)/i,
    ]);

  const encendido =
    meta.encendido ||
    firstMatch(blob, [
      /Encendido\s*[:：]\s*([^\n]+)/i,
      /(\d{1,2}[.:]\d{2}\s*a\s*\d{1,2}[.:]\d{2}\s*hs?)/i,
    ]);

  const resolucion =
    meta.resolucion ||
    firstMatch(blob, [
      /Resoluci[oó]n\s*[:：]\s*([^\n]+)/i,
      /(\d{3,5}\s*[x×]\s*\d{3,5}\s*px)/i,
    ]);

  const zona = meta.zona || "";

  const addressMapsUrl = mapsUrlFromLocation({
    locationLabel: unit.locationLabel,
    zona: zona || meta.zona,
  });
  const explicitMapsUrl =
    meta.mapsUrl && !isLatLngMapsUrl(meta.mapsUrl) ? meta.mapsUrl : undefined;
  const mapsUrl =
    addressMapsUrl ||
    explicitMapsUrl ||
    mapsUrlFromCoords(unit.latitude, unit.longitude);

  const isDigital =
    unit.format === "digital_ooh" || unit.format === "digital_package";

  const specs: InventoryUnitSpecs = {
    ...(medida ? { medida } : {}),
    ...(visibilidad ? { visibilidad } : {}),
    ...(caras ? { caras } : {}),
    ...(impacto ? { impacto } : {}),
    ...(encendido ? { encendido } : {}),
    ...(resolucion ? { resolucion } : {}),
    ...(zona ? { zona } : {}),
    ...(mapsUrl ? { mapsUrl } : {}),
  };

  if (isDigital) {
    if (frecuencia) specs.frecuencia = frecuencia;
    if (spot) specs.spot = spot;
  } else {
    // A veces spot/pasadas aparecen en estáticos del kit LED; si hay, guardar
    if (frecuencia) specs.frecuencia = frecuencia;
    if (spot) specs.spot = spot;
  }

  return specs;
}

/** Fusiona metadata existente + specs parseadas (sin pisar valores ya buenos). */
export function enrichMetadataWithSpecs(
  metadata: unknown,
  unit: SpecSource,
): Record<string, string> {
  const base = asMeta(metadata);
  const specs = parseUnitSpecs({ ...unit, metadata: base });
  const next: Record<string, string> = {};
  for (const [k, v] of Object.entries(base)) {
    if (v?.trim()) next[k] = v.trim();
  }

  const assign = (key: keyof InventoryUnitSpecs, value?: string) => {
    if (!value?.trim()) return;
    if (!next[key]?.trim()) next[key] = value.trim();
  };

  assign("medida", specs.medida);
  assign("visibilidad", specs.visibilidad);
  if (specs.visibilidad && (!next.visibilidad || next.visibilidad === next.visual)) {
    next.visibilidad = specs.visibilidad;
  }
  assign("caras", specs.caras);
  assign("impacto", specs.impacto);
  assign("frecuencia", specs.frecuencia);
  assign("spot", specs.spot);
  assign("encendido", specs.encendido);
  assign("resolucion", specs.resolucion);
  // Preferir siempre link por dirección: lat/lng en CABA suele caer en calle paralela.
  if (specs.mapsUrl) {
    if (!next.mapsUrl || isLatLngMapsUrl(next.mapsUrl)) {
      next.mapsUrl = specs.mapsUrl;
    }
  }

  if (specs.medida && next.medida && next.medida.length > 40) {
    next.medida = specs.medida;
  }

  return next;
}
