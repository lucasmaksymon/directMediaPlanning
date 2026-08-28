/**
 * Importa ubicaciones desde media kits de Google Slides (Sarmiento + InKuesto Media).
 * Extrae slides con dirección, copia fotos a public/inventory y las publica en la DB
 * (sin wipe). También fusiona en prisma/data/drive-inventory.json.
 *
 * Uso: npx tsx scripts/import-slides-kits.ts
 *      DRY_RUN=1 npx tsx scripts/import-slides-kits.ts
 */
import * as fs from "fs";
import * as path from "path";
import { execFileSync } from "child_process";
import {
  InventoryFormat,
  InventoryStatus,
  PriceModel,
  Prisma,
  PrismaClient,
} from "@prisma/client";
import {
  cleanInventoryUnitName,
  cleanLocationLabel,
  enrichMetadataWithSpecs,
} from "../src/lib/inventory/unit-specs";

const prisma = new PrismaClient();
const WORK = path.join(process.cwd(), ".tmp", "slides-import");
const OUT_JSON = path.join(process.cwd(), "prisma", "data", "drive-inventory.json");
const DRY_RUN = process.env.DRY_RUN === "1";

const KITS = [
  {
    file: path.join(WORK, "pres1.pptx"),
    providerName: "SARMIENTO",
    source: "slides-sarmiento",
    sourceFile: "Google Slides / SARMIENTO columnas Buenos Aires",
  },
  {
    file: path.join(WORK, "pres2.pptx"),
    providerName: "INKUESTO MEDIA",
    source: "slides-inkuesto",
    sourceFile: "Google Slides / InKuesto Media kit",
  },
] as const;

type ParsedUnit = {
  providerName: string;
  name: string;
  locationLabel: string;
  description: string;
  format: "digital_ooh" | "static_ooh" | "digital_package";
  basePriceAmount: string;
  priceModel: "fixed_list" | "negotiable" | "package";
  status: "published" | "draft";
  imagePath: string | null;
  sourceFile: string;
  metadata: Record<string, string>;
};

type RawSlide = {
  slideNum: number;
  tipo: string;
  locationLabel: string;
  zona: string;
  medida: string;
  cobertura: string;
  impacto: string;
  imageSrc: string | null;
};

