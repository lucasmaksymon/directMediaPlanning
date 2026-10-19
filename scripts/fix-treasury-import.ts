/**
 * Corrige pagos de tesorería mal importados:
 *  1. Dump ADMINISTRACION (ids adm-pag-*): el legado guardaba 2 = cobrado/acreditado, y se
 *     importó tal cual (en NextPlanning 2 = anulado). Pasa a 1 (Cobrado / Pagado) solo los
 *     que en pagos.json tenían estado 2 y siguen en 2.
 *  2. Excel 2026: las transferencias se grabaron con paymentKind 2 (Efectivo en venta,
 *     Endoso en OP). Pasan a 0 (Transferencia).
 *  3. Emitidos (transferencia, cheque, endoso) en Pendiente pasan a Pagado: lo emitido
 *     siempre se termina pagando (criterio de administración, 19/10/2026).
 *
 * Por defecto solo muestra los cambios. Para grabar: --apply (deja un respaldo JSON
 * en data/admin-sql/ con el estado previo de cada fila).
 *   npx tsx --env-file=.env scripts/fix-treasury-import.ts [--apply]
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { ERP_PAY, ERP_PAY_PURCHASE_KIND, ERP_PAY_STATUS } from "../src/lib/erp";

const apply = process.argv.includes("--apply");
const prisma = new PrismaClient();
const LEGACY_FILE = path.join(process.cwd(), "data", "admin-sql", "pagos.json");
const IMPORTED_AS_TRANSFER_WRONG = 2;

function dbHost() {
  return (process.env.DATABASE_URL ?? "").replace(/:\/\/([^:@]+):?([^@]*)@/, "://***@").split("?")[0];
}

function legacyVoidedIds() {
  if (!existsSync(LEGACY_FILE)) throw new Error(`No está ${LEGACY_FILE}`);
  const rows = JSON.parse(readFileSync(LEGACY_FILE, "utf8")) as { id: number; estado: number }[];
  return rows.filter((r) => Number(r.estado) === 2).map((r) => `adm-pag-${r.id}`);
}

async function main() {
  console.log(`Base: ${dbHost()}`);
  console.log(apply ? "Modo: APLICAR\n" : "Modo: simulación (usá --apply para grabar)\n");

  const legacyStatus = await prisma.erpTreasuryPayment.findMany({
    where: { id: { in: legacyVoidedIds() }, estado: ERP_PAY_STATUS.voided },
    select: { id: true, paymentKind: true, number: true, amount: true, saleReceiptId: true },
  });

  const excelTransfers = await prisma.erpTreasuryPayment.findMany({
    where: {
      paymentKind: IMPORTED_AS_TRANSFER_WRONG,
      NOT: { id: { startsWith: "adm-pag-" } },
      OR: [
        { saleReceiptId: { not: null }, number: { startsWith: "TR-X" } },
        { saleReceiptId: null, paymentOrderId: { not: null }, endorsedFromId: null },
      ],
    },
    select: { id: true, number: true, amount: true, saleReceiptId: true },
  });

  const issuedPending = await prisma.erpTreasuryPayment.findMany({
    where: {
      saleReceiptId: null,
      estado: ERP_PAY_STATUS.pending,
      paymentKind: {
        in: [ERP_PAY_PURCHASE_KIND.transfer, ERP_PAY_PURCHASE_KIND.cheque, ERP_PAY_PURCHASE_KIND.endorsed],
      },
    },
    select: { id: true, paymentKind: true, estado: true },
  });

  const side = (r: { saleReceiptId: string | null }) => (r.saleReceiptId ? "recibido" : "emitido");
  const count = (rows: { saleReceiptId: string | null }[], s: string) => rows.filter((r) => side(r) === s).length;

  console.log(`1. Legado en estado 2 (Anulado) → 1 (Cobrado/Pagado): ${legacyStatus.length}`);
  console.log(`   recibidos ${count(legacyStatus, "recibido")} · emitidos ${count(legacyStatus, "emitido")}`);
  const byKind = new Map<number, number>();
  for (const r of legacyStatus) byKind.set(r.paymentKind, (byKind.get(r.paymentKind) ?? 0) + 1);
  console.log(`   por tipo: ${[...byKind].map(([k, v]) => `tipo ${k}: ${v}`).join(" · ")}`);

  console.log(`\n2. Transferencias del Excel con tipo 2 → 0 (Transferencia): ${excelTransfers.length}`);
  console.log(`   recibidas ${count(excelTransfers, "recibido")} · emitidas ${count(excelTransfers, "emitido")}`);
  for (const r of excelTransfers.slice(0, 10)) {
    console.log(`   ${side(r)} ${r.number ?? "s/n"} ${String(r.amount)}`);
  }

  const issuedByKind = new Map<number, number>();
  for (const r of issuedPending) issuedByKind.set(r.paymentKind, (issuedByKind.get(r.paymentKind) ?? 0) + 1);
  console.log(`\n3. Emitidos en Pendiente → Pagado: ${issuedPending.length}`);
  console.log(
    `   transferencias ${issuedByKind.get(ERP_PAY_PURCHASE_KIND.transfer) ?? 0} · cheques ${issuedByKind.get(ERP_PAY_PURCHASE_KIND.cheque) ?? 0} · endosos ${issuedByKind.get(ERP_PAY_PURCHASE_KIND.endorsed) ?? 0}`,
  );

  if (!apply) return;

  const backup = path.join(
    process.cwd(),
    "data",
    "admin-sql",
    `fix-treasury-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
  );
  writeFileSync(
    backup,
    JSON.stringify(
      {
        estadoVoided: legacyStatus.map((r) => r.id),
        paymentKindWrong: excelTransfers.map((r) => r.id),
        issuedPending: issuedPending.map((r) => r.id),
      },
      null,
      2,
    ),
  );
  console.log(`\nRespaldo: ${backup}`);

  await prisma.$transaction([
    prisma.erpTreasuryPayment.updateMany({
      where: { id: { in: issuedPending.map((r) => r.id) }, estado: ERP_PAY_STATUS.pending },
      data: { estado: ERP_PAY_STATUS.done },
    }),
    prisma.erpTreasuryPayment.updateMany({
      where: { id: { in: legacyStatus.map((r) => r.id) }, estado: ERP_PAY_STATUS.voided },
      data: { estado: ERP_PAY_STATUS.done },
    }),
    prisma.erpTreasuryPayment.updateMany({
      where: { id: { in: excelTransfers.map((r) => r.id) }, paymentKind: IMPORTED_AS_TRANSFER_WRONG },
      data: { paymentKind: ERP_PAY.transfer },
    }),
  ]);
  console.log("\nAplicado.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
