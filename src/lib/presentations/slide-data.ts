import type {
  InventoryUnitForPresentation,
  PresentationFieldKey,
  PresentationSlideInput,
  PresentationVisibleFields,
} from "@/lib/presentations/types";
import { PRESENTATION_FIELD_KEYS } from "@/lib/presentations/types";
import { parseUnitSpecs, cleanLocationLabel } from "@/lib/inventory/unit-specs";
import { normalizeImpactoDisplay } from "@/lib/inventory/impacto";
import { formatArs } from "@/lib/format";

function formatCostoMensual(amount?: string | number | null): string {
  if (amount == null || amount === "") return "";
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 1) return "";
  return formatArs(n);
}

export function extractUnitSpecs(unit: InventoryUnitForPresentation) {
  const specs = parseUnitSpecs({
    name: unit.name,
    description: unit.description,
    locationLabel: unit.locationLabel,
    format: unit.format,
    latitude: unit.latitude,
    longitude: unit.longitude,
    metadata: unit.metadata,
  });

  const meta =
    unit.metadata && typeof unit.metadata === "object"
      ? (unit.metadata as Record<string, string>)
      : {};

  const tipo = (meta.tipo && String(meta.tipo).trim()) || "";
  const slideTitle = tipo
    ? tipo
    : unit.format === "digital_ooh" || unit.format === "digital_package"
      ? "Pantalla LED"
      : "Espacio OOH";

  return {
    slideTitle,
    location: cleanLocationLabel(unit.locationLabel) || unit.locationLabel,
    zona: specs.zona || meta.zona || "",
    medida: specs.medida || "",
    visibilidad: specs.visibilidad || "",
    caras: specs.caras || "",
    impacto: specs.impacto ? normalizeImpactoDisplay(specs.impacto).impacto : "",
    impactoPeriodo: specs.impacto
      ? normalizeImpactoDisplay(specs.impacto).periodo
      : undefined,
    frecuencia: specs.frecuencia || "",
    spot: specs.spot || "",
    encendido: specs.encendido || "",
    resolucion: specs.resolucion || "",
    pauta: specs.pauta || meta.pauta || "Mensual",
    costoMensual:
      formatCostoMensual(unit.basePriceAmount) || specs.costoMensual || meta.costoMensual || "",
    mapsUrl: specs.mapsUrl || "",
  };
}

export function unitToSlideDefaults(unit: InventoryUnitForPresentation): PresentationSlideInput {
  const specs = extractUnitSpecs(unit);
  return {
    unitId: unit.id,
    slideTitle: specs.slideTitle,
    location: specs.location,
    zona: specs.zona || undefined,
    medida: specs.medida || undefined,
    visibilidad: specs.visibilidad || undefined,
    caras: specs.caras || undefined,
    impacto: specs.impacto || undefined,
    impactoPeriodo: specs.impactoPeriodo || undefined,
    frecuencia: specs.frecuencia || undefined,
    spot: specs.spot || undefined,
    encendido: specs.encendido || undefined,
    resolucion: specs.resolucion || undefined,
    pauta: specs.pauta || undefined,
    costoMensual: specs.costoMensual || undefined,
    mapsUrl: specs.mapsUrl || undefined,
  };
}

export const PRESENTATION_FIELD_LABELS: Record<PresentationFieldKey, string> = {
  zona: "Zona",
  location: "Ubicación",
  medida: "Medida",
  visibilidad: "Visibilidad",
  caras: "Caras",
  impacto: "Impacto",
  frecuencia: "Frecuencia",
  spot: "Spot",
  encendido: "Encendido",
  resolucion: "Resolución",
  pauta: "Pauta",
  costoMensual: "Costo",
  mapsUrl: "Mapa",
};

export function defaultVisibleFields(): Record<PresentationFieldKey, boolean> {
  return Object.fromEntries(PRESENTATION_FIELD_KEYS.map((key) => [key, true])) as Record<
    PresentationFieldKey,
    boolean
  >;
}

export function isFieldVisible(
  visible: PresentationVisibleFields | undefined,
  key: PresentationFieldKey,
) {
  return visible?.[key] !== false;
}

export function normalizeVisibleFields(
  input?: PresentationVisibleFields | null,
): Record<PresentationFieldKey, boolean> {
  const out = defaultVisibleFields();
  if (!input) return out;
  for (const key of PRESENTATION_FIELD_KEYS) {
    if (typeof input[key] === "boolean") out[key] = input[key]!;
  }
  return out;
}

const SPEC_ROW_FIELDS = [
  ["location", "Ubicación"],
  ["medida", "Medida"],
  ["visibilidad", "Visibilidad"],
  ["caras", "Caras"],
  ["impacto", "Impacto"],
  ["frecuencia", "Frecuencia"],
  ["spot", "Spot"],
  ["encendido", "Encendido"],
  ["resolucion", "Resolución"],
  ["pauta", "Pauta"],
  ["costoMensual", "Costo Mensual"],
  ["mapsUrl", "Mapa"],
] as const satisfies ReadonlyArray<readonly [PresentationFieldKey, string]>;

export function slideSpecRows(
  slide: {
    location?: string;
    zona?: string;
    medida?: string;
    visibilidad?: string;
    caras?: string;
    impacto?: string;
    impactoPeriodo?: string;
    frecuencia?: string;
    spot?: string;
    encendido?: string;
    resolucion?: string;
    pauta?: string;
    costoMensual?: string;
    mapsUrl?: string;
  },
  visible?: PresentationVisibleFields,
): { key: PresentationFieldKey; label: string; value: string }[] {
  const rows: { key: PresentationFieldKey; label: string; value: string }[] = [];
  for (const [key, label] of SPEC_ROW_FIELDS) {
    const value = slide[key]?.trim();
    if (!value || !isFieldVisible(visible, key)) continue;
    rows.push({ key, label, value });
  }
  return rows;
}
