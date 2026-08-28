import { prisma } from "@/lib/prisma";

export type ErpPlazaOption = {
  province: string;
  cities: { id: string; name: string }[];
};

export type ErpCatalogSyncSummary = {
  provincesCreated: number;
  citiesCreated: number;
  currenciesCreated: number;
  renamed: number;
};

export type ErpElementSyncSummary = {
  created: number;
  renamed: number;
};

const ELEMENT_CANONICAL: Record<string, string> = {
  cpm: "CPM",
  mupis: "MUPIS",
  "pantalla led": "Pantalla LED",
  "refugios y chupetes": "Refugios y chupetes",
  sextuples: "Séxtuples",
  medianera: "Medianera",
  "camion led": "Camión LED",
  "totems led": "Tótems LED",
  "colocacion medianeras": "Colocación medianeras",
  vallado: "Vallado",
  "paquete mupis": "Paquete MUPIS",
  "mupis y kioscos led": "MUPIS y kioscos LED",
  "produccion ppls": "Producción PPLS",
  "campana digital": "Campaña digital",
  "max 2": "MAX 2",
  "bocas subte digitales": "Bocas subte digitales",
  "bocas subte estaticas": "Bocas subte estáticas",
  "boca subte digital exclusiva": "Boca subte digital exclusiva",
  columna: "Columna",
};

export function canonicalizeErpElement(raw: string) {
  const trimmed = raw.replace(/\s+/g, " ").trim();
  if (!trimmed) return "";
  return ELEMENT_CANONICAL[fold(trimmed)] ?? trimmed;
}

const CURRENCY_NAMES: Record<string, string> = {
  ARS: "Peso argentino",
  USD: "Dólar",
  EUR: "Euro",
  UYU: "Peso uruguayo",
  BRL: "Real",
  CLP: "Peso chileno",
};

/** Aliases de GESTIÓN / Excel → plaza canónica. */
const PLAZA_ALIASES: Record<string, { province: string; city: string }> = {
  CABA: { province: "CABA", city: "CABA" },
  VL: { province: "Buenos Aires", city: "Vicente López" },
  "VICENTE LOPEZ": { province: "Buenos Aires", city: "Vicente López" },
  "VICENTE LÓPEZ": { province: "Buenos Aires", city: "Vicente López" },
  SI: { province: "Buenos Aires", city: "San Isidro" },
  "SAN ISIDRO": { province: "Buenos Aires", city: "San Isidro" },
  ROSARIO: { province: "Santa Fe", city: "Rosario" },
  MENDOZA: { province: "Mendoza", city: "Mendoza" },
  "ZONA SUR": { province: "Buenos Aires", city: "Zona Sur" },
  "ZONA NORTE": { province: "Buenos Aires", city: "Zona Norte" },
  "ZONA OESTE": { province: "Buenos Aires", city: "Zona Oeste" },
  "PAQUETE CABA": { province: "CABA", city: "CABA" },
};

const LOCATION_RENAMES: Record<string, string> = {
  VL: "Vicente López",
  SI: "San Isidro",
  "SAN ISIDRO": "San Isidro",
  "VICENTE LOPEZ": "Vicente López",
  ROSARIO: "Rosario",
  MENDOZA: "Mendoza",
  "ZONA SUR": "Zona Sur",
  "ZONA NORTE": "Zona Norte",
  "ZONA OESTE": "Zona Oeste",
  "PAQUETE CABA": "CABA",
};

function fold(s: string) {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function looksLikeStreet(raw: string) {
  const s = raw.trim();
  if (/\d/.test(s)) return true;
  if (/\b(y|e)\b/i.test(s) && s.includes(" ")) return true;
  if (/^(av\.?|au\.?|calle|km)\b/i.test(s)) return true;
  return false;
}

function parseInventoryZona(zona: string): { province: string; city: string } | null {
  const raw = zona.replace(/\s+/g, " ").trim();
  if (!raw) return null;
  const alias = PLAZA_ALIASES[raw.toUpperCase()];
  if (alias) return alias;

  const folded = fold(raw);
  if (folded === "caba" || folded.includes("ciudad autonoma")) {
    return { province: "CABA", city: "CABA" };
  }
  if (folded.includes("etcheverry") || folded.includes("la plata")) {
    return { province: "Buenos Aires", city: "La Plata" };
  }
  if (folded.includes("rosario")) return { province: "Santa Fe", city: "Rosario" };
  if (folded.includes("mendoza") && !folded.includes("buenos")) {
    return { province: "Mendoza", city: "Mendoza" };
  }

  const city = raw.replace(/\s*\([^)]*\)\s*/g, "").trim() || raw;
  return { province: "Buenos Aires", city };
}

async function ensureProvince(name: string, cache: Map<string, { id: string; name: string }>) {
  const key = fold(name);
  const hit = cache.get(key);
  if (hit) return hit;
  const existing = await prisma.erpProvince.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  });
  const row = existing ?? (await prisma.erpProvince.create({ data: { name, estado: 1 } }));
  cache.set(fold(row.name), row);
  return row;
}

async function ensureCity(
  provinceId: string,
  name: string,
  cache: Set<string>,
) {
  const key = `${provinceId}:${fold(name)}`;
  if (cache.has(key)) return;
  const existing = await prisma.erpCity.findFirst({
    where: { provinceId, name: { equals: name, mode: "insensitive" } },
  });
  if (!existing) await prisma.erpCity.create({ data: { provinceId, name, estado: 1 } });
  cache.add(key);
}

