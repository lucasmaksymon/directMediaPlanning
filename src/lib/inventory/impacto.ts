export type ImpactoPeriodo = "diario" | "semanal" | "mensual";

export const IMPACTO_PERIODO_LABEL: Record<ImpactoPeriodo, string> = {
  diario: "diarios",
  semanal: "semanales",
  mensual: "mensuales",
};

export function detectImpactoPeriodo(text: string): ImpactoPeriodo | "" {
  const t = (text || "").toLowerCase();
  if (/mensual/.test(t)) return "mensual";
  if (/diari/.test(t)) return "diario";
  if (/semanal/.test(t)) return "semanal";
  return "";
}

export function parseImpactoNumber(text: string): number | null {
  const t = (text || "").replace(/\s/g, "");
  const m = t.match(/(\d{1,3}(?:\.\d{3})+|\d{4,})/);
  if (!m) return null;
  const n = Number(m[1].replace(/\./g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function formatImpacto(count: number, periodo: ImpactoPeriodo): string {
  const n = Math.round(count).toLocaleString("es-AR");
  return `${n} impactos ${IMPACTO_PERIODO_LABEL[periodo]}`;
}

/** Deja el impacto con número + periodicidad (default: semanal, como el catálogo). */
export function normalizeImpactoDisplay(raw: string): { impacto: string; periodo: ImpactoPeriodo } {
  const periodo = detectImpactoPeriodo(raw) || "semanal";
  const num = parseImpactoNumber(raw);
  if (num) return { impacto: formatImpacto(num, periodo), periodo };
  const trimmed = (raw || "").trim();
  if (!trimmed) return { impacto: "", periodo };
  if (detectImpactoPeriodo(trimmed)) return { impacto: trimmed, periodo };
  return { impacto: `${trimmed} ${IMPACTO_PERIODO_LABEL[periodo]}`, periodo };
}

export function applyImpactoPeriodo(impacto: string, periodo: ImpactoPeriodo): string {
  const num = parseImpactoNumber(impacto);
  if (num) return formatImpacto(num, periodo);
  const without = (impacto || "")
    .replace(/\s*(impactos?\s*)?(diarios|semanales|mensuales)\s*$/i, "")
    .trim();
  return without ? `${without} ${IMPACTO_PERIODO_LABEL[periodo]}` : "";
}
