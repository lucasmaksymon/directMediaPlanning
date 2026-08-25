import type {
  InventoryUnitForPresentation,
  PresentationSlideInput,
} from "@/lib/presentations/types";
import { parseUnitSpecs } from "@/lib/inventory/unit-specs";

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
    location: unit.locationLabel,
    zona: specs.zona || meta.zona || "",
    medida: specs.medida || "",
    visibilidad: specs.visibilidad || "",
    caras: specs.caras || "",
    impacto: specs.impacto || "",
    frecuencia: specs.frecuencia || "",
    spot: specs.spot || "",
    encendido: specs.encendido || "",
    resolucion: specs.resolucion || "",
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
    frecuencia: specs.frecuencia || undefined,
    spot: specs.spot || undefined,
    encendido: specs.encendido || undefined,
    resolucion: specs.resolucion || undefined,
    mapsUrl: specs.mapsUrl || undefined,
  };
}

export function slideSpecRows(slide: {
  location?: string;
  zona?: string;
  medida?: string;
  visibilidad?: string;
  caras?: string;
  impacto?: string;
  frecuencia?: string;
  spot?: string;
  encendido?: string;
  resolucion?: string;
  mapsUrl?: string;
}): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];
  if (slide.location?.trim()) rows.push({ label: "Ubicación", value: slide.location.trim() });
  if (slide.medida?.trim()) rows.push({ label: "Medida", value: slide.medida.trim() });
  if (slide.visibilidad?.trim()) rows.push({ label: "Visibilidad", value: slide.visibilidad.trim() });
  if (slide.caras?.trim()) rows.push({ label: "Caras", value: slide.caras.trim() });
  if (slide.impacto?.trim()) rows.push({ label: "Impacto", value: slide.impacto.trim() });
  if (slide.frecuencia?.trim()) rows.push({ label: "Frecuencia", value: slide.frecuencia.trim() });
  if (slide.spot?.trim()) rows.push({ label: "Spot", value: slide.spot.trim() });
  if (slide.encendido?.trim()) rows.push({ label: "Encendido", value: slide.encendido.trim() });
  if (slide.resolucion?.trim()) rows.push({ label: "Resolución", value: slide.resolucion.trim() });
  if (slide.mapsUrl?.trim()) rows.push({ label: "Mapa", value: slide.mapsUrl.trim() });
  return rows;
}
