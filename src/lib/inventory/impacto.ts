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

/** Miles argentinos: 405.340 / 1.461.249. Evita códigos (1124) y medidas (12.2, 21.40). */
const KIT_THOUSANDS = /(\d{1,3}(?:\.\d{3})+)/;

const KIT_IMPACTO_PATTERNS: RegExp[] = [
  /Impactos?\s*semanales\s*[:：]\s*(\d{1,3}(?:\.\d{3})+)/i,
  /Impactos?\s*[:：]\s*(\d{1,3}(?:\.\d{3})+)/i,
  /Impactos?\s*[/:]?\s*(?:c[oó]d(?:igo)?|valor)\s+(\d{1,3}(?:\.\d{3})+)/i,
  /Impactos?\s+(\d{1,3}(?:\.\d{3})+)/i,
  /Cobertura\s*neta\s*[:：]?\s*(\d{1,3}(?:\.\d{3})+)/i,
  /(\d{1,3}(?:\.\d{3})+)\s*impactos?/i,
];

function periodoNear(text: string, index: number, matched: string): ImpactoPeriodo {
  const window = text.slice(Math.max(0, index - 24), index + matched.length + 48);
  return detectImpactoPeriodo(window) || detectImpactoPeriodo(matched) || "semanal";
}

/**
 * Lee el impacto que ya declaró el medio en el kit (no estima).
 * Cubre "Impactos semanales: 1.461.249", "Impactos / Código 405.340",
 * "Impactos / Valor 741.760 THP" y "Cobertura neta: 1.137.381".
 */
export function extractKitImpacto(
  text: string,
): { impacto: string; periodo: ImpactoPeriodo } | null {
  const raw = text || "";
  if (!raw.trim()) return null;
  for (const re of KIT_IMPACTO_PATTERNS) {
    re.lastIndex = 0;
    const m = raw.match(re);
    if (!m?.[1] || !KIT_THOUSANDS.test(m[1])) continue;
    const num = parseImpactoNumber(m[1]);
    if (!num || num < 10_000) continue;
    const periodo = periodoNear(raw, m.index ?? 0, m[0]);
    return { impacto: formatImpacto(num, periodo), periodo };
  }
  return null;
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
