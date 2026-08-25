/**
 * Geocodifica locationLabel → lat/lng (Nominatim).
 * Varias variantes por dirección (número, intersección, barrio) + cache reanudable.
 *
 * Uso: npx tsx scripts/geocode-inventory.ts
 *      CLEAR_MISSES=1 npx tsx scripts/geocode-inventory.ts  # reintenta misses
 */
import * as fs from "fs";
import * as path from "path";
import * as https from "https";

const JSON_PATH = path.join(process.cwd(), "prisma", "data", "drive-inventory.json");
const CACHE_PATH = path.join(process.cwd(), ".tmp", "geocode-cache.json");
const UA = "NextPlanning/1.0 (inventory geocode; ops@nextmedia.ar)";
const DELAY_MS = 1100;

type CacheEntry = { lat: number; lng: number; display?: string; q?: string } | { miss: true };

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function normalizeKey(label: string) {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function loadCache(): Record<string, CacheEntry> {
  if (!fs.existsSync(CACHE_PATH)) return {};
  return JSON.parse(fs.readFileSync(CACHE_PATH, "utf8"));
}

function saveCache(cache: Record<string, CacheEntry>) {
  fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true });
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache), "utf8");
}

/** Extrae ciudad/barrio típico al final: "… – Nuñez", "… — CABA" */
function extractCityHint(label: string): string | null {
  const m = label.match(/[–—\-]\s*([^–—\-(]+)\s*$/);
  if (!m) return null;
  let city = m[1].replace(/\([^)]*\)/g, "").trim();
  city = city.replace(/^(ingreso|salida|cara\s*\d+|hacia\s+\w+)$/i, "").trim();
  if (city.length < 3) return null;
  const map: Record<string, string> = {
    caba: "Ciudad Autónoma de Buenos Aires",
    "capital federal": "Ciudad Autónoma de Buenos Aires",
    nuñez: "Núñez, Buenos Aires",
    nunez: "Núñez, Buenos Aires",
    "vicente lópez": "Vicente López, Buenos Aires",
    "vicente lopez": "Vicente López, Buenos Aires",
    nordelta: "Nordelta, Tigre, Buenos Aires",
    "san fernando": "San Fernando, Buenos Aires",
    "gral. pacheco": "General Pacheco, Buenos Aires",
    "general pacheco": "General Pacheco, Buenos Aires",
    boulogne: "Boulogne Sur Mer, Buenos Aires",
    pilar: "Pilar, Buenos Aires",
    "zona norte": "Buenos Aires",
  };
  const key = city.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return map[key] ?? `${city}, Buenos Aires, Argentina`;
}

