/**
 * Pasa órdenes, facturas, recibos y órdenes de pago de un proveedor duplicado
 * al que queda, y borra el duplicado.
 * El que queda y el que se va se identifican por el número de una factura de compra de cada uno.
 * Sin --apply solo lista lo que cambiaría.
 * Uso:
 *   npx tsx scripts/merge-erp-vendor.ts
 *   DATABASE_URL="…" npx tsx scripts/merge-erp-vendor.ts --apply
 *   npx tsx scripts/merge-erp-vendor.ts --keep-invoice 316 --drop-invoice 325 --apply
 */
import { PrismaClient } from "@prisma/client";

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

function arg(name: string, fallback: string) {
  const i = process.argv.indexOf(name);
  const value = i >= 0 ? process.argv[i + 1] : undefined;
  return value && !value.startsWith("--") ? value : fallback;
}

function invoiceRef(docType: string, pos: number, number: number) {
  return `${docType} ${String(pos).padStart(4, "0")}-${String(number).padStart(8, "0")}`;
}

function cuitDigits(taxId: string | null) {
  const digits = (taxId ?? "").replace(/\D/g, "");
  return digits && !/^0+$/.test(digits) ? digits : "";
}

async function vendorOfInvoice(number: number, role: string) {
  const rows = await prisma.erpPurchaseInvoice.findMany({
    where: { number },
    select: {
      docType: true,
      pos: true,
      number: true,
      vendor: { select: { id: true, name: true, taxId: true } },
    },
  });
  if (rows.length !== 1) {
    const found = rows.map((row) => `${invoiceRef(row.docType, row.pos, row.number)} · ${row.vendor.name}`).join("; ");
    throw new Error(
      `La factura ${number} (${role}) tiene que ser una sola. Encontradas: ${rows.length}${found ? ` (${found})` : ""}.`,
    );
  }
  return rows[0];
}

async function counts(vendorId: string) {
  const [purchaseOrders, productionOrders, invoices, receipts, paymentOrders] = await Promise.all([
    prisma.erpPurchaseOrder.count({ where: { vendorId } }),
    prisma.erpProductionOrder.count({ where: { vendorId } }),
    prisma.erpPurchaseInvoice.count({ where: { vendorId } }),
    prisma.erpPurchaseReceipt.count({ where: { vendorId } }),
    prisma.erpPaymentOrder.count({ where: { vendorId } }),
  ]);
  return { purchaseOrders, productionOrders, invoices, receipts, paymentOrders };
}

async function main() {
  const keepNumber = Number(arg("--keep-invoice", "316"));
  const dropNumber = Number(arg("--drop-invoice", "325"));
  if (!Number.isInteger(keepNumber) || !Number.isInteger(dropNumber) || keepNumber === dropNumber) {
    throw new Error("Indicá dos números de factura distintos en --keep-invoice y --drop-invoice.");
  }

  console.log(`Base: ${hostOf(databaseUrl())}${apply ? "" : " (simulación, usá --apply para guardar)"}`);

  const keepInvoice = await vendorOfInvoice(keepNumber, "la que queda");
  const dropInvoice = await vendorOfInvoice(dropNumber, "la que se va");
  const keep = keepInvoice.vendor;
  const drop = dropInvoice.vendor;
  if (keep.id === drop.id) {
    throw new Error(`Las facturas ${keepNumber} y ${dropNumber} ya son del mismo proveedor: ${keep.name}.`);
  }

  const keepCuit = cuitDigits(keep.taxId);
  const dropCuit = cuitDigits(drop.taxId);
  if (dropCuit && dropCuit !== keepCuit) {
    throw new Error(
      `El proveedor a borrar tiene CUIT ${drop.taxId} y el que queda tiene ${keep.taxId ?? "(vacío)"}. No se unifican.`,
    );
  }

  const moving = await counts(drop.id);
  console.log(`Queda: ${keep.name} (${keep.id}) · factura ${invoiceRef(keepInvoice.docType, keepInvoice.pos, keepInvoice.number)}`);
  console.log(`Se va: ${drop.name} (${drop.id}) · factura ${invoiceRef(dropInvoice.docType, dropInvoice.pos, dropInvoice.number)}`);
  console.log(
    `A mover: ${moving.purchaseOrders} órdenes de compra, ${moving.productionOrders} de producción, ${moving.invoices} facturas, ${moving.receipts} recibos, ${moving.paymentOrders} órdenes de pago.`,
  );

  const [invoices, productionOrders] = await Promise.all([
    prisma.erpPurchaseInvoice.findMany({
      where: { vendorId: drop.id },
      orderBy: { number: "asc" },
      select: { docType: true, pos: true, number: true },
    }),
    prisma.erpProductionOrder.findMany({
      where: { vendorId: drop.id },
      orderBy: { number: "asc" },
      select: { number: true },
    }),
  ]);
  for (const invoice of invoices) {
    console.log(`  factura ${invoiceRef(invoice.docType, invoice.pos, invoice.number)}`);
  }
  for (const order of productionOrders) {
    console.log(`  producción ${order.number}`);
  }

  if (!apply) return;

  await prisma.$transaction(async (tx) => {
    const where = { vendorId: drop.id };
    const data = { vendorId: keep.id };
    await tx.erpPurchaseOrder.updateMany({ where, data });
    await tx.erpProductionOrder.updateMany({ where, data });
    await tx.erpPurchaseInvoice.updateMany({ where, data });
    await tx.erpPurchaseReceipt.updateMany({ where, data });
    await tx.erpPaymentOrder.updateMany({ where, data });
    await tx.erpVendor.delete({ where: { id: drop.id } });
  });
  console.log(`Unificado en ${keep.name}. ${drop.name} borrado.`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
