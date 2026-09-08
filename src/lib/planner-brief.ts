export type ChatMessage = { role: "user" | "assistant"; content: string };

export type ParsedPlannerBrief = {
  presupuesto: number | null;
  zonas: string[];
  esABC1: boolean;
  esJoven: boolean;
  esFamiliar: boolean;
  esMasivo: boolean;
  esLanzamiento: boolean;
  esTrafico: boolean;
  esNacional: boolean;
};

const ZONE_KEYWORDS = [
  "palermo",
  "belgrano",
  "recoleta",
  "microcentro",
  "san telmo",
  "retiro",
  "puerto madero",
  "caballito",
  "almagro",
  "villa crespo",
  "flores",
  "boedo",
  "núñez",
  "nuñez",
  "saavedra",
  "chacarita",
  "once",
  "congreso",
  "liniers",
  "mataderos",
  "barracas",
  "la boca",
  "caba",
  "capital federal",
  "gba",
  "zona norte",
  "zona sur",
  "zona oeste",
  "córdoba",
  "cordoba",
  "rosario",
  "mendoza",
];

export function parsePlannerBrief(messages: ChatMessage[]): ParsedPlannerBrief {
  const text = messages.map((m) => m.content).join(" ").toLowerCase();

  let presupuesto: number | null = null;
  const budgetRe = /(?:\$\s*)?([\d.,]+)\s*(millon(?:es)?|k\b|mil\b)?/gi;
  let bm: RegExpExecArray | null;
  while ((bm = budgetRe.exec(text)) !== null) {
    const raw = parseFloat(bm[1]!.replace(/\./g, "").replace(",", "."));
    if (Number.isNaN(raw) || raw <= 0) continue;
    const suffix = (bm[2] ?? "").toLowerCase();
    const n = suffix.startsWith("millon")
      ? raw * 1_000_000
      : suffix === "k" || suffix.startsWith("mil")
        ? raw * 1_000
        : raw;
    if (n >= 10_000) {
      presupuesto = n;
      break;
    }
  }

  const zonas = ZONE_KEYWORDS.filter((z) => text.includes(z));
  return {
    presupuesto,
    zonas,
    esABC1: /abc1|premium|lujo|ejecutiv|alta gama|vip|corporativ/.test(text),
    esJoven: /jov[e]|millennial|centennial|18.?35|18.?30|25.?35|estudiante/.test(text),
    esFamiliar: /famil|niño|hijo|hogar/.test(text),
    esMasivo: /masiv|popular|class[e ]? media|trabaj/.test(text),
    esLanzamiento: /lanzamiento|launch|nuevo producto|nueva línea|awareness|reconocimiento/.test(text),
    esTrafico: /tráfico|trafico|visita|local|restaurant|comercio|tienda/.test(text),
    esNacional: /nacional|federal|todo el país|todas las ciudades|interior/.test(text),
  };
}