function cleanBase(label: string): string {
  let s = label;
  s = s.replace(/[“”"']/g, "");
  s = s.replace(/\([^)]*\)/g, " ");
  s = s.replace(/\b(cara\s*\d+|ambas caras|2 caras|2 cuerpos|bis|max)\b/gi, " ");
  s = s.replace(/\bN[°º]?\s*\d+\b/gi, " ");
  s = s.replace(/\bCartel\s*N[°º]?\s*\d+\b/gi, " ");
  s = s.replace(/\bdisponible desde .+$/gi, "");
  s = s.replace(/\s*[–—]\s*(ingreso|salida|hacia\s+[^–—]+).*$/gi, "");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

/** Genera queries de más específica a más laxa */
function queryCandidates(label: string): string[] {
  const out: string[] = [];
  const push = (q: string) => {
    const t = q.replace(/\s+/g, " ").trim();
    if (t.length >= 5 && !out.includes(t)) out.push(t);
  };

  const city = extractCityHint(label);
  const base = cleanBase(label);
  const beforeDash = cleanBase(label.split(/[–—]/)[0] ?? label);

  // 1) dirección con número: "Av. Cabildo 4667"
  const withNum = beforeDash.match(
    /^(.+?)\s+(\d{2,5})\b(?:\s+(?:esq\.?|y|e)\s+.+)?$/i,
  );
  if (withNum) {
    const street = withNum[1]
      .replace(/\besq\.?\b.*$/i, "")
      .replace(/\s+y\s+.*$/i, "")
      .trim();
    const num = withNum[2];
    push(`${street} ${num}, Ciudad Autónoma de Buenos Aires, Argentina`);
    push(`${street} ${num}, Buenos Aires, Argentina`);
    if (city) push(`${street} ${num}, ${city}`);
  }

  // 2) intersección: "Av. A y B" / "esq."
  let inter = beforeDash
    .replace(/\besq\.?\b/gi, " y ")
    .replace(/\be\s+(?=[A-ZÁÉÍÓÚ])/g, " y ");
  const ym = inter.match(/^(.+?)\s+y\s+(.+)$/i);
  if (ym) {
    const a = ym[1].replace(/\s+\d{2,5}\b.*/, "").trim();
    const b = ym[2].replace(/\s+\d{2,5}\b.*/, "").split(/[–—]/)[0].trim();
    push(`${a} y ${b}, Ciudad Autónoma de Buenos Aires, Argentina`);
    push(`${a} & ${b}, Buenos Aires, Argentina`);
    if (city) {
      push(`${a} y ${b}, ${city}`);
      push(`${a}, ${city}`);
    }
  }

  // 3) autopistas / km
  if (/panamericana/i.test(label)) {
    const km = label.match(/km\s*([\d.,]+)/i)?.[1]?.replace(",", ".");
    if (km) {
      push(`Autopista Panamericana km ${km}, Buenos Aires, Argentina`);
      push(`RN9 km ${km}, Buenos Aires, Argentina`);
    }
    push("Autopista Panamericana, Buenos Aires, Argentina");
  }
  if (/acceso oeste/i.test(label)) {
    const km = label.match(/km\s*([\d.,]+)/i)?.[1]?.replace(",", ".");
    if (km) push(`Autopista Acceso Oeste km ${km}, Buenos Aires, Argentina`);
    push("Autopista Acceso Oeste, Buenos Aires, Argentina");
  }
  if (/gral\.?\s*paz|general\s+paz/i.test(label)) {
    push("Avenida General Paz, Buenos Aires, Argentina");
  }
  if (/25 de mayo/i.test(label) && /au\.|autopista/i.test(label)) {
    push("Autopista 25 de Mayo, Buenos Aires, Argentina");
  }
  if (/perito moreno/i.test(label)) {
    push("Autopista Perito Moreno, Buenos Aires, Argentina");
  }
  if (/dellepiane/i.test(label)) {
    push("Autopista Dellepiane, Buenos Aires, Argentina");
  }
  if (/ruta\s*2\b/i.test(label)) {
    const km = label.match(/km\s*([\d.,]+)/i)?.[1];
    if (km) push(`Ruta 2 km ${km}, Buenos Aires, Argentina`);
    push("Ruta Provincial 2, Buenos Aires, Argentina");
  }
  if (/ruta\s*27\b/i.test(label)) {
    push("Ruta Provincial 27, Tigre, Buenos Aires, Argentina");
  }
  if (/ruta\s*3\b/i.test(label)) {
    push("Ruta Nacional 3, Buenos Aires, Argentina");
  }
  if (/bancalari/i.test(label)) {
    push("Avenida Bancalari, Tigre, Buenos Aires, Argentina");
    push("Nordelta, Tigre, Buenos Aires, Argentina");
  }

  // 4) base limpia + ciudad
  push(`${beforeDash}, Buenos Aires, Argentina`);
  if (city) push(`${beforeDash}, ${city}`);
  push(`${base}, Argentina`);

  // 5) fallback solo ciudad/barrio (para que el mapa tenga algo)
  if (city) push(city);
  if (/nordelta/i.test(label)) push("Nordelta, Tigre, Buenos Aires, Argentina");
  if (/unicenter/i.test(label)) push("Unicenter, Martínez, Buenos Aires, Argentina");

  return out.slice(0, 5); // menos intentos = más rápido; zona cubre el resto
}

function nominatimSearch(q: string): Promise<{ lat: number; lng: number; display: string } | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "ar");
  url.searchParams.set("accept-language", "es");

  return new Promise((resolve, reject) => {
    const req = https.get(
      url.toString(),
      { headers: { "User-Agent": UA, Accept: "application/json" } },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          try {
            if (res.statusCode === 429) {
              resolve(null);
              return;
            }
            const data = JSON.parse(Buffer.concat(chunks).toString("utf8")) as {
              lat: string;
              lon: string;
              display_name?: string;
            }[];
            if (!data?.[0]) {
              resolve(null);
              return;
            }
            resolve({
              lat: Number(data[0].lat),
              lng: Number(data[0].lon),
              display: data[0].display_name ?? "",
            });
          } catch (e) {
            reject(e);
          }
        });
      },
    );
    req.on("error", reject);
    req.setTimeout(20000, () => {
      req.destroy();
      resolve(null);
    });
  });
}

