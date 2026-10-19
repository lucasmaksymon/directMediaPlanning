/**
 * Corrige vencimientos de facturas con día y mes invertidos (12/10 guardado como 10/12).
 * Sin --apply solo lista lo que cambiaría.
 * Uso:
 *   npx tsx scripts/fix-swapped-dates.ts
 *   DATABASE_URL="…" npx tsx scripts/fix-swapped-dates.ts --apply
 */
import { PrismaClient } from "@prisma/client";
import { fixSwappedDueIso, isoDate } from "../src/lib/erp";

function databaseUrl() {
  const raw = process.env.DATABASE_URL?.trim();
  if (!raw) throw new Error("Falta DATABASE_URL.");
  let url = raw;
  if (/render\.com|dpg-/i.test(url) && !/[?&]sslmode=/.test(url)) {
    url += (url.includes("?") ? "&" : "?") + "sslmode=require";
  }
  return url;
}

const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl() } } });
const apply = process.argv.includes("--apply");

function hostOf(url: string) {
  try {
    return new URL(url.replace(/^postgresql:/, "http:")).host;
  } catch {
    return "(host desconocido)";
  }
}

function show(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function ref(docType: string, pos: number, number: number) {
  return `${docType} ${String(pos).padStart(4, "0")}-${String(number).padStart(8, "0")}`;
}

type Change = { id: string; label: string; issued: string; from: string; to: string };

function candidate(
  row: { id: string; issuedAt: Date; dueAt: Date },
  paymentDays: number,
  label: string,
): Change | null {
  const issued = isoDate(row.issuedAt);
  const due = isoDate(row.dueAt);
  const to = fixSwappedDueIso(issued, due, paymentDays);
  return to ? { id: row.id, label, issued, from: due, to } : null;
}

async function main() {
  console.log(`Base: ${hostOf(databaseUrl())}${apply ? "" : " (simulación, usá --apply para guardar)"}`);

  const [purchases, sales] = await Promise.all([
    prisma.erpPurchaseInvoice.findMany({
      select: {
        id: true,
        issuedAt: true,
        dueAt: true,
        docType: true,
        pos: true,
        number: true,
        vendor: { select: { name: true, paymentDays: true } },
      },
    }),
    prisma.erpSaleInvoice.findMany({
      select: {
        id: true,
        issuedAt: true,
        dueAt: true,
        docType: true,
        pos: true,
        number: true,
        client: { select: { name: true, company: { select: { paymentDays: true } } } },
      },
    }),
  ]);

  const purchaseChanges = purchases
    .map((inv) =>
      candidate(inv, inv.vendor.paymentDays, `Compra ${ref(inv.docType, inv.pos, inv.number)} · ${inv.vendor.name}`),
    )
    .filter((c): c is Change => c != null);
  const saleChanges = sales
    .map((inv) =>
      candidate(
        inv,
        inv.client.company.paymentDays,
        `Venta ${ref(inv.docType, inv.pos, inv.number)} · ${inv.client.name}`,
      ),
    )
    .filter((c): c is Change => c != null);

  for (const c of [...purchaseChanges, ...saleChanges]) {
    console.log(`  ${c.label}: emitida ${show(c.issued)}, vence ${show(c.from)} → ${show(c.to)}`);
  }

  if (apply) {
    for (const c of purchaseChanges) {
      await prisma.erpPurchaseInvoice.update({
        where: { id: c.id },
        data: { dueAt: new Date(`${c.to}T12:00:00.000Z`) },
      });
    }
    for (const c of saleChanges) {
      await prisma.erpSaleInvoice.update({
        where: { id: c.id },
        data: { dueAt: new Date(`${c.to}T12:00:00.000Z`) },
      });
    }
  }

  console.log(
    `${apply ? "Corregidas" : "A corregir"}: ${purchaseChanges.length} de compra, ${saleChanges.length} de venta.`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
