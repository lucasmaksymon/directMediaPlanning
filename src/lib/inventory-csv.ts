export type InventoryCsvRow = {
  provider: string;
  name: string;
  locationLabel: string;
  format: "digital_ooh" | "static_ooh" | "digital_package";
  priceModel: "fixed_list" | "negotiable" | "package";
  basePriceAmount: number;
  status: "draft" | "published" | "paused";
  agencyPriceAmount?: number;
  latitude?: number;
  longitude?: number;
};

export type InventoryCsvError = { line: number; message: string };

const FORMATS = new Set(["digital_ooh", "static_ooh", "digital_package"]);
const PRICE_MODELS = new Set(["fixed_list", "negotiable", "package"]);
const STATUSES = new Set(["draft", "published", "paused"]);

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      out.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur.trim());
  return out;
}

function parseNumber(raw: string): number | null {
  const n = Number(raw.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function parseInventoryCsv(text: string): { rows: InventoryCsvRow[]; errors: InventoryCsvError[] } {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.trim());
  const rows: InventoryCsvRow[] = [];
  const errors: InventoryCsvError[] = [];
  if (lines.length === 0) {
    return { rows, errors: [{ line: 0, message: "El archivo está vacío." }] };
  }

  const header = splitCsvLine(lines[0]!).map((h) => h.toLowerCase());
  const idx = (name: string) => header.indexOf(name);
  const required = ["provider", "name", "locationlabel", "format", "pricemodel", "basepriceamount"];
  for (const col of required) {
    if (idx(col) < 0) {
      return { rows, errors: [{ line: 1, message: `Falta la columna ${col}.` }] };
    }
  }

  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]!);
    const get = (name: string) => (idx(name) >= 0 ? cols[idx(name)] ?? "" : "");
    const provider = get("provider");
    const name = get("name");
    const locationLabel = get("locationlabel");
    const format = get("format");
    const priceModel = get("pricemodel");
    const statusRaw = get("status") || "draft";
    const price = parseNumber(get("basepriceamount"));
    const agency = get("agencypriceamount") ? parseNumber(get("agencypriceamount")) : undefined;
    const lat = get("latitude") ? parseNumber(get("latitude")) : undefined;
    const lng = get("longitude") ? parseNumber(get("longitude")) : undefined;

    if (!provider || !name || !locationLabel) {
      errors.push({ line: i + 1, message: "provider, name y locationLabel son obligatorios." });
      continue;
    }
    if (!FORMATS.has(format)) {
      errors.push({ line: i + 1, message: `Formato inválido: ${format}` });
      continue;
    }
    if (!PRICE_MODELS.has(priceModel)) {
      errors.push({ line: i + 1, message: `priceModel inválido: ${priceModel}` });
      continue;
    }
    if (!STATUSES.has(statusRaw)) {
      errors.push({ line: i + 1, message: `status inválido: ${statusRaw}` });
      continue;
    }
    if (price == null || price <= 0) {
      errors.push({ line: i + 1, message: "basePriceAmount inválido." });
      continue;
    }

    rows.push({
      provider,
      name,
      locationLabel,
      format: format as InventoryCsvRow["format"],
      priceModel: priceModel as InventoryCsvRow["priceModel"],
      basePriceAmount: price,
      status: statusRaw as InventoryCsvRow["status"],
      agencyPriceAmount: agency && agency > 0 ? agency : undefined,
      latitude: lat ?? undefined,
      longitude: lng ?? undefined,
    });
  }

  return { rows, errors };
}