const ZONE_CENTROIDS: { test: RegExp; lat: number; lng: number; label: string }[] = [
  { test: /maip[uú]|olivos|florida\s*(oeste|bs)/i, lat: -34.51, lng: -58.49, label: "Vicente López Norte" },
  { test: /nordelta|bancalari/i, lat: -34.4144, lng: -58.6495, label: "Nordelta" },
  { test: /vicente\s*l[oó]pez/i, lat: -34.526, lng: -58.475, label: "Vicente López" },
  { test: /san\s*fernando/i, lat: -34.441, lng: -58.558, label: "San Fernando" },
  { test: /tigre(?!\s*norte)/i, lat: -34.426, lng: -58.58, label: "Tigre" },
  { test: /pacheco/i, lat: -34.452, lng: -58.623, label: "General Pacheco" },
  { test: /boulogne/i, lat: -34.508, lng: -58.567, label: "Boulogne" },
  { test: /mart[ií]nez|unicenter/i, lat: -34.494, lng: -58.496, label: "Martínez" },
  { test: /pilar/i, lat: -34.458, lng: -58.914, label: "Pilar" },
  { test: /nu[nñ]ez|nunez/i, lat: -34.545, lng: -58.462, label: "Núñez" },
  { test: /belgrano/i, lat: -34.562, lng: -58.458, label: "Belgrano" },
  { test: /palermo/i, lat: -34.588, lng: -58.425, label: "Palermo" },
  { test: /cabildo/i, lat: -34.56, lng: -58.46, label: "Cabildo" },
  { test: /libertad(?:or)?|av\.\s*del\s*libertador/i, lat: -34.56, lng: -58.44, label: "Libertador" },
  { test: /panamericana|rn9/i, lat: -34.495, lng: -58.555, label: "Panamericana" },
  { test: /acceso\s*oeste/i, lat: -34.63, lng: -58.55, label: "Acceso Oeste" },
  { test: /gral\.?\s*paz|general\s+paz/i, lat: -34.62, lng: -58.53, label: "General Paz" },
  { test: /ruta\s*27/i, lat: -34.45, lng: -58.62, label: "Ruta 27" },
  { test: /ruta\s*2\b/i, lat: -35.0, lng: -58.0, label: "Ruta 2" },
  { test: /caba|capital|microcentro|obelisco/i, lat: -34.6037, lng: -58.3816, label: "CABA" },
  { test: /gba|buenos\s*aires/i, lat: -34.6, lng: -58.45, label: "GBA" },
];

function zoneFallback(label: string): CacheEntry | null {
  for (const z of ZONE_CENTROIDS) {
    if (z.test.test(label)) {
      return { lat: z.lat, lng: z.lng, display: z.label, q: `zone:${z.label}` };
    }
  }
  // default AMBA so almost nothing stays without a pin
  return { lat: -34.6037, lng: -58.3816, display: "CABA (approx)", q: "zone:CABA-default" };
}

async function resolveLabel(label: string): Promise<CacheEntry> {
  // 1–2 queries Nominatim; si falla, centroide de zona (siempre hay pin)
  const candidates = queryCandidates(label).slice(0, 2);
  for (const q of candidates) {
    const res = await nominatimSearch(q);
    await sleep(DELAY_MS);
    if (res && Number.isFinite(res.lat) && Number.isFinite(res.lng)) {
      return { lat: res.lat, lng: res.lng, display: res.display, q };
    }
  }
  return zoneFallback(label)!;
}

async function main() {
  const raw = JSON.parse(fs.readFileSync(JSON_PATH, "utf8")) as {
    units: {
      locationLabel: string;
      latitude?: number | null;
      longitude?: number | null;
      [k: string]: unknown;
    }[];
    [k: string]: unknown;
  };

  let cache = loadCache();
  if (process.env.CLEAR_MISSES === "1") {
    let n = 0;
    for (const [k, v] of Object.entries(cache)) {
      if (v && "miss" in v) {
        delete cache[k];
        n++;
      }
    }
    console.log(`Cleared ${n} misses from cache`);
    saveCache(cache);
  }

  const unique = new Map<string, string>();
  for (const u of raw.units) {
    const key = normalizeKey(u.locationLabel);
    if (!unique.has(key)) unique.set(key, u.locationLabel);
  }

  const keys = [...unique.keys()];
  let done = 0;
  let hits = 0;
  let misses = 0;

  console.log(`Únicas: ${keys.length}`);

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const label = unique.get(key)!;
    const existing = cache[key];
    if (existing && "lat" in existing) {
      hits++;
      done++;
      continue;
    }
    // reintentar misses viejos (ya no deberían quedar)

    process.stdout.write(`[${i + 1}/${keys.length}] ${label.slice(0, 64)}… `);
    try {
      const entry = await resolveLabel(label);
      cache[key] = entry;
      if ("lat" in entry) {
        hits++;
        console.log(`OK (${entry.q?.slice(0, 40)}) ${entry.lat.toFixed(4)},${entry.lng.toFixed(4)}`);
      } else {
        misses++;
        console.log("MISS");
      }
    } catch (e) {
      console.log("ERR", e);
    }
    done++;
    if (done % 5 === 0) saveCache(cache);
  }

  saveCache(cache);

  let withCoords = 0;
  for (const u of raw.units) {
    const c = cache[normalizeKey(u.locationLabel)];
    if (c && "lat" in c) {
      u.latitude = c.lat;
      u.longitude = c.lng;
      withCoords++;
    } else {
      u.latitude = null;
      u.longitude = null;
    }
  }

  raw.geocodedAt = new Date().toISOString();
  raw.withCoordinates = withCoords;
  fs.writeFileSync(JSON_PATH, JSON.stringify(raw, null, 2), "utf8");
  console.log(`\nListo: ${withCoords}/${raw.units.length} con coords | hits=${hits} misses=${misses}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
