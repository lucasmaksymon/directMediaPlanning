import { readFileSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

function databaseUrl() {
  const raw = process.env.DATABASE_URL?.trim();
  if (!raw) throw new Error("Falta DATABASE_URL.");
  let url = raw;
  const add = (param: string) => {
    if (new RegExp(`[?&]${param.split("=")[0]}=`).test(url)) return;
    url += (url.includes("?") ? "&" : "?") + param;
  };
  add("connect_timeout=15");
  if (/render\.com|dpg-/i.test(url)) add("sslmode=require");
  return url;
}

function dbHost(url: string) {
  return url.replace(/:\/\/([^:@]+):?([^@]*)@/, "://***@").split("?")[0];
}

const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl() } } });

type Comp = {
  raw?: string | null;
  docType: string;
  pos: number;
  number: number;
  credit?: boolean;
  vendor?: string | null;
  issuedAt?: string | null;
  net: number;
  vat: number;
  diegoFee?: number;
  payStatus?: number;
  poNumber?: string;
  legalName?: string | null;
  detail?: string | null;
  collected?: number | null;
  receiptRef?: string | null;
  retGan?: number;
  retVat?: number;
  retSuss?: number;
  retIibb?: number;
  echeq?: number;
  bank?: number;
  collectStatus?: number;
  iibb?: number;
  percVat?: number;
};

type TreasuryLine = {
  kind: "echeq" | "transfer";
  number?: string | null;
  issuedAt?: string | null;
  paidAt?: string | null;
  amount?: number | null;
};

type GestionLine = {
  order: string;
  sort: number;
  element?: string | null;
  location?: string | null;
  quantity?: number;
  startsAt?: string | null;
  endsAt?: string | null;
  purchase?: { docType: string; pos: number; number: number } | null;
  production?: { docType: string; pos: number; number: number } | null;
  sale?: { docType: string; pos: number; number: number } | null;
};

type Receipt = {
  number: number;
  client: string;
  issuedAt: string | null;
  amount: number;
  invoices: { docType: string; pos: number; number: number }[];
};

type PaymentLot = {
  number: number;
  vendor: string;
  issuedAt: string | null;
  notes?: string | null;
  amount: number;
  invoices: Comp[];
  treasury?: TreasuryLine[];
};

type Payload = {
  clients: { name: string; legalName: string | null }[];
  vendors: { name: string; kind: number; paymentDays: number }[];
  receipts?: Receipt[];
  paymentLots?: PaymentLot[];
  gestionLines?: GestionLine[];
  orders: {
    number: string;
    client: string;
    month: number;
    year: number;
    issuedAt: string | null;
    items: {
      element: string;
      location: string | null;
      quantity: number;
      startsAt: string | null;
      endsAt: string | null;
    }[];
    purchases: Comp[];
    productions: Comp[];
    saleInvoices: Comp[];
  }[];
};

function at(iso?: string | null) {
  if (!iso) return new Date("2026-01-15T12:00:00");
  return new Date(`${iso}T12:00:00`);
}

function addDays(d: Date, days: number) {
  return new Date(d.getTime() + days * 86400000);
}

function pickId(map: Map<string, string>, name: string | null | undefined) {
  if (!name) return undefined;
  const direct = map.get(name);
  if (direct) return direct;
  const upper = name.toUpperCase();
  for (const [key, id] of map) {
    const k = key.toUpperCase();
    if (k === upper || k.startsWith(upper + " ") || k.startsWith(upper + "(") || k.includes(upper)) {
      return id;
    }
  }
  return undefined;
}

