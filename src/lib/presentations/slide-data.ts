import type {
  InventoryUnitForPresentation,
  PresentationSlideInput,
} from "@/lib/presentations/types";

type UnitMeta = {
  tipo?: string;
  zona?: string;
  medida?: string;
  visual?: string;
  valorRaw?: string;
  encendido?: string;
  exposicion?: string;
  resolucion?: string;
};

function asMeta(raw: unknown): UnitMeta {
  if (!raw || typeof raw !== "object") return {};
  return raw as UnitMeta;
}

function fieldFromText(text: string, labels: string[]): string {
  for (const label of labels) {
    const re = new RegExp(`${label}\\s*[:：]\\s*([^\\n]+)`, "i");
    const m = text.match(re);
    if (m?.[1]?.trim()) return m[1].trim();
  }
  return "";
}

export function extractUnitSpecs(unit: InventoryUnitForPresentation) {
  const meta = asMeta(unit.metadata);
  const blob = [unit.description ?? "", meta.visual ?? "", meta.medida ?? ""].join("\n");

  const medida =
    (meta.medida && meta.medida.trim()) ||
    fieldFromText(blob, ["Medida", "Medidas", "Tamaño", "Size"]) ||
    "";

  const encendido =
    (meta.encendido && String(meta.encendido).trim()) ||
    fieldFromText(blob, ["Encendido", "Horario", "Hours"]) ||
    "";

  const exposicion =
    (meta.exposicion && String(meta.exposicion).trim()) ||
    fieldFromText(blob, ["Exposición", "Exposicion", "Spot", "Pasadas"]) ||
    "";

  const resolucion =
    (meta.resolucion && String(meta.resolucion).trim()) ||
    fieldFromText(blob, ["Resolución", "Resolucion", "Resolution"]) ||
    "";

  const tipo = (meta.tipo && meta.tipo.trim()) || "";
  const slideTitle = tipo
    ? `${tipo.toUpperCase()}`
    : unit.format === "digital_ooh" || unit.format === "digital_package"
      ? "PANTALLA LED"
      : "ESPACIO OOH";

  return {
    slideTitle,
    location: unit.locationLabel,
    medida,
    encendido,
    exposicion,
    resolucion,
  };
}

export function unitToSlideDefaults(unit: InventoryUnitForPresentation): PresentationSlideInput {
  const specs = extractUnitSpecs(unit);
  return {
    unitId: unit.id,
    slideTitle: specs.slideTitle,
    location: specs.location,
    medida: specs.medida || undefined,
    encendido: specs.encendido || undefined,
    exposicion: specs.exposicion || undefined,
    resolucion: specs.resolucion || undefined,
  };
}

export function slideSpecRows(slide: {
  location?: string;
  medida?: string;
  encendido?: string;
  exposicion?: string;
  resolucion?: string;
}): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];
  if (slide.location?.trim()) rows.push({ label: "Ubicación", value: slide.location.trim() });
  if (slide.medida?.trim()) rows.push({ label: "Medida", value: slide.medida.trim() });
  if (slide.resolucion?.trim()) rows.push({ label: "Resolución", value: slide.resolucion.trim() });
  if (slide.encendido?.trim()) rows.push({ label: "Encendido", value: slide.encendido.trim() });
  if (slide.exposicion?.trim()) rows.push({ label: "Exposición", value: slide.exposicion.trim() });
  return rows;
}
