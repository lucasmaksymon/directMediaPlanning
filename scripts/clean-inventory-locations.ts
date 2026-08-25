/**
 * Limpia locationLabel/name contaminados en prisma/data/drive-inventory.json
 * (mezcla de Tipo / Detalle / Impactos / medidas en la dirección).
 *
 * Uso: npx tsx scripts/clean-inventory-locations.ts
 */
import * as fs from "fs";
import * as path from "path";
import {
  cleanInventoryUnitName,
  cleanLocationLabel,
  enrichMetadataWithSpecs,
  locationLabelTail,
} from "../src/lib/inventory/unit-specs";

const JSON_PATH = path.join(process.cwd(), "prisma", "data", "drive-inventory.json");

type Unit = {
  name: string;
  locationLabel: string;
  description?: string;
  format?: string;
  latitude?: number | null;
  longitude?: number | null;
  metadata?: Record<string, string>;
  [k: string]: unknown;
};

function main() {
  const raw = JSON.parse(fs.readFileSync(JSON_PATH, "utf8")) as {
    units: Unit[];
    [k: string]: unknown;
  };

  let locFixed = 0;
  let nameFixed = 0;

  for (const u of raw.units) {
    const prevLoc = u.locationLabel || "";
    const prevName = u.name || "";
    const locationLabel = cleanLocationLabel(prevLoc) || prevLoc.slice(0, 240);
    const name = cleanInventoryUnitName(prevName) || prevName.slice(0, 200);
    const tail = locationLabelTail(prevLoc);

    if (locationLabel !== prevLoc) locFixed++;
    if (name !== prevName) nameFixed++;

    let description = (u.description || "").trim();
    if (tail) {
      if (!description) description = tail;
      else if (!description.includes(tail.slice(0, Math.min(40, tail.length)))) {
        description = `${description}\n${tail}`.trim();
      }
    }

    u.locationLabel = locationLabel.slice(0, 240);
    u.name = name.slice(0, 200);
    u.description = description;
    u.metadata = enrichMetadataWithSpecs(u.metadata ?? {}, {
      name: u.name,
      description: u.description,
      locationLabel: u.locationLabel,
      format: u.format,
      latitude: u.latitude,
      longitude: u.longitude,
      metadata: u.metadata,
    });
  }

  raw.cleanedLocationsAt = new Date().toISOString();
  fs.writeFileSync(JSON_PATH, `${JSON.stringify(raw, null, 2)}\n`, "utf8");
  console.log(
    `Unidades: ${raw.units.length} · locationLabel limpias: ${locFixed} · names: ${nameFixed}`,
  );
}

main();
