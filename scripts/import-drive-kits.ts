/**
 * Importa media kits del Drive (carpetas por proveedor → Lotes/*.pptx + kits raíz + PPT UNIFICADO).
 * Cada slide con "Ubicación" → InventoryUnit (JSON + imagen en public/inventory).
 *
 * Uso: npx tsx scripts/import-drive-kits.ts
 */
import * as fs from "fs";
import * as path from "path";
import * as https from "https";
import * as http from "http";
import { createWriteStream } from "fs";
import { execFileSync } from "child_process";
import { enrichMetadataWithSpecs } from "../src/lib/inventory/unit-specs";

const ROOT_FOLDER_ID = "13RXXIfvxVwDqBNHMW6_N_MssWqV0EkhD";
const WORK = path.join(process.cwd(), ".tmp", "drive-import");
const OUT_JSON = path.join(process.cwd(), "prisma", "data", "drive-inventory.json");
const OUT_IMG = path.join(process.cwd(), "public", "inventory");

const PROVIDER_NAME_MAP: Record<string, string> = {
  "BBYMC 2026": "BBYMC",
  "OMB VIA PUBLICA - DIEGO PARDO": "OMB VIA PUBLICA",
  "SKY MEDIA - JORGE VIGO": "SKY MEDIA",
  "PC, Carnevale": "PC Carnevale",
  NEXO: "NEXO",
};

type DriveEntry = { id: string; name: string };
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

function slug(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function normalizeProvider(folderName: string) {
  const trimmed = folderName.trim();
  return PROVIDER_NAME_MAP[trimmed] ?? trimmed;
}

function fetchText(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith("https") ? https : http;
    const req = mod.get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetchText(res.headers.location).then(resolve, reject);
        return;
      }
      const chunks: Buffer[] = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    });
    req.on("error", reject);
    req.setTimeout(90_000, () => {
      req.destroy();
      reject(new Error("timeout " + url));
    });
  });
}

async function downloadFile(fileId: string, dest: string): Promise<void> {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const url = `https://drive.google.com/uc?export=download&id=${fileId}`;
  await new Promise<void>((resolve, reject) => {
    const follow = (u: string, redirects = 0) => {
      if (redirects > 8) return reject(new Error("too many redirects"));
      https
        .get(u, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            follow(res.headers.location, redirects + 1);
            return;
          }
          const tmp = dest + ".part";
          const file = createWriteStream(tmp);
          res.pipe(file);
          file.on("finish", () => {
            file.close();
            const head = Buffer.alloc(4);
            const fd = fs.openSync(tmp, "r");
            fs.readSync(fd, head, 0, 4, 0);
            fs.closeSync(fd);
            if (head[0] === 0x50 && head[1] === 0x4b) {
              fs.renameSync(tmp, dest);
              resolve();
              return;
            }
            // HTML confirm page
            const html = fs.readFileSync(tmp, "utf8");
            fs.unlinkSync(tmp);
            const conf =
              html.match(/confirm=([0-9A-Za-z_-]+)/)?.[1] ||
              html.match(/name="confirm" value="([^"]+)"/)?.[1];
            const uuid = html.match(/name="uuid" value="([^"]+)"/)?.[1];
            if (conf) {
              let next = `https://drive.google.com/uc?export=download&confirm=${conf}&id=${fileId}`;
              if (uuid) next += `&uuid=${uuid}`;
              follow(next, redirects + 1);
              return;
            }
            reject(new Error(`download not pptx for ${fileId}`));
          });
        })
        .on("error", reject);
    };
    follow(url);
  });
}

function parseDriveFolderHtml(html: string): DriveEntry[] {
  const map = new Map<string, string>();
  for (const m of html.matchAll(/data-id="(1[^"]+)"[^>]*data-tooltip="([^"]+)"/g)) {
    let name = m[2]
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/ Shared (folder|file)$/i, "")
      .trim();
    name = name.replace(/ Microsoft PowerPoint$/i, "").replace(/ PDF$/i, "").trim();
    if (name) map.set(m[1], name);
  }
  return [...map.entries()].map(([id, name]) => ({ id, name }));
}

