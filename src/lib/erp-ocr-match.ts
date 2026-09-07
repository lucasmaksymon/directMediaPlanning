import { prisma } from "@/lib/prisma";
import { ERP_COLLECT, ERP_ORDER, money } from "@/lib/erp";
import {
  foldName,
  isOurCompany,
  normalizeCuit,
  type OcrExtracted,
  type OcrKind,
  type OcrMatchOption,
  type OcrMatchResult,
  type OcrParty,
} from "@/lib/erp-ocr";

export type OcrMatchOptions = {
  issuedOnly?: boolean;
};

function tokens(name: string) {
  return foldName(name)
    .split(" ")
    .filter((part) => part.length > 2 && !["srl", "sa", "sas", "sociedad", "argentina"].includes(part));
}

function nameScore(query: OcrParty, candidate: { name: string; legalName?: string | null; taxId?: string | null }) {
  const qCuit = normalizeCuit(query.taxId);
  const cCuit = normalizeCuit(candidate.taxId);
  if (qCuit && cCuit && qCuit === cCuit) return 1;
  const qName = foldName(query.legalName);
  if (!qName) return 0;
  const names = [foldName(candidate.name), foldName(candidate.legalName)].filter(Boolean);
  if (names.some((name) => name === qName)) return 0.92;
  if (names.some((name) => name.includes(qName) || qName.includes(name))) return 0.78;
  const qTokens = tokens(qName);
  if (!qTokens.length) return 0;
  let best = 0;
  for (const name of names) {
    const cTokens = tokens(name);
    if (!cTokens.length) continue;
    const hit = qTokens.filter((token) => cTokens.includes(token)).length;
    best = Math.max(best, hit / Math.max(qTokens.length, cTokens.length));
  }
  return best >= 0.5 ? 0.5 + best * 0.3 : 0;
}

function amountScore(left: number | null | undefined, right: number | null | undefined) {
  if (left == null || right == null || (left === 0 && right === 0)) return 0.3;
  const max = Math.max(Math.abs(left), Math.abs(right), 1);
  return Math.max(0, 1 - Math.abs(left - right) / max);
}

function dateScore(left: string | null | undefined, right: Date | null | undefined) {
  if (!left || !right) return 0.4;
  const a = new Date(`${left}T12:00:00`).getTime();
  const b = right.getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return 0.4;
  const days = Math.abs(a - b) / 86400000;
  return Math.max(0, 1 - days / 60);
}

function option(id: string, label: string, score: number): OcrMatchOption {
  return { id, label, score: Math.round(score * 100) / 100 };
}

function best(options: OcrMatchOption[], min = 0.45) {
  return options[0] && options[0].score >= min ? options[0] : null;
}

function partyForKind(extracted: OcrExtracted, kind: OcrKind): OcrParty {
  if (kind === "purchase_invoice") {
    return isOurCompany(extracted.issuer) ? extracted.recipient : extracted.issuer;
  }
  if (isOurCompany(extracted.recipient)) return extracted.issuer;
  if (isOurCompany(extracted.issuer)) return extracted.recipient;
  return extracted.recipient.legalName || extracted.recipient.taxId ? extracted.recipient : extracted.issuer;
}

function invoiceTotal(extracted: OcrExtracted) {
  return extracted.total ?? (extracted.amount ?? 0) + (extracted.vat ?? 0);
}

function docLabel(docType: string | null, pos: number | null, number: number | null) {
  const type = docType || "?";
  const p = String(pos ?? 0).padStart(4, "0");
  const n = String(number ?? 0).padStart(8, "0");
  return `${type} ${p}-${n}`;
}

