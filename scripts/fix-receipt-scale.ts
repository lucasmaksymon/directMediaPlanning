/**
 * Corrige recibos (y OP de pago) cuyo importe quedó ×100 vs las facturas ligadas.
 * Uso:
 *   npx tsx scripts/fix-receipt-scale.ts
 *   DATABASE_URL="…" npx tsx scripts/fix-receipt-scale.ts
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

function hostOf(url: string) {
  try {
    return new URL(url.replace(/^postgresql:/, "http:")).host;
  } catch {
    return "(host desconocido)";
  }
}

function nearly100x(value: number, base: number) {
  if (base <= 0 || value <= 0) return false;
  return Math.abs(value - base * 100) < 0.05;
}

function money(n: number) {
  return n.toLocaleString("es-AR", { style: "currency", currency: "ARS" });
}

async function fixSaleReceipts() {
  const receipts = await prisma.erpSaleReceipt.findMany({
    include: {
      invoices: { include: { invoice: { select: { amount: true, vat: true } } } },
      payments: { select: { id: true, amount: true } },
    },
  });
  const updates: Array<{
    id: string;
    number: number;
    from: number;
    to: number;
    balanceFrom: number;
    balanceTo: number;
    payments: number;
  }> = [];

  for (const rec of receipts) {
    const invoiceTotal = rec.invoices.reduce(
      (acc, link) => acc + Number(link.invoice.amount) + Number(link.invoice.vat),
      0,
    );
    const amount = Number(rec.amount);
    if (!nearly100x(amount, invoiceTotal)) continue;
    const nextAmount = Math.round(invoiceTotal * 100) / 100;
    const balance = Number(rec.balance);
    const nextBalance = balance > 0 && nearly100x(balance, balance / 100) ? Math.round((balance / 100) * 100) / 100 : balance;

    await prisma.erpSaleReceipt.update({
      where: { id: rec.id },
      data: { amount: nextAmount, balance: nextBalance },
    });

    let payments = 0;
    for (const pay of rec.payments) {
      const payAmount = Number(pay.amount);
      if (!nearly100x(payAmount, nextAmount)) continue;
      await prisma.erpTreasuryPayment.update({
        where: { id: pay.id },
        data: { amount: nextAmount },
      });
      payments += 1;
    }

    updates.push({
      id: rec.id,
      number: rec.number,
      from: amount,
      to: nextAmount,
      balanceFrom: balance,
      balanceTo: nextBalance,
      payments,
    });
  }
  return updates;
}

async function fixPaymentOrders() {
  const orders = await prisma.erpPaymentOrder.findMany({
    include: {
      invoices: { include: { invoice: { select: { amount: true, vat: true } } } },
    },
  });
  const updates: Array<{ id: string; number: number; from: number; to: number }> = [];
  for (const order of orders) {
    const invoiceTotal = order.invoices.reduce(
      (acc, link) => acc + Number(link.invoice.amount) + Number(link.invoice.vat),
      0,
    );
    const amount = Number(order.amount);
    if (!nearly100x(amount, invoiceTotal)) continue;
    const nextAmount = Math.round(invoiceTotal * 100) / 100;
    const balance = Number(order.balance);
    const nextBalance = balance > 0 ? Math.round((balance / 100) * 100) / 100 : balance;
    await prisma.erpPaymentOrder.update({
      where: { id: order.id },
      data: { amount: nextAmount, balance: nextBalance },
    });
    updates.push({ id: order.id, number: order.number, from: amount, to: nextAmount });
  }
  return updates;
}

async function main() {
  const url = databaseUrl();
  console.log(`Base: ${hostOf(url)}`);
  const receipts = await fixSaleReceipts();
  const pays = await fixPaymentOrders();
  console.log(`Recibos corregidos: ${receipts.length}`);
  for (const row of receipts) {
    console.log(`  RV ${row.number}: ${money(row.from)} → ${money(row.to)}`);
  }
  console.log(`Órdenes de pago corregidas: ${pays.length}`);
  for (const row of pays) {
    console.log(`  OP ${row.number}: ${money(row.from)} → ${money(row.to)}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