function slug(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function norm(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const NOISE = new Set(
  [
    "#ooh",
    "www.sarmiento.net",
    "www.inkuestomedia.ar",
    "www.grupocem.ar",
    "www.sarmiento.net",
    "|",
    "elementos",
    "mediakit",
    "ver mapa",
    "cobertura neta",
    "impactos",
    "(*datos semanales)",
    "medida",
    "medidas",
    "inkuesto media",
    "buenos aires",
    "columnas - bs. as.",
    "frontlight - bs. as.",
    "medianeras - bs. as.",
    "grandes formatos - bs. as.",
    "grandes formatos - mdq",
    "frontlight - mdq",
    "grandes formatos",
    "columnas -",
    "frontlight -",
    "medianeras",
  ].map(norm),
);

const TIPO_ALIASES: { test: RegExp; tipo: string; format: ParsedUnit["format"] }[] = [
  { test: /mural\s*\+\s*front/i, tipo: "Mural + Front", format: "static_ooh" },
  { test: /gran\s*formato\s*led|gf\s*led/i, tipo: "LED", format: "digital_ooh" },
  { test: /columnas?\s*bifaz/i, tipo: "Columna bifaz", format: "static_ooh" },
  { test: /^columnas?$/i, tipo: "Columna", format: "static_ooh" },
  { test: /frontlight/i, tipo: "Frontlight", format: "static_ooh" },
  { test: /medianeras?/i, tipo: "Medianera", format: "static_ooh" },
];

const OFFICE_NOISE = /salguero\s*3450/i;

function isNoise(t: string) {
  const n = norm(t);
  if (!n || NOISE.has(n)) return true;
  if (/^www\./i.test(t)) return true;
  if (/^oficinas comerciales/i.test(t)) return true;
  if (/derechos reservados/i.test(t)) return true;
  if (/^info@/i.test(t)) return true;
  return false;
}

function isTipoToken(t: string) {
  return TIPO_ALIASES.some((a) => a.test.test(t.trim()));
}

function classifyTipo(texts: string[]): { tipo: string; format: ParsedUnit["format"] } {
  const blob = texts.join("\n");
  for (const a of TIPO_ALIASES) {
    if (a.test.test(blob)) return { tipo: a.tipo, format: a.format };
  }
  return { tipo: "OOH", format: "static_ooh" };
}

function isCityLine(t: string) {
  const s = t.replace(/^[–—\-]\s*/, "").trim();
  return (
    /^(ciudad de\s+)?buenos aires\b/i.test(s) ||
    /mar del plata/i.test(s) ||
    /,\s*(buenos aires|caba)\b/i.test(s) ||
    /^(caba|vicente l[oó]pez|pilar|moreno|berazategui|ciudadela|tortuguitas|castelli|dolores|tres de febrero|fcio\.?\s*varela|florencio varela)\b/i.test(
      s,
    )
  );
}

function zonaFromCity(t: string) {
  const s = t.replace(/^[–—\-]\s*/, "").trim();
  const n = norm(s);
  if (/ciudad de buenos aires|^\s*caba\b/.test(n)) return "CABA";
  if (/mar del plata/.test(n)) return "Mar del Plata";
  if (/vicente lopez/.test(n)) return "Vicente López";
  if (/fcio|florencio varela/.test(n)) return "Florencio Varela";
  if (/berazategui/.test(n)) return "Berazategui";
  if (/tortuguitas/.test(n)) return "Tortuguitas";
  if (/ciudadela/.test(n)) return "Ciudadela";
  if (/tres de febrero/.test(n)) return "Tres de Febrero";
  if (/pilar/.test(n)) return "Pilar";
  if (/moreno/.test(n)) return "Moreno";
  if (/castelli/.test(n)) return "Castelli";
  if (/dolores/.test(n)) return "Dolores";
  if (/buenos aires/.test(n)) return "Buenos Aires";
  const city = s.split(",")[0]?.trim();
  return city || "Buenos Aires";
}

function looksLikeLocation(t: string) {
  if (isNoise(t) || isTipoToken(t) || isCityLine(t)) return false;
  if (OFFICE_NOISE.test(t)) return false;
  if (!/[a-záéíóúñ]/i.test(t)) return false;
  if (/^(tel[oó]n|coronamiento|ochava|mural|frontlight)\s*:/i.test(t)) return false;
  if (/^\d+[.,]?\d*\s*[x×]/i.test(t)) return false;
  if (/^[x×]\s*\d/i.test(t)) return false;
  if (/^(km|cara|sentido|mano)\b/i.test(t) && t.length < 8) return false;
  return (
    /\b(av\.?|au\.?|autopista|ruta|colectora|calle|gral\.?|general|puente|rotonda|acceso|panamericana|kdt)\b/i.test(
      t,
    ) ||
    /\b(av|au)\.\s+/i.test(t) ||
    /\bkm\.?\s*\d/i.test(t) ||
    /\d/.test(t) ||
    /\s+y\s+/i.test(t) ||
    /\b(lugones|illia|cantilo|libertador|callao|cerrito|sarmiento|udaondo|olaz[aá]bal|gaona|hornos|figueroa|cramer|gorriti|cabrera|balb[ií]n)\b/i.test(
      t,
    )
  );
}

function isLocationContinuation(prev: string, next: string) {
  if (isNoise(next) || isTipoToken(next) || isCityLine(next)) return false;
  if (/^(medida|medidas|cobertura|impactos)$/i.test(next)) return false;
  const p = prev.trim();
  const n = next.trim();
  if (/^[(|]/.test(n)) return true;
  if (/^kdt\b/i.test(n)) return true;
  if (/[|\-–—yY]\s*$/.test(p)) return true;
  if (/^(av|au)\.?\s*$/i.test(p)) return true;
  if (/^\d{2,5}$/.test(n) && /[a-záéíóúñ]/i.test(p)) return true;
  if (/^\([^)]+\)$/.test(n)) return true;
  return false;
}

function stitchLocation(parts: string[]) {
  let s = "";
  for (const raw of parts) {
    const p = raw.replace(/^\|\s*/, "").trim();
    if (!p) continue;
    if (!s) {
      s = p;
      continue;
    }
    if (/^[(|]/.test(p) || /[|\-–—]\s*$/.test(s) || /^(av|au)\.?\s*$/i.test(s) || /\s+y\s*$/i.test(s)) {
      s = `${s.replace(/\s+$/, "")} ${p}`.replace(/\s+/g, " ");
    } else if (/^\d{2,5}$/.test(p)) {
      s = `${s} ${p}`;
    } else {
      s = `${s} ${p}`;
    }
  }
  return s.replace(/\s*[|\-–—]+\s*$/g, "").replace(/\s+/g, " ").trim();
}

function pickLocation(texts: string[]): { location: string; zona: string } {
  const candidates: string[] = [];
  let zona = "";
  for (let i = 0; i < texts.length; i++) {
    const t = texts[i];
    if (isCityLine(t) && !zona) zona = zonaFromCity(t);
    if (!looksLikeLocation(t)) continue;
    const parts = [t];
    let j = i + 1;
    while (j < texts.length && isLocationContinuation(parts[parts.length - 1], texts[j])) {
      parts.push(texts[j]);
      j++;
    }
    const loc = stitchLocation(parts);
    if (loc.length >= 6 && !OFFICE_NOISE.test(loc)) candidates.push(loc);
    i = j - 1;
  }
  const scored = candidates
    .map((c) => {
      let score = c.length;
      if (/\b(av\.?|au\.?|autopista|ruta|colectora|km)\b/i.test(c)) score += 20;
      if (/\b(cara|sentido)\b/i.test(c)) score += 8;
      return { c, score };
    })
    .sort((a, b) => b.score - a.score);
  return { location: scored[0]?.c ?? "", zona };
}

function stitchMeasureChunk(parts: string[]) {
  let s = "";
  for (const raw of parts) {
    const p = raw.trim();
    if (!p) continue;
    if (!s) {
      s = p;
      continue;
    }
    const last = s[s.length - 1];
    const first = p[0];
    if ((/\d/.test(last) || last === "," || last === ".") && /\d/.test(first)) s += p;
    else s += ` ${p}`;
  }
  return s
    .replace(/\s*[x×]\s*/g, " x ")
    .replace(/\s+m\b/gi, " m")
    .replace(/\s+/g, " ")
    .trim();
}

function parseMedida(texts: string[]): string {
  const start = texts.findIndex((t) => /^(medida|medidas)$/i.test(t.trim()));
  if (start < 0) return "";
  const chunks: string[] = [];
  let buf: string[] = [];
  let label = "";
  const flush = () => {
    const body = stitchMeasureChunk(buf);
    buf = [];
    if (!body) return;
    chunks.push(label ? `${label} ${body}` : body);
    label = "";
  };
  for (let i = start + 1; i < texts.length; i++) {
    const t = texts[i].trim();
    if (
      isNoise(t) ||
      isTipoToken(t) ||
      isCityLine(t) ||
      looksLikeLocation(t) ||
      /^(cobertura|impactos)$/i.test(t)
    ) {
      break;
    }
    if (/:$/.test(t) && !/\d/.test(t)) {
      flush();
      label = t.replace(/:$/, "").trim();
      continue;
    }
    if (/^\d+[.,]?\d*\s*[x×]\s*\d+/i.test(t) && buf.length) {
      flush();
    }
    buf.push(t);
  }
  flush();
  return chunks.filter(Boolean).join("; ");
}

function fieldAfter(texts: string[], label: string) {
  const i = texts.findIndex((t) => t.trim().toLowerCase() === label.toLowerCase());
  if (i < 0) return "";
  const next = texts[i + 1]?.trim() ?? "";
  if (!next || isNoise(next) || isTipoToken(next)) return "";
  return next;
}

function isSectionSlide(texts: string[]) {
  const blob = texts.join(" ").toLowerCase();
  if (/oficinas comerciales/.test(blob)) return true;
  if (texts.some((t) => /^mediakit$/i.test(t))) return true;
  if (texts.some((t) => /^elementos$/i.test(t))) return true;
  if (/ver mapa/i.test(blob) && !texts.some(looksLikeLocation)) return true;
  const meaningful = texts.filter((t) => !isNoise(t) && !isCityLine(t) && !isTipoToken(t));
  return meaningful.length === 0;
}

function hasCaraOrSentido(label: string) {
  return /\b(cara|sentido|mano)\b/i.test(label);
}

function baseLocationKey(label: string) {
  return norm(
    label
      .replace(/\((cara|sentido|mano)[^)]*\)/gi, " ")
      .replace(/\s*[|(]\s*(constituci[oó]n|ecoparque)\)?\s*$/i, "")
      .replace(/\b(sentido\s+(hacia|a|al)\s+[^|,-]+|cara\s+a\s+[^|,-]+|mano\s+al?\s+[^|,-]+)/gi, " ")
      .replace(/\s*[|\-–—]+\s*$/g, "")
      .replace(/\s+/g, " "),
  );
}

function extractPptx(pptxPath: string) {
  const tmpRoot = path.join(WORK, "unzip", slug(path.basename(pptxPath)));
  fs.rmSync(tmpRoot, { recursive: true, force: true });
  fs.mkdirSync(tmpRoot, { recursive: true });
  execFileSync("python", ["-c", "import zipfile,sys; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])", pptxPath, tmpRoot], {
    stdio: "ignore",
  });
  const slidesDir = path.join(tmpRoot, "ppt", "slides");
  const slides: { slideNum: number; texts: string[]; rels: string }[] = [];
  if (!fs.existsSync(slidesDir)) return { tmpRoot, slides };
  const files = fs
    .readdirSync(slidesDir)
    .filter((f) => /^slide\d+\.xml$/i.test(f))
    .sort((a, b) => Number(a.match(/\d+/)?.[0] || 0) - Number(b.match(/\d+/)?.[0] || 0));
  for (const f of files) {
    const slideNum = Number(f.match(/\d+/)?.[0] || 0);
    const xml = fs.readFileSync(path.join(slidesDir, f), "utf8");
    const texts = [...xml.matchAll(/<a:t[^>]*>([^<]*)<\/a:t>/g)]
      .map((m) =>
        m[1]
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .trim(),
      )
      .filter(Boolean);
    const relsPath = path.join(slidesDir, "_rels", `slide${slideNum}.xml.rels`);
    const rels = fs.existsSync(relsPath) ? fs.readFileSync(relsPath, "utf8") : "";
    slides.push({ slideNum, texts, rels });
  }
  return { tmpRoot, slides };
}

function pickSlideImage(tmpRoot: string, relsXml: string): string | null {
  const targets = [...relsXml.matchAll(/Target="([^"]+)"/g)].map((m) => m[1]);
  const mediaRels = targets
    .filter((t) => /media\//i.test(t))
    .map((t) => {
      const clean = t.replace(/^\.\.\//, "ppt/");
      const full = path.join(tmpRoot, clean.replace(/\//g, path.sep));
      const size = fs.existsSync(full) ? fs.statSync(full).size : 0;
      return { full, size, ext: path.extname(full).toLowerCase() };
    })
    .filter((x) => x.size > 15_000 && [".jpg", ".jpeg", ".png", ".webp"].includes(x.ext))
    .sort((a, b) => b.size - a.size);
  return mediaRels[0]?.full ?? null;
}

function parseRawSlides(pptxPath: string): RawSlide[] {
  const { tmpRoot, slides } = extractPptx(pptxPath);
  const raw: RawSlide[] = [];
  for (const slide of slides) {
    if (isSectionSlide(slide.texts)) continue;
    const { location, zona } = pickLocation(slide.texts);
    if (!location || location.length < 6) continue;
    const { tipo } = classifyTipo(slide.texts);
    raw.push({
      slideNum: slide.slideNum,
      tipo,
      locationLabel: cleanLocationLabel(location) || location,
      zona,
      medida: parseMedida(slide.texts),
      cobertura: fieldAfter(slide.texts, "Cobertura Neta"),
      impacto: fieldAfter(slide.texts, "Impactos"),
      imageSrc: pickSlideImage(tmpRoot, slide.rels),
    });
  }
  return raw;
}

function enrichFromGroup(s: RawSlide, list: RawSlide[]): RawSlide {
  const medida = s.medida || list.find((x) => x.medida)?.medida || "";
  const cobertura = s.cobertura || list.find((x) => x.cobertura)?.cobertura || "";
  const impacto = s.impacto || list.find((x) => x.impacto)?.impacto || "";
  const tipo = s.tipo !== "OOH" ? s.tipo : list.find((x) => x.tipo && x.tipo !== "OOH")?.tipo || s.tipo;
  const zona = s.zona || list.find((x) => x.zona)?.zona || "";
  const bestImg =
    [...list].sort((a, b) => {
      const sa = a.imageSrc && fs.existsSync(a.imageSrc) ? fs.statSync(a.imageSrc).size : 0;
      const sb = b.imageSrc && fs.existsSync(b.imageSrc) ? fs.statSync(b.imageSrc).size : 0;
      return sb - sa;
    })[0]?.imageSrc ?? null;
  return {
    ...s,
    tipo,
    zona,
    medida,
    cobertura,
    impacto,
    imageSrc: s.imageSrc || bestImg,
  };
}

function mergeRawSlides(raw: RawSlide[]): RawSlide[] {
  const groups = new Map<string, RawSlide[]>();
  for (const s of raw) {
    const key = baseLocationKey(s.locationLabel);
    const list = groups.get(key) ?? [];
    list.push(s);
    groups.set(key, list);
  }
  const out: RawSlide[] = [];
  for (const list of groups.values()) {
    const withCara = list.filter((s) => hasCaraOrSentido(s.locationLabel));
    const pool = withCara.length ? withCara : list;
    const unique = new Map<string, RawSlide>();
    for (const s of pool) {
      const key = norm(s.locationLabel);
      const prev = unique.get(key);
      if (!prev || (s.medida && !prev.medida) || s.slideNum < prev.slideNum) {
        unique.set(key, enrichFromGroup(s, list));
      }
    }
    out.push(...unique.values());
  }
  return collapseNearDuplicates(out.sort((a, b) => a.slideNum - b.slideNum));
}

const IGNORE_TOKENS = new Set([
  "av",
  "au",
  "de",
  "la",
  "el",
  "y",
  "int",
  "sn",
  "cara",
  "sentido",
  "mano",
  "hacia",
  "al",
  "a",
]);

function locationTokens(label: string) {
  return new Set(
    norm(label)
      .replace(/\bmano\b/g, "sentido")
      .replace(/[^a-z0-9.,\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t && !IGNORE_TOKENS.has(t)),
  );
}

function tokensSubset(a: Set<string>, b: Set<string>) {
  if (!a.size || !b.size) return false;
  return [...a].every((t) => b.has(t));
}

function sameCaraFace(a: string, b: string) {
  const canon = (s: string) =>
    norm(s)
      .replace(/\bmano\b/g, "sentido")
      .replace(/\bsentido al\b/g, "sentido hacia");
  return canon(a) === canon(b);
}

function collapseNearDuplicates(list: RawSlide[]): RawSlide[] {
  const kept: RawSlide[] = [];
  for (const s of list) {
    const idx = kept.findIndex((k) => {
      if (norm(k.tipo) !== norm(s.tipo) && k.tipo !== "OOH" && s.tipo !== "OOH") return false;
      if (k.zona && s.zona && k.zona !== s.zona) return false;
      if (hasCaraOrSentido(k.locationLabel) && hasCaraOrSentido(s.locationLabel)) {
        return sameCaraFace(k.locationLabel, s.locationLabel);
      }
      const ta = locationTokens(k.locationLabel);
      const tb = locationTokens(s.locationLabel);
      return tokensSubset(ta, tb) || tokensSubset(tb, ta);
    });
    if (idx < 0) {
      kept.push(s);
      continue;
    }
    const prev = kept[idx];
    const prefer =
      (s.medida && !prev.medida) ||
      (s.tipo !== "OOH" && prev.tipo === "OOH") ||
      (hasCaraOrSentido(s.locationLabel) && !hasCaraOrSentido(prev.locationLabel)) ||
      s.locationLabel.length > prev.locationLabel.length;
    kept[idx] = prefer ? enrichFromGroup(s, [prev, s]) : enrichFromGroup(prev, [prev, s]);
    if (kept[idx].tipo === "OOH") kept[idx].tipo = s.tipo !== "OOH" ? s.tipo : prev.tipo;
  }
  return kept;
}

function toUnit(raw: RawSlide, kit: (typeof KITS)[number]): ParsedUnit {
  const locationLabel = cleanLocationLabel(raw.locationLabel) || raw.locationLabel.slice(0, 240);
  const format = classifyTipo([raw.tipo]).format;
  const name = cleanInventoryUnitName(
    [raw.tipo, raw.zona, locationLabel].filter(Boolean).join(" — "),
  ).slice(0, 180);
  const description = [
    raw.medida && `Medida: ${raw.medida}`,
    raw.cobertura && `Cobertura neta: ${raw.cobertura}`,
    raw.impacto && `Impactos: ${raw.impacto} (datos semanales)`,
  ]
    .filter(Boolean)
    .join("\n");
  const metadata = enrichMetadataWithSpecs(
    {
      tipo: raw.tipo,
      zona: raw.zona,
      medida: raw.medida,
      ...(raw.cobertura ? { coberturaNeta: raw.cobertura } : {}),
      ...(raw.impacto ? { impacto: `${raw.impacto} semanales` } : {}),
      source: kit.source,
    },
    {
      name,
      description,
      locationLabel,
      format,
      metadata: { tipo: raw.tipo, zona: raw.zona, medida: raw.medida },
    },
  );
  return {
    providerName: kit.providerName,
    name: name || locationLabel.slice(0, 120),
    locationLabel,
    description,
    format,
    basePriceAmount: "1",
    priceModel: "negotiable",
    status: "published",
    imagePath: null,
    sourceFile: kit.sourceFile,
    metadata,
  };
}

function copyImage(src: string | null, providerName: string, name: string, slideNum: number) {
  if (!src || !fs.existsSync(src)) return null;
  const ext = path.extname(src).toLowerCase() || ".jpg";
  const destRel = path.posix.join(
    "inventory",
    slug(providerName),
    `${slug(name).slice(0, 60)}-s${slideNum}${ext}`,
  );
  const destAbs = path.join(process.cwd(), "public", destRel);
  fs.mkdirSync(path.dirname(destAbs), { recursive: true });
  fs.copyFileSync(src, destAbs);
  return "/" + destRel;
}

function mergeIntoDriveJson(units: ParsedUnit[]) {
  const incomingProviders = new Set(units.map((u) => u.providerName));
  let existing: { generatedAt?: string; count?: number; byProvider?: Record<string, number>; units: ParsedUnit[] } = {
    units: [],
  };
  if (fs.existsSync(OUT_JSON)) {
    existing = JSON.parse(fs.readFileSync(OUT_JSON, "utf8"));
  }
  const kept = (existing.units ?? []).filter((u) => !incomingProviders.has(u.providerName));
  const nextUnits = [...kept, ...units];
  const byProvider: Record<string, number> = {};
  for (const u of nextUnits) byProvider[u.providerName] = (byProvider[u.providerName] || 0) + 1;
  fs.writeFileSync(
    OUT_JSON,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        count: nextUnits.length,
        byProvider,
        units: nextUnits,
      },
      null,
      2,
    ),
    "utf8",
  );
  console.log(`JSON actualizado: ${OUT_JSON} (${nextUnits.length} unidades)`);
}

async function persistDb(units: ParsedUnit[]) {
  const providerNames = [...new Set(units.map((u) => u.providerName))];
  const providerIds = new Map<string, string>();
  for (const name of providerNames) {
    const existing = await prisma.providerProfile.findFirst({ where: { companyName: name } });
    if (existing) {
      providerIds.set(name, existing.id);
      continue;
    }
    const created = await prisma.providerProfile.create({
      data: { companyName: name, description: "Parque OOH — media kit 2026." },
    });
    providerIds.set(name, created.id);
    console.log(`Proveedor creado: ${name}`);
  }

  const sources = [...new Set(units.map((u) => u.metadata.source).filter(Boolean))];
  const stale = await prisma.inventoryUnit.findMany({
    where: { providerId: { in: [...providerIds.values()] } },
    select: { id: true, metadata: true },
  });
  const staleIds = stale
    .filter((u) => {
      const meta = u.metadata && typeof u.metadata === "object" ? (u.metadata as Record<string, string>) : {};
      return sources.includes(meta.source);
    })
    .map((u) => u.id);
  if (staleIds.length) {
    await prisma.circuitUnit.deleteMany({ where: { unitId: { in: staleIds } } });
    await prisma.availabilityBlock.deleteMany({ where: { unitId: { in: staleIds } } });
    await prisma.slotAvailability.deleteMany({ where: { unitId: { in: staleIds } } });
    await prisma.inventoryUnit.deleteMany({ where: { id: { in: staleIds } } });
    console.log(`Reemplazo ${staleIds.length} unidades previas de estos kits.`);
  }

  const formatMap = {
    digital_ooh: InventoryFormat.digital_ooh,
    static_ooh: InventoryFormat.static_ooh,
    digital_package: InventoryFormat.digital_package,
  };
  const batch: Prisma.InventoryUnitCreateManyInput[] = [];
  for (const u of units) {
    const providerId = providerIds.get(u.providerName);
    if (!providerId) continue;
    batch.push({
      providerId,
      name: u.name.slice(0, 200),
      format: formatMap[u.format] ?? InventoryFormat.static_ooh,
      locationLabel: u.locationLabel.slice(0, 240),
      description: u.description || null,
      basePriceAmount: new Prisma.Decimal(u.basePriceAmount || "1"),
      currency: "ARS",
      priceModel: PriceModel.negotiable,
      status: InventoryStatus.published,
      imageUrls: u.imagePath ? [u.imagePath] : [],
      metadata: u.metadata,
    });
  }
  if (batch.length) await prisma.inventoryUnit.createMany({ data: batch });
  console.log(`DB: ${batch.length} unidades publicadas (${providerNames.join(", ")}).`);
}

async function main() {
  const units: ParsedUnit[] = [];
  for (const kit of KITS) {
    if (!fs.existsSync(kit.file)) {
      throw new Error(`Falta ${kit.file}. Descargá el PPTX antes de importar.`);
    }
    console.log(`\n=== ${kit.providerName} ===`);
    const parsed = parseRawSlides(kit.file);
    console.log(`  slides con dirección: ${parsed.length}`);
    const merged = mergeRawSlides(parsed);
    for (const raw of merged) {
      const unit = toUnit(raw, kit);
      unit.imagePath = DRY_RUN ? (raw.imageSrc ? "(img)" : null) : copyImage(raw.imageSrc, kit.providerName, unit.name, raw.slideNum);
      units.push(unit);
      console.log(
        `  s${String(raw.slideNum).padStart(3, "0")}  ${unit.name}` +
          (raw.medida ? `  [${raw.medida}]` : "") +
          (unit.imagePath ? "  📷" : ""),
      );
    }
    console.log(`  → ${merged.length} ubicaciones`);
  }

  if (DRY_RUN) {
    console.log(`\nDRY_RUN: ${units.length} unidades, no se escribe JSON ni DB.`);
    return;
  }

  mergeIntoDriveJson(units);
  await persistDb(units);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