async function main() {
  const file = path.join(process.cwd(), "data", "admin-2026.json");
  console.log(`JSON ${file}`);
  console.log(`DB   ${dbHost(databaseUrl())}`);
  process.stdout.write("Conectando… ");
  await prisma.$connect();
  console.log("ok");

  const data = JSON.parse(readFileSync(file, "utf8")) as Payload;
  console.log(
    `Payload: ${data.clients.length} clientes · ${data.vendors.length} proveedores · ${data.orders.length} órdenes`,
  );

  let company = await prisma.erpCompany.findFirst({
    where: { OR: [{ id: "seed-nextmedia" }, { name: "NextMedia" }] },
  });
  if (!company) {
    company = await prisma.erpCompany.create({
      data: {
        id: "seed-nextmedia",
        name: "NextMedia",
        currency: "ARS",
        paymentDays: 30,
      },
    });
  }

  const clientIds = new Map<string, string>();
  console.log("Clientes…");
  for (const c of data.clients) {
    const existing = await prisma.erpClient.findFirst({ where: { name: c.name } });
    const row = existing
      ? await prisma.erpClient.update({
          where: { id: existing.id },
          data: { legalName: c.legalName ?? existing.legalName },
        })
      : await prisma.erpClient.create({
          data: {
            name: c.name,
            legalName: c.legalName,
            companyId: company.id,
          },
        });
    clientIds.set(c.name, row.id);
  }

  const vendorIds = new Map<string, string>();
  console.log("Proveedores…");
  for (const v of data.vendors) {
    const existing = await prisma.erpVendor.findFirst({ where: { name: v.name } });
    const row = existing
      ? await prisma.erpVendor.update({
          where: { id: existing.id },
          data: { kind: v.kind, paymentDays: v.paymentDays },
        })
      : await prisma.erpVendor.create({
          data: {
            name: v.name,
            kind: v.kind,
            paymentDays: v.paymentDays,
          },
        });
    vendorIds.set(v.name, row.id);
  }

  let createdOrders = 0;
  console.log("Órdenes…");
  for (const o of data.orders) {
    const clientId = clientIds.get(o.client);
    if (!clientId) continue;
    const issuedAt = at(o.issuedAt);
    const saleNet = o.saleInvoices.reduce((acc, i) => acc + (i.net || 0), 0);
    const saleVat = o.saleInvoices.reduce((acc, i) => acc + (i.vat || 0), 0);
    const hasSale = o.saleInvoices.length > 0;

    let order = await prisma.erpSaleOrder.findFirst({
      where: { number: o.number, year: o.year },
    });
    const payload = {
      clientId,
      issuedAt,
      month: o.month,
      year: o.year,
      number: o.number,
      net: saleNet,
      vat: saleVat,
      amount: saleNet + saleVat,
      estado: hasSale ? 4 : 1,
    };
    order = order
      ? await prisma.erpSaleOrder.update({ where: { id: order.id }, data: payload })
      : await prisma.erpSaleOrder.create({ data: payload });
    createdOrders += 1;
    if (createdOrders % 5 === 0 || createdOrders === data.orders.length) {
      console.log(`  ${createdOrders}/${data.orders.length} ${o.number}`);
    }

    await prisma.erpCampaignItem.deleteMany({ where: { saleOrderId: order.id } });
    if (o.items.length) {
      await prisma.erpCampaignItem.createMany({
        data: o.items.map((item) => ({
          saleOrderId: order.id,
          element: item.element,
          location: item.location,
          quantity: item.quantity,
          startsAt: item.startsAt ? at(item.startsAt) : null,
          endsAt: item.endsAt ? at(item.endsAt) : null,
        })),
      });
    }

    for (const p of o.purchases) {
      if (!p.vendor) continue;
      const vendorId = vendorIds.get(p.vendor);
      if (!vendorId) continue;
      const poNumber = String(p.poNumber ?? o.number);
      let po = await prisma.erpPurchaseOrder.findFirst({
        where: { saleOrderId: order.id, vendorId, number: poNumber },
      });
      if (!po) {
        po = await prisma.erpPurchaseOrder.create({
          data: {
            saleOrderId: order.id,
            vendorId,
            issuedAt: at(p.issuedAt),
            number: poNumber,
            net: 0,
            vat: 0,
            amount: 0,
            estado: 1,
          },
        });
      }
      const exists = await prisma.erpPurchaseInvoice.findFirst({
        where: { vendorId, pos: p.pos, number: p.number, docType: p.docType },
      });
      const issued = at(p.issuedAt);
      const purchaseData = {
        vendorId,
        issuedAt: issued,
        dueAt: addDays(issued, 60),
        docType: p.docType,
        pos: p.pos,
        number: p.number,
        amount: p.net,
        vat: p.vat,
        iibbCaba: p.iibb ?? 0,
        vatWithholding: p.percVat ?? 0,
        isCreditNote: Boolean(p.credit) || p.net < 0,
        diegoFee: p.diegoFee ?? 0,
        payStatus: p.payStatus ?? 0,
      };
      if (exists) {
        await prisma.erpPurchaseInvoice.update({
          where: { id: exists.id },
          data: {
            iibbCaba: p.iibb ?? exists.iibbCaba,
            vatWithholding: p.percVat ?? exists.vatWithholding,
            diegoFee: p.diegoFee ?? exists.diegoFee,
          },
        });
      } else {
        await prisma.erpPurchaseInvoice.create({
          data: {
            ...purchaseData,
            orderLinks: {
              create: { purchaseOrderId: po.id, vendorKind: 0 },
            },
          },
        });
      }
    }

    for (const p of o.productions) {
      if (!p.vendor) continue;
      const vendorId = vendorIds.get(p.vendor);
      if (!vendorId) continue;
      const poNumber = String(p.poNumber ?? o.number);
      let prod = await prisma.erpProductionOrder.findFirst({
        where: { saleOrderId: order.id, vendorId, number: poNumber },
      });
      if (!prod) {
        prod = await prisma.erpProductionOrder.create({
          data: {
            saleOrderId: order.id,
            vendorId,
            issuedAt: at(p.issuedAt),
            number: poNumber,
            net: 0,
            vat: 0,
            amount: 0,
            estado: 1,
          },
        });
      }
      if (!p.number) continue;
      const exists = await prisma.erpPurchaseInvoice.findFirst({
        where: { vendorId, pos: p.pos, number: p.number, docType: p.docType },
      });
      if (exists) continue;
      const issued = at(p.issuedAt);
      await prisma.erpPurchaseInvoice.create({
        data: {
          vendorId,
          issuedAt: issued,
          dueAt: addDays(issued, 60),
          docType: p.docType,
          pos: p.pos,
          number: p.number,
          amount: p.net,
          vat: p.vat,
          payStatus: p.payStatus ?? 0,
          orderLinks: {
            create: { productionOrderId: prod.id, vendorKind: 1 },
          },
        },
      });
    }

    for (const s of o.saleInvoices) {
      const issued = at(s.issuedAt);
      const collected =
        s.collectStatus === 1 ? (s.collected || s.net + s.vat) : (s.collected ?? 0);
      const data = {
        clientId,
        saleOrderId: order.id,
        issuedAt: issued,
        dueAt: addDays(issued, 30),
        docType: s.docType,
        pos: s.pos,
        number: s.number,
        amount: s.net,
        vat: s.vat,
        legalName: s.legalName ?? null,
        detail: s.detail ?? null,
        collected,
        receiptRef: s.receiptRef ?? null,
        retGan: s.retGan ?? 0,
        retVat: s.retVat ?? 0,
        retSuss: s.retSuss ?? 0,
        retIibb: s.retIibb ?? 0,
        echeq: s.echeq ?? 0,
        bank: s.bank ?? 0,
        collectStatus: s.collectStatus ?? 0,
      };
      const exists = await prisma.erpSaleInvoice.findFirst({
        where: { saleOrderId: order.id, pos: s.pos, number: s.number, docType: s.docType },
      });
      if (exists) {
        await prisma.erpSaleInvoice.update({ where: { id: exists.id }, data });
      } else {
        await prisma.erpSaleInvoice.create({ data });
      }
    }

    const pos = await prisma.erpPurchaseOrder.findMany({
      where: { saleOrderId: order.id },
      include: { invoiceLinks: { include: { invoice: true } } },
    });
    for (const po of pos) {
      const net = po.invoiceLinks.reduce((a, l) => a + Number(l.invoice.amount), 0);
      const vat = po.invoiceLinks.reduce((a, l) => a + Number(l.invoice.vat), 0);
      await prisma.erpPurchaseOrder.update({
        where: { id: po.id },
        data: { net, vat, amount: net + vat, estado: net ? 4 : 1 },
      });
    }
    const prods = await prisma.erpProductionOrder.findMany({
      where: { saleOrderId: order.id },
      include: { invoiceLinks: { include: { invoice: true } } },
    });
    for (const po of prods) {
      const net = po.invoiceLinks.reduce((a, l) => a + Number(l.invoice.amount), 0);
      const vat = po.invoiceLinks.reduce((a, l) => a + Number(l.invoice.vat), 0);
      await prisma.erpProductionOrder.update({
        where: { id: po.id },
        data: { net, vat, amount: net + vat, estado: net ? 4 : 1 },
      });
    }
  }

  let createdReceipts = 0;
  for (const rec of data.receipts ?? []) {
    const clientId = pickId(clientIds, rec.client);
    if (!clientId || !rec.number) continue;
    let receipt = await prisma.erpSaleReceipt.findFirst({
      where: { clientId, number: rec.number },
    });
    const amount = rec.amount || 0;
    if (!receipt) {
      receipt = await prisma.erpSaleReceipt.create({
        data: {
          clientId,
          issuedAt: at(rec.issuedAt),
          number: rec.number,
          amount,
          balance: 0,
        },
      });
      createdReceipts += 1;
    } else {
      await prisma.erpSaleReceipt.update({
        where: { id: receipt.id },
        data: { amount, issuedAt: at(rec.issuedAt), balance: 0 },
      });
    }
    for (const ref of rec.invoices) {
      const invoice = await prisma.erpSaleInvoice.findFirst({
        where: { clientId, pos: ref.pos, number: ref.number, docType: ref.docType },
      });
      if (!invoice) continue;
      await prisma.erpSaleReceiptInvoice.upsert({
        where: { receiptId_invoiceId: { receiptId: receipt.id, invoiceId: invoice.id } },
        create: { receiptId: receipt.id, invoiceId: invoice.id },
        update: {},
      });
    }
  }

  let createdLots = 0;
  console.log("Órdenes de pago…");
  for (const lot of data.paymentLots ?? []) {
    const vendorId = pickId(vendorIds, lot.vendor);
    if (!vendorId) continue;
    const invoiceIds: string[] = [];
    for (const inv of lot.invoices) {
      let row = await prisma.erpPurchaseInvoice.findFirst({
        where: { vendorId, pos: inv.pos, number: inv.number, docType: inv.docType },
      });
      const issued = at(inv.issuedAt);
      if (!row) {
        row = await prisma.erpPurchaseInvoice.create({
          data: {
            vendorId,
            issuedAt: issued,
            dueAt: addDays(issued, 60),
            docType: inv.docType,
            pos: inv.pos,
            number: inv.number,
            amount: inv.net,
            vat: inv.vat ?? 0,
            isCreditNote: Boolean(inv.credit) || inv.net < 0,
            payStatus: inv.payStatus ?? 1,
          },
        });
      } else if ((inv.payStatus ?? 1) === 1) {
        await prisma.erpPurchaseInvoice.update({
          where: { id: row.id },
          data: { payStatus: 1 },
        });
      }
      invoiceIds.push(row.id);
    }
    let po = await prisma.erpPaymentOrder.findFirst({
      where: { vendorId, number: lot.number },
    });
    const amount = lot.amount || 0;
    if (!po) {
      po = await prisma.erpPaymentOrder.create({
        data: {
          vendorId,
          issuedAt: at(lot.issuedAt),
          number: lot.number,
          amount,
          balance: 0,
          notes: lot.notes ?? null,
        },
      });
      createdLots += 1;
    } else {
      await prisma.erpPaymentOrder.update({
        where: { id: po.id },
        data: { amount, notes: lot.notes ?? po.notes, issuedAt: at(lot.issuedAt), balance: 0 },
      });
    }
    for (const invoiceId of invoiceIds) {
      await prisma.erpPaymentOrderInvoice.upsert({
        where: { paymentOrderId_invoiceId: { paymentOrderId: po.id, invoiceId } },
        create: { paymentOrderId: po.id, invoiceId },
        update: {},
      });
    }

    let purchaseReceipt = await prisma.erpPurchaseReceipt.findFirst({
      where: { vendorId, number: lot.number },
    });
    if (!purchaseReceipt) {
      purchaseReceipt = await prisma.erpPurchaseReceipt.create({
        data: {
          vendorId,
          issuedAt: at(lot.issuedAt),
          number: lot.number,
          amount,
          balance: 0,
        },
      });
    }
    for (const invoiceId of invoiceIds) {
      await prisma.erpPurchaseReceiptInvoice.upsert({
        where: { receiptId_invoiceId: { receiptId: purchaseReceipt.id, invoiceId } },
        create: { receiptId: purchaseReceipt.id, invoiceId },
        update: {},
      });
    }

    const existingTreasury = await prisma.erpTreasuryPayment.count({
      where: { paymentOrderId: po.id },
    });
    if (!existingTreasury) {
      const lines: TreasuryLine[] = lot.treasury?.length
        ? lot.treasury
        : lot.notes
          ? [{ kind: /echeq|endoso/i.test(lot.notes) ? "echeq" : "transfer", amount, number: null }]
          : [];
      for (const line of lines) {
        await prisma.erpTreasuryPayment.create({
          data: {
            purchaseReceiptId: purchaseReceipt.id,
            paymentOrderId: po.id,
            paymentKind: line.kind === "transfer" ? 2 : 1,
            number: line.number ?? (line.kind === "transfer" ? `TR-OP${lot.number}` : `ECH-OP${lot.number}`),
            notes: lot.notes ?? null,
            issuedAt: line.issuedAt ? at(line.issuedAt) : at(lot.issuedAt),
            paidAt: line.paidAt ? at(line.paidAt) : at(lot.issuedAt),
            amount: line.amount || amount,
            estado: 1,
          },
        });
      }
    }
  }

  let createdLines = 0;
  console.log("Gestión…");
  const orderByNumber = new Map<string, string>();
  for (const o of data.orders) {
    const row = await prisma.erpSaleOrder.findFirst({
      where: { number: o.number, year: o.year },
      select: { id: true },
    });
    if (row) orderByNumber.set(o.number, row.id);
  }
  for (const [, orderId] of orderByNumber) {
    await prisma.erpGestionLine.deleteMany({ where: { saleOrderId: orderId } });
  }
  for (const line of data.gestionLines ?? []) {
    const saleOrderId = orderByNumber.get(line.order);
    if (!saleOrderId) continue;
    const purchase = line.purchase
      ? await prisma.erpPurchaseInvoice.findFirst({
          where: { pos: line.purchase.pos, number: line.purchase.number, docType: line.purchase.docType },
        })
      : null;
    const production = line.production
      ? await prisma.erpPurchaseInvoice.findFirst({
          where: { pos: line.production.pos, number: line.production.number, docType: line.production.docType },
        })
      : null;
    const sale = line.sale
      ? await prisma.erpSaleInvoice.findFirst({
          where: { saleOrderId, pos: line.sale.pos, number: line.sale.number, docType: line.sale.docType },
        })
      : null;
    await prisma.erpGestionLine.create({
      data: {
        saleOrderId,
        sort: line.sort,
        element: line.element ?? null,
        location: line.location ?? null,
        quantity: line.quantity ?? 0,
        startsAt: line.startsAt ? at(line.startsAt) : null,
        endsAt: line.endsAt ? at(line.endsAt) : null,
        purchaseInvoiceId: purchase?.id ?? null,
        productionInvoiceId: production?.id ?? null,
        saleInvoiceId: sale?.id ?? null,
      },
    });
    createdLines += 1;
  }

  const collectedOrphans = await prisma.erpSaleInvoice.findMany({
    where: { collectStatus: 1, receiptLinks: { none: {} } },
    include: { client: { select: { id: true } } },
  });
  for (const inv of collectedOrphans) {
    const raw = (inv.receiptRef ?? "").toUpperCase();
    const m = raw.match(/X\s*0*(\d+)/);
    const number = m ? Number(m[1]) : 800000 + inv.number;
    let receipt = await prisma.erpSaleReceipt.findFirst({
      where: { clientId: inv.clientId, number },
    });
    if (!receipt) {
      receipt = await prisma.erpSaleReceipt.create({
        data: {
          clientId: inv.clientId,
          issuedAt: inv.issuedAt,
          number,
          amount: Number(inv.collected) || Number(inv.amount) + Number(inv.vat),
          balance: 0,
        },
      });
      createdReceipts += 1;
    }
    await prisma.erpSaleReceiptInvoice.upsert({
      where: { receiptId_invoiceId: { receiptId: receipt.id, invoiceId: inv.id } },
      create: { receiptId: receipt.id, invoiceId: inv.id },
      update: {},
    });
  }

  const saleReceipts = await prisma.erpSaleReceipt.findMany({
    include: { invoices: { include: { invoice: true } }, payments: true },
  });
  for (const rec of saleReceipts) {
    if (rec.payments.length) continue;
    const echeq = rec.invoices.reduce((a, l) => a + Number(l.invoice.echeq), 0);
    const bank = rec.invoices.reduce((a, l) => a + Number(l.invoice.bank), 0);
    if (echeq > 0.009) {
      await prisma.erpTreasuryPayment.create({
        data: {
          saleReceiptId: rec.id,
          paymentKind: 1,
          number: `ECH-X${rec.number}`,
          issuedAt: rec.issuedAt,
          paidAt: rec.issuedAt,
          amount: echeq,
          estado: 1,
        },
      });
    }
    if (bank > 0.009) {
      await prisma.erpTreasuryPayment.create({
        data: {
          saleReceiptId: rec.id,
          paymentKind: 2,
          number: `TR-X${rec.number}`,
          issuedAt: rec.issuedAt,
          paidAt: rec.issuedAt,
          amount: bank,
          estado: 1,
        },
      });
    }
  }

  console.log(
    `Import OK · ${createdOrders} órdenes · ${createdLines} filas Gestión · ${createdReceipts} recibos · ${createdLots} OP`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