export async function listErpPlazasForSelect(): Promise<ErpPlazaOption[]> {
  const provinces = await prisma.erpProvince.findMany({
    where: { estado: 1 },
    orderBy: { name: "asc" },
    include: { cities: { where: { estado: 1 }, orderBy: { name: "asc" } } },
  });
  return provinces
    .filter((p) => p.cities.length > 0)
    .map((p) => ({
      province: p.name,
      cities: p.cities.map((c) => ({ id: c.id, name: c.name })),
    }));
}

export async function syncErpCatalogFromInventory(): Promise<ErpCatalogSyncSummary> {
  const [units, companies, itemLocs, lineLocs] = await Promise.all([
    prisma.inventoryUnit.findMany({
      select: { currency: true, metadata: true },
    }),
    prisma.erpCompany.findMany({ select: { currency: true } }),
    prisma.erpCampaignItem.findMany({ select: { location: true } }),
    prisma.erpGestionLine.findMany({ select: { location: true } }),
  ]);

  const plazas = new Map<string, { province: string; city: string }>();
  const addPlaza = (province: string, city: string) => {
    plazas.set(`${fold(province)}:${fold(city)}`, { province, city });
  };

  for (const u of units) {
    const meta = (u.metadata ?? {}) as Record<string, unknown>;
    const zona = typeof meta.zona === "string" ? meta.zona : "";
    const parsed = parseInventoryZona(zona);
    if (parsed) addPlaza(parsed.province, parsed.city);
  }

  for (const loc of [...itemLocs, ...lineLocs]) {
    const raw = loc.location?.trim() ?? "";
    if (!raw || looksLikeStreet(raw)) continue;
    const alias = PLAZA_ALIASES[raw.toUpperCase()];
    if (alias) addPlaza(alias.province, alias.city);
  }

  const provinceCache = new Map<string, { id: string; name: string }>();
  const cityCache = new Set<string>();
  const existingProvinces = await prisma.erpProvince.findMany();
  for (const p of existingProvinces) provinceCache.set(fold(p.name), p);
  const existingCities = await prisma.erpCity.findMany({ select: { provinceId: true, name: true } });
  for (const c of existingCities) cityCache.add(`${c.provinceId}:${fold(c.name)}`);

  let provincesCreated = 0;
  let citiesCreated = 0;

  for (const { province, city } of plazas.values()) {
    const hadProvince = provinceCache.has(fold(province));
    const p = await ensureProvince(province, provinceCache);
    if (!hadProvince) provincesCreated += 1;
    const before = cityCache.size;
    await ensureCity(p.id, city, cityCache);
    if (cityCache.size > before) citiesCreated += 1;
  }

  const codes = new Set<string>();
  for (const u of units) {
    const code = u.currency.trim().toUpperCase();
    if (code) codes.add(code);
  }
  for (const c of companies) {
    const code = c.currency.trim().toUpperCase();
    if (code) codes.add(code);
  }
  codes.add("ARS");

  let currenciesCreated = 0;
  for (const code of codes) {
    const existing = await prisma.erpCurrency.findFirst({
      where: { code: { equals: code, mode: "insensitive" } },
    });
    if (existing) continue;
    await prisma.erpCurrency.create({
      data: {
        code,
        name: CURRENCY_NAMES[code] ?? code,
        rate: 1,
        estado: 1,
      },
    });
    currenciesCreated += 1;
  }

  let renamed = 0;
  for (const [from, to] of Object.entries(LOCATION_RENAMES)) {
    const [items, lines] = await Promise.all([
      prisma.erpCampaignItem.updateMany({ where: { location: from }, data: { location: to } }),
      prisma.erpGestionLine.updateMany({ where: { location: from }, data: { location: to } }),
    ]);
    renamed += items.count + lines.count;
  }

  return { provincesCreated, citiesCreated, currenciesCreated, renamed };
}

export async function listErpElementsForSelect() {
  return prisma.erpElement.findMany({
    where: { estado: 1 },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export async function syncErpElementsFromCampaigns(): Promise<ErpElementSyncSummary> {
  const [items, lines] = await Promise.all([
    prisma.erpCampaignItem.findMany({ select: { element: true } }),
    prisma.erpGestionLine.findMany({ select: { element: true } }),
  ]);

  const names = new Map<string, string>();
  for (const row of [...items, ...lines]) {
    const canonical = canonicalizeErpElement(row.element ?? "");
    if (!canonical) continue;
    names.set(fold(canonical), canonical);
  }

  const existing = await prisma.erpElement.findMany();
  const byFold = new Map(existing.map((e) => [fold(e.name), e]));

  let created = 0;
  for (const name of names.values()) {
    if (byFold.has(fold(name))) continue;
    const row = await prisma.erpElement.create({ data: { name, estado: 1 } });
    byFold.set(fold(row.name), row);
    created += 1;
  }

  let renamed = 0;
  const seen = new Set<string>();
  for (const row of [...items, ...lines]) {
    const raw = (row.element ?? "").trim();
    if (!raw || seen.has(raw)) continue;
    seen.add(raw);
    const canonical = canonicalizeErpElement(raw);
    if (!canonical || canonical === raw) continue;
    const [a, b] = await Promise.all([
      prisma.erpCampaignItem.updateMany({ where: { element: raw }, data: { element: canonical } }),
      prisma.erpGestionLine.updateMany({ where: { element: raw }, data: { element: canonical } }),
    ]);
    renamed += a.count + b.count;
  }

  return { created, renamed };
}