export async function matchOcrExtracted(
  extracted: OcrExtracted,
  kind: OcrKind,
  opts: OcrMatchOptions = {},
): Promise<Omit<OcrMatchResult, "attachmentUrl">> {
  const party = partyForKind(extracted, kind);
  const total = invoiceTotal(extracted);
  const orderFilter = opts.issuedOnly ? { estado: ERP_ORDER.issued } : { estado: { in: [ERP_ORDER.issued, ERP_ORDER.invoiced] } };

  const [clients, vendors, saleOrders, purchaseOrders, productionOrders, saleInvoices, purchaseInvoices, receipts] =
    await Promise.all([
      kind === "purchase_invoice"
        ? Promise.resolve([])
        : prisma.erpClient.findMany({
            where: { estado: 1 },
            select: { id: true, name: true, legalName: true, taxId: true },
          }),
      kind === "sale_invoice" || kind === "sale_receipt"
        ? Promise.resolve([])
        : prisma.erpVendor.findMany({
            where: { estado: 1 },
            select: { id: true, name: true, taxId: true },
          }),
      kind === "sale_invoice"
        ? prisma.erpSaleOrder.findMany({
            where: orderFilter,
            select: {
              id: true,
              number: true,
              amount: true,
              net: true,
              issuedAt: true,
              estado: true,
              clientId: true,
              client: { select: { name: true } },
            },
          })
        : Promise.resolve([]),
      kind === "purchase_invoice"
        ? prisma.erpPurchaseOrder.findMany({
            where: orderFilter,
            select: {
              id: true,
              number: true,
              amount: true,
              issuedAt: true,
              vendorId: true,
              vendor: { select: { name: true } },
            },
          })
        : Promise.resolve([]),
      kind === "purchase_invoice"
        ? prisma.erpProductionOrder.findMany({
            where: orderFilter,
            select: {
              id: true,
              number: true,
              amount: true,
              issuedAt: true,
              vendorId: true,
              vendor: { select: { name: true } },
            },
          })
        : Promise.resolve([]),
      kind === "sale_invoice" || kind === "sale_receipt"
        ? prisma.erpSaleInvoice.findMany({
            where: {
              ...(extracted.number != null ? { number: extracted.number } : {}),
              ...(extracted.pos != null ? { pos: extracted.pos } : {}),
            },
            select: {
              id: true,
              docType: true,
              pos: true,
              number: true,
              amount: true,
              vat: true,
              issuedAt: true,
              collectStatus: true,
              clientId: true,
              client: { select: { name: true, taxId: true } },
            },
            take: 400,
          })
        : Promise.resolve([]),
      kind === "purchase_invoice"
        ? prisma.erpPurchaseInvoice.findMany({
            where: {
              isVatPurchase: false,
              ...(extracted.number != null ? { number: extracted.number } : {}),
              ...(extracted.pos != null ? { pos: extracted.pos } : {}),
            },
            select: {
              id: true,
              docType: true,
              pos: true,
              number: true,
              vendorId: true,
              vendor: { select: { name: true, taxId: true } },
            },
            take: 400,
          })
        : Promise.resolve([]),
      kind === "sale_receipt" && extracted.number != null
        ? prisma.erpSaleReceipt.findMany({
            where: { number: extracted.number },
            select: { id: true, number: true, client: { select: { name: true } } },
            take: 20,
          })
        : Promise.resolve([]),
    ]);

  const clientOptions = clients
    .map((client) =>
      option(
        client.id,
        `${client.name}${client.taxId ? ` · ${client.taxId}` : ""}`,
        nameScore(party, client),
      ),
    )
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);

  const vendorOptions = vendors
    .map((vendor) => option(vendor.id, `${vendor.name}${vendor.taxId ? ` · ${vendor.taxId}` : ""}`, nameScore(party, vendor)))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);

  const client = best(clientOptions);
  const vendor = best(vendorOptions);

  const saleOrderOptions = saleOrders
    .map((order) => {
      const partyBoost = client && order.clientId === client.id ? 1 : 0.15;
      const score =
        partyBoost * 0.5 +
        amountScore(Number(order.amount), total) * 0.3 +
        dateScore(extracted.issuedAt, order.issuedAt) * 0.2;
      return option(order.id, `${order.number} · ${order.client.name} · ${money(order.amount)}`, score);
    })
    .sort((a, b) => b.score - a.score);

  const purchaseOrderOptions = [
    ...purchaseOrders.map((order) => ({
      ...order,
      label: `Compra ${order.number} · ${order.vendor.name} · ${money(order.amount)}`,
    })),
    ...productionOrders.map((order) => ({
      ...order,
      label: `Producción ${order.number} · ${order.vendor.name} · ${money(order.amount)}`,
    })),
  ]
    .map((order) => {
      const partyBoost = vendor && order.vendorId === vendor.id ? 1 : 0.15;
      const score =
        partyBoost * 0.5 +
        amountScore(Number(order.amount), total) * 0.3 +
        dateScore(extracted.issuedAt, order.issuedAt) * 0.2;
      return option(order.id, order.label, score);
    })
    .sort((a, b) => b.score - a.score);

  const invoiceOptions =
    kind === "sale_receipt" && client
      ? saleInvoices
          .filter((invoice) => invoice.clientId === client.id)
          .map((invoice) => {
            const pending = invoice.collectStatus !== ERP_COLLECT.collected ? 0.2 : 0;
            const score =
              0.55 +
              pending +
              amountScore(Number(invoice.amount) + Number(invoice.vat), total) * 0.2 +
              dateScore(extracted.issuedAt, invoice.issuedAt) * 0.05;
            return option(
              invoice.id,
              `${invoice.client.name} · ${docLabel(invoice.docType, invoice.pos, invoice.number)} · ${money(Number(invoice.amount) + Number(invoice.vat))}`,
              score,
            );
          })
          .sort((a, b) => b.score - a.score)
          .slice(0, 5)
      : [];

  let duplicate: OcrMatchResult["duplicate"] = null;
  if (kind === "sale_invoice" && extracted.number != null) {
    const hit = saleInvoices.find((invoice) => {
      const sameNumber = invoice.number === extracted.number && (extracted.pos == null || invoice.pos === extracted.pos);
      const sameParty =
        !client ||
        invoice.clientId === client.id ||
        normalizeCuit(invoice.client.taxId) === normalizeCuit(party.taxId);
      return sameNumber && sameParty;
    });
    if (hit) {
      duplicate = {
        id: hit.id,
        label: `${docLabel(hit.docType, hit.pos, hit.number)} · ${hit.client.name}`,
      };
    }
  }
  if (kind === "purchase_invoice" && extracted.number != null) {
    const hit = purchaseInvoices.find((invoice) => {
      const sameNumber = invoice.number === extracted.number && (extracted.pos == null || invoice.pos === extracted.pos);
      const sameParty =
        !vendor ||
        invoice.vendorId === vendor.id ||
        normalizeCuit(invoice.vendor.taxId) === normalizeCuit(party.taxId);
      return sameNumber && sameParty;
    });
    if (hit) {
      duplicate = {
        id: hit.id,
        label: `${docLabel(hit.docType, hit.pos, hit.number)} · ${hit.vendor.name}`,
      };
    }
  }
  if (kind === "sale_receipt" && extracted.number != null) {
    const hit = receipts.find((row) => row.number === extracted.number);
    if (hit) {
      duplicate = { id: hit.id, label: `Recibo ${String(hit.number).padStart(8, "0")} · ${hit.client.name}` };
    }
  }

  const saleOrder = kind === "sale_invoice" ? best(saleOrderOptions, 0.55) : null;
  const purchaseOrder = kind === "purchase_invoice" ? best(purchaseOrderOptions, 0.55) : null;
  const invoices = invoiceOptions.filter((row) => row.score >= 0.7).slice(0, 3);

  const blockers: string[] = [];
  if (extracted.number == null) blockers.push("Falta el número.");
  if (!extracted.issuedAt) blockers.push("Falta la fecha.");
  if (kind !== "purchase_invoice" && !client) blockers.push("No hay cliente coincidente. Elegilo a mano.");
  if (kind === "purchase_invoice" && !vendor) blockers.push("No hay proveedor coincidente. Elegilo a mano.");
  if (kind === "sale_invoice" && !saleOrder) blockers.push("Falta vincular una O.P. de venta.");
  if (kind === "purchase_invoice" && !purchaseOrder) blockers.push("Falta vincular una orden de compra o producción.");
  if (duplicate) blockers.push(`Ya existe ${duplicate.label}.`);

  return {
    extracted,
    client: kind === "purchase_invoice" ? null : client,
    vendor: kind === "purchase_invoice" ? vendor : null,
    saleOrder,
    purchaseOrder,
    invoices,
    duplicate,
    ready: blockers.length === 0,
    blockers,
  };
}