function isPptxName(name: string) {
  const n = name.toLowerCase();
  return n.includes(".pptx") || n.endsWith("powerpoint") || n.includes("powerpoint");
}

function parsePrice(valor: string): { amount: string; model: "fixed_list" | "negotiable" } {
  const v = valor.replace(/\s+/g, " ").trim();
  if (/consultar/i.test(v) || !v) return { amount: "1", model: "negotiable" };
  const m = v.replace(/\./g, "").replace(/,/g, "").match(/(\d{3,})/);
  if (!m) return { amount: "1", model: "negotiable" };
  return { amount: m[1], model: "fixed_list" };
}

function detectFormat(tipo: string, medida: string): "digital_ooh" | "static_ooh" | "digital_package" {
  const t = `${tipo} ${medida}`.toLowerCase();
  if (/\bled\b|digital|pantalla|dooh|totem digital/.test(t)) return "digital_ooh";
  if (/paquete|circuito|pack/.test(t)) return "digital_package";
  return "static_ooh";
}

function extractPptx(pptxPath: string): { tmpRoot: string; slides: { slideNum: number; texts: string[]; rels: string }[] } {
  const tmpRoot = path.join(
    WORK,
    "unzip",
    slug(path.basename(pptxPath, ".pptx") + "-" + Buffer.from(pptxPath).toString("base64url").slice(0, 12)),
  );
  fs.rmSync(tmpRoot, { recursive: true, force: true });
  fs.mkdirSync(tmpRoot, { recursive: true });

  // Python zipfile is more reliable than Windows tar for large pptx
  const py = `
import zipfile, sys
zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])
`;
  execFileSync("python", ["-c", py, pptxPath, tmpRoot], { stdio: "ignore" });

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

function fieldAfter(texts: string[], label: string): string {
  const i = texts.findIndex((t) => t.toLowerCase() === label.toLowerCase());
  if (i < 0) return "";
  const parts: string[] = [];
  for (let j = i + 1; j < texts.length; j++) {
    const t = texts[j];
    if (/^(ubicación|ubicacion|medida|visual|valor|precio|formato)$/i.test(t)) break;
    if (/^(espectaculares|columnas?|medianeras?|supervallas?|totems?|led|frontlight|backlight)$/i.test(t) && parts.length)
      break;
    parts.push(t);
  }
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

function parseSlideToUnit(
  texts: string[],
  providerName: string,
  sourceFile: string,
): Omit<ParsedUnit, "imagePath"> | null {
  const hasUbicacion = texts.some((t) => /^ubicaci[oó]n$/i.test(t));
  if (!hasUbicacion) return null;

  const ubicacion = fieldAfter(texts, "Ubicación") || fieldAfter(texts, "Ubicacion");
  if (!ubicacion || ubicacion.length < 5) return null;

  const medida = fieldAfter(texts, "Medida");
  const visual = fieldAfter(texts, "Visual");
  const valor = fieldAfter(texts, "Valor") || fieldAfter(texts, "Precio");

  // tipo / zona from early lines
  const tipoCandidates = texts.filter((t) =>
    /columna|medianera|supervalla|totem|led|frontlight|backlight|valla|pantalla|espectacular|mobiliario|mupi|digital/i.test(
      t,
    ),
  );
  const tipo = tipoCandidates[0] ?? "OOH";
  const zonaBullet = texts.find((t) => /^[●•▪]/.test(t) || texts[texts.indexOf(t) - 1] === "●");
  const zona =
    texts.find((t, i) => i > 0 && (texts[i - 1] === "●" || texts[i - 1] === "•")) ||
    texts.find((t) => /^●/.test(t))?.replace(/^[●•]\s*/, "") ||
    "";

  const { amount, model } = parsePrice(valor || texts.join(" "));
  const format = detectFormat(tipo, medida);
  const zonePart = zona.replace(/^[●•]\s*/, "").trim();
  const name = [tipo.replace(/ESPECTACULARES/i, "").trim() || "Espacio", zonePart, ubicacion.split("–")[0].trim()]
    .filter(Boolean)
    .join(" — ")
    .slice(0, 180);

  const description = [
    medida && `Medida: ${medida}`,
    visual && `Visual: ${visual}`,
    valor && `Tarifa media kit: ${valor}`,
  ]
    .filter(Boolean)
    .join("\n");

  const metadata = enrichMetadataWithSpecs(
    {
      tipo,
      zona: zonePart,
      medida,
      visual,
      valorRaw: valor,
    },
    {
      name: name || ubicacion.slice(0, 120),
      description,
      locationLabel: ubicacion.slice(0, 240),
      format,
      metadata: {
        tipo,
        zona: zonePart,
        medida,
        visual,
        valorRaw: valor,
      },
    },
  );

  return {
    providerName,
    name: name || ubicacion.slice(0, 120),
    locationLabel: ubicacion.slice(0, 240),
    description,
    format,
    basePriceAmount: amount,
    priceModel: model,
    status: "published" as const,
    sourceFile,
    metadata,
  };
}

function pickSlideImage(tmpRoot: string, slideNum: number, relsXml: string): string | null {
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

async function listFolder(folderId: string): Promise<DriveEntry[]> {
  const html = await fetchText(`https://drive.google.com/drive/folders/${folderId}`);
  return parseDriveFolderHtml(html);
}

async function processPptx(
  localPath: string,
  providerName: string,
  sourceLabel: string,
  units: ParsedUnit[],
) {
  let extracted: ReturnType<typeof extractPptx>;
  try {
    extracted = extractPptx(localPath);
  } catch (e) {
    console.warn("  skip unzip", sourceLabel, e);
    return;
  }
  if (!extracted.slides.length) {
    console.warn("  no slides", sourceLabel);
    return;
  }
  let added = 0;
  for (const slide of extracted.slides) {
    const parsed = parseSlideToUnit(slide.texts, providerName, sourceLabel);
    if (!parsed) continue;
    const imgSrc = pickSlideImage(extracted.tmpRoot, slide.slideNum, slide.rels);
    let imagePath: string | null = null;
    if (imgSrc && fs.existsSync(imgSrc)) {
      const ext = path.extname(imgSrc).toLowerCase() || ".jpg";
      const destRel = path.posix.join(
        "inventory",
        slug(providerName),
        `${slug(parsed.name).slice(0, 60)}-s${slide.slideNum}${ext}`,
      );
      const destAbs = path.join(process.cwd(), "public", destRel);
      fs.mkdirSync(path.dirname(destAbs), { recursive: true });
      fs.copyFileSync(imgSrc, destAbs);
      imagePath = "/" + destRel;
    }
    units.push({ ...parsed, imagePath });
    added++;
  }
  console.log(`  +${added} units from ${sourceLabel}`);
}

async function main() {
  fs.mkdirSync(WORK, { recursive: true });
  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.mkdirSync(OUT_IMG, { recursive: true });

  console.log("Listando carpetas raíz…");
  const root = await listFolder(ROOT_FOLDER_ID);
  const providerFolders = root.filter(
    (e) =>
      e.name !== "PPT UNIFICADO" &&
      !/^Original item/i.test(e.name) &&
      !isPptxName(e.name) &&
      !e.name.toLowerCase().endsWith(".pdf"),
  );
  const unified = root.find((e) => e.name === "PPT UNIFICADO");

  const units: ParsedUnit[] = [];
  const seenFiles = new Set<string>();

  for (const folder of providerFolders) {
    const providerName = normalizeProvider(folder.name);
    console.log(`\n=== ${folder.name} → ${providerName} ===`);
    let entries: DriveEntry[] = [];
    try {
      entries = await listFolder(folder.id);
    } catch (e) {
      console.warn("  no list", e);
      continue;
    }

    const lotes = entries.find((e) => e.name.toLowerCase() === "lotes");
    const pptxHere = entries.filter((e) => isPptxName(e.name));

    const queue: DriveEntry[] = [...pptxHere];
    if (lotes) {
      try {
        const lotEntries = await listFolder(lotes.id);
        queue.push(...lotEntries.filter((e) => isPptxName(e.name)));
      } catch (e) {
        console.warn("  lotes fail", e);
      }
    }

    for (const file of queue) {
      if (seenFiles.has(file.id)) continue;
      seenFiles.add(file.id);
      const local = path.join(WORK, "pptx", file.id + ".pptx");
      if (!fs.existsSync(local) || fs.statSync(local).size < 1000) {
        process.stdout.write(`  dl ${file.name}… `);
        try {
          await downloadFile(file.id, local);
          console.log("ok", Math.round(fs.statSync(local).size / 1024), "KB");
        } catch (e) {
          console.log("FAIL", e);
          continue;
        }
      } else {
        console.log(`  cached ${file.name}`);
      }
      await processPptx(local, providerName, `${folder.name}/${file.name}`, units);
    }
  }

  if (unified) {
    console.log("\n=== PPT UNIFICADO ===");
    try {
      const entries = await listFolder(unified.id);
      for (const file of entries.filter((e) => isPptxName(e.name))) {
        if (seenFiles.has(file.id)) continue;
        seenFiles.add(file.id);
        // infer provider from filename
        const upper = file.name.toUpperCase();
        let providerName = "NextMedia Paquetes";
        for (const p of providerFolders) {
          const key = normalizeProvider(p.name).toUpperCase();
          if (upper.includes(key.split(" ")[0]) || upper.includes(key)) {
            providerName = normalizeProvider(p.name);
            break;
          }
        }
        // extra aliases
        if (/WALLSTREET|WALL.?STREET/.test(upper)) providerName = "WALLSTREET";
        if (/VOLMEDIA/.test(upper)) providerName = "VOLMEDIA";
        if (/BILLBOARD/.test(upper)) providerName = "BILLBOARD";
        if (/ATACAMA/.test(upper)) providerName = "ATACAMA";
        if (/CITYMEDIA|CITY.?MEDIA/.test(upper)) providerName = "CITY MEDIA";
        if (/TOP.?VIEW/.test(upper)) providerName = "TOP VIEW";
        if (/SKY.?MEDIA/.test(upper)) providerName = "SKY MEDIA";
        if (/DELFINO/.test(upper)) providerName = "DELFINO";
        if (/ENVISION/.test(upper)) providerName = "ENVISION";
        if (/PUBLICITAR/.test(upper)) providerName = "PUBLICITAR";
        if (/MASA/.test(upper)) providerName = "MASA IDEAS";
        if (/BBYMC/.test(upper)) providerName = "BBYMC";
        if (/BAMP/.test(upper)) providerName = "BAMP";
        if (/DA3/.test(upper)) providerName = "DA3";
        if (/OMB/.test(upper)) providerName = "OMB VIA PUBLICA";
        if (/GLOBAL/.test(upper)) providerName = "GLOBAL";
        if (/IDEAS.?CREATIVAS/.test(upper)) providerName = "IDEAS CREATIVAS";

        const local = path.join(WORK, "pptx", file.id + ".pptx");
        if (!fs.existsSync(local) || fs.statSync(local).size < 1000) {
          process.stdout.write(`  dl ${file.name}… `);
          try {
            await downloadFile(file.id, local);
            console.log("ok");
          } catch (e) {
            console.log("FAIL", e);
            continue;
          }
        }
        await processPptx(local, providerName, `PPT UNIFICADO/${file.name}`, units);
      }
    } catch (e) {
      console.warn("unified fail", e);
    }
  }

  // dedupe by provider+locationLabel
  const dedup = new Map<string, ParsedUnit>();
  for (const u of units) {
    const key = `${u.providerName}::${u.locationLabel.toLowerCase()}`;
    if (!dedup.has(key)) dedup.set(key, u);
  }
  const finalUnits = [...dedup.values()];

  const byProvider: Record<string, number> = {};
  for (const u of finalUnits) byProvider[u.providerName] = (byProvider[u.providerName] || 0) + 1;

  fs.writeFileSync(
    OUT_JSON,
    JSON.stringify({ generatedAt: new Date().toISOString(), count: finalUnits.length, byProvider, units: finalUnits }, null, 2),
    "utf8",
  );
  console.log("\nWrote", OUT_JSON);
  console.log("Total units:", finalUnits.length);
  console.log(byProvider);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
