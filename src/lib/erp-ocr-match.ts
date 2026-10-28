import { prisma } from "@/lib/prisma";
import {
  ERP_CASH_MODE,
  ERP_COLLECT,
  ERP_ORDER,
  erpCashMode,
  invoiceCoverAmount,
  isSaleOrderOpen,
  money,
  saleOrderInvoiceCover,
  saleOrderPickLabel,
  saleOrderRemaining,
} from "@/lib/erp";
import {
  amountReview,
  fitScore,
  pickSure,
  scoreSaleOrder,
  scoreSupplierOrder,
} from "@/lib/erp-ocr-score";
import {
  EMPTY_OCR_CANDIDATES,
  fixOcrDueByTerms,
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
  /** Busca duplicados entre facturas de compra IVA en vez de las comunes. */
  vatPurchase?: boolean;
};

/** Palabras que comparten muchos proveedores y clientes: no identifican a nadie. */
const GENERIC_TOKENS = new Set([
  "srl", "sa", "sas", "sociedad", "argentina", "de", "del", "la", "el", "los", "las", "cia",
  "publicidad", "publicity", "publicitaria", "media", "medios", "grupo", "group", "via", "publica",
  "comunicacion", "comunicaciones", "producciones", "servicios",
]);

function tokens(name: string) {
  return foldName(name)
    .split(" ")
    .filter((part) => part.length > 1 && !GENERIC_TOKENS.has(part));
}

export function nameScore(query: OcrParty, candidate: { name: string; legalName?: string | null; taxId?: string | null }) {
  const qCuit = normalizeCuit(query.taxId);
  const cCuit = normalizeCuit(candidate.taxId);
  if (qCuit && cCuit && qCuit === cCuit) return 1;
  if (qCuit.length === 11 && cCuit.length === 11) return 0;
  const qName = foldName(query.legalName);
  if (!qName) return 0;
  const names = [foldName(candidate.name), foldName(candidate.legalName)].filter(Boolean);
  if (names.some((name) => name === qName)) return 0.92;
  const qTokens = tokens(qName);
  if (!qTokens.length) return 0;
  let best = 0;
  for (const name of names) {
    const cTokens = tokens(name);
    if (!cTokens.length) continue;
    const hit = qTokens.filter((token) => cTokens.includes(token)).length;
    if (hit === qTokens.length || hit === cTokens.length) return 0.78;
    best = Math.max(best, hit / Math.max(qTokens.length, cTokens.length));
  }
  return best >= 0.5 ? 0.5 + best * 0.3 : 0;
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

const supplierOrderSelect = {
  id: true,
  number: true,
  amount: true,
  net: true,
  cashAmount: true,
  cashPayment: true,
  issuedAt: true,
  vendorId: true,
  vendor: { select: { name: true } },
  invoiceLinks: { select: { invoice: { select: { amount: true, vat: true, isCreditNote: true } } } },
} as const;

function topOptions(options: OcrMatchOption[], min = 0.3, max = 5) {
  return options.filter((o) => o.score >= min).slice(0, max);
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
  const total = extracted.total ?? (extracted.amount ?? 0) + (extracted.vat ?? 0);
  return extracted.isCreditNote ? Math.abs(total) : total;
}

function docLabel(docType: string | null, pos: number | null, number: number | null) {
  const type = docType || "?";
  const p = String(pos ?? 0).padStart(4, "0");
  const n = String(number ?? 0).padStart(8, "0");
  return `${type} ${p}-${n}`;
}

function invoiceRefLabel(pos: number | null, number: number) {
  const n = String(number).padStart(8, "0");
  if (pos == null) return n;
  return `${String(pos).padStart(4, "0")}-${n}`;
}

export async function matchOcrExtracted(
  extracted: OcrExtracted,
  kind: OcrKind,
  opts: OcrMatchOptions = {},
): Promise<Omit<OcrMatchResult, "attachmentUrl">> {
  const party = partyForKind(extracted, kind);
  const total = invoiceTotal(extracted);
  const orderFilter = opts.issuedOnly ? { estado: ERP_ORDER.issued } : { estado: { in: [ERP_ORDER.issued, ERP_ORDER.invoiced] } };
  const receiptRefs = extracted.referencedInvoices.filter((ref) => ref.number != null);

  const [clients, vendors, saleOrders, purchaseOrders, productionOrders, saleInvoices, purchaseInvoices, receipts] =
    await Promise.all([
      kind === "purchase_invoice"
        ? Promise.resolve([])
        : prisma.erpClient.findMany({
            where: { estado: 1 },
            select: {
              id: true,
              name: true,
              legalName: true,
              taxId: true,
              company: { select: { paymentDays: true } },
            },
          }),
      kind === "sale_invoice" || kind === "sale_receipt"
        ? Promise.resolve([])
        : prisma.erpVendor.findMany({
            where: { estado: 1 },
            select: { id: true, name: true, taxId: true, paymentDays: true },
          }),
      kind === "sale_invoice"
        ? prisma.erpSaleOrder.findMany({
            where: orderFilter,
            select: {
              id: true,
              number: true,
              amount: true,
              net: true,
              vat: true,
              cashAmount: true,
              issuedAt: true,
              estado: true,
              product: true,
              month: true,
              year: true,
              clientId: true,
              client: { select: { name: true } },
              items: { select: { element: true } },
              invoices: { select: { amount: true, vat: true, docType: true } },
            },
          })
        : Promise.resolve([]),
      kind === "purchase_invoice"
        ? prisma.erpPurchaseOrder.findMany({ where: orderFilter, select: supplierOrderSelect })
        : Promise.resolve([]),
      kind === "purchase_invoice"
        ? prisma.erpProductionOrder.findMany({ where: orderFilter, select: supplierOrderSelect })
        : Promise.resolve([]),
      kind === "sale_invoice"
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
        : kind === "sale_receipt" && receiptRefs.length
        ? prisma.erpSaleInvoice.findMany({
            where: {
              OR: receiptRefs.map((ref) => ({
                number: ref.number as number,
                ...(ref.pos != null ? { pos: ref.pos } : {}),
              })),
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
              isVatPurchase: Boolean(opts.vatPurchase),
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

  const client = pickSure(clientOptions, 0.9);
  const vendor = pickSure(vendorOptions, 0.9);
  const clientGuess = client ?? clientOptions[0] ?? null;
  const vendorGuess = vendor ?? vendorOptions[0] ?? null;

  const paymentDays =
    kind === "purchase_invoice"
      ? vendors.find((row) => row.id === vendor?.id)?.paymentDays
      : kind === "sale_invoice"
        ? clients.find((row) => row.id === client?.id)?.company.paymentDays
        : undefined;
  if (paymentDays != null) extracted = fixOcrDueByTerms(extracted, paymentDays);

  const saleRemaining = new Map<string, number>();
  const saleOrderOptions = saleOrders
    .filter((order) => isSaleOrderOpen(order, saleOrderInvoiceCover(order.invoices)))
    .map((order) => {
      const remaining = saleOrderRemaining(order, saleOrderInvoiceCover(order.invoices));
      saleRemaining.set(order.id, remaining.amount);
      const scored = scoreSaleOrder({
        sameClient: Boolean(clientGuess && order.clientId === clientGuess.id),
        detail: extracted.detail,
        total,
        issuedAt: extracted.issuedAt,
        order: {
          number: order.number,
          product: order.product,
          elements: order.items.map((item) => item.element ?? ""),
          month: order.month,
          year: order.year,
          remaining: remaining.amount,
          full: saleOrderRemaining(order, { amount: 0, vat: 0 }).amount,
        },
      });
      return { ...option(order.id, saleOrderPickLabel(order, remaining), scored.score), reason: scored.reason };
    })
    .sort((a, b) => b.score - a.score);

  const supplierRemaining = new Map<string, number>();
  const purchaseOrderOptions = [
    ...purchaseOrders.map((order) => ({ ...order, prefix: "Compra" })),
    ...productionOrders.map((order) => ({ ...order, prefix: "Producción" })),
  ]
    .filter((order) => vendorGuess && order.vendorId === vendorGuess.id)
    .filter((order) => erpCashMode(Number(order.net), Number(order.cashAmount), order.cashPayment) !== ERP_CASH_MODE.cash)
    .map((order) => {
      const full = Number(order.amount) - Number(order.cashAmount);
      const covered = order.invoiceLinks.reduce((s, link) => s + invoiceCoverAmount(link.invoice), 0);
      const remaining = Math.max(0, full - covered);
      supplierRemaining.set(order.id, remaining);
      const scored = scoreSupplierOrder(fitScore(total, remaining, full), dateScore(extracted.issuedAt, order.issuedAt));
      const label = `${order.prefix} ${order.number} · ${order.vendor.name} · ${money(order.amount)} · resta ${money(remaining)}`;
      return { ...option(order.id, label, scored.score), reason: scored.reason };
    })
    .sort((a, b) => b.score - a.score);

  const missingInvoiceRefs: string[] = [];
  const invoiceOptions: OcrMatchOption[] = [];
  const invoiceCandidates: OcrMatchOption[] = [];
  const review: string[] = [];
  let pickedInvoicesTotal = 0;
  if (kind === "sale_receipt") {
    for (const ref of receiptRefs) {
      const number = ref.number as number;
      const hits = saleInvoices.filter(
        (invoice) => invoice.number === number && (ref.pos == null || invoice.pos === ref.pos),
      );
      const label = invoiceRefLabel(ref.pos, number);
      if (hits.length === 0) {
        missingInvoiceRefs.push(label);
        continue;
      }
      const usable = hits.filter(
        (invoice) =>
          invoice.collectStatus !== ERP_COLLECT.collected && (!clientGuess || invoice.clientId === clientGuess.id),
      );
      const asOption = (invoice: (typeof hits)[number], score: number, reason?: string) => ({
        ...option(
          invoice.id,
          `${invoice.client.name} · ${docLabel(invoice.docType, invoice.pos, invoice.number)} · ${money(Number(invoice.amount) + Number(invoice.vat))}`,
          score,
        ),
        reason,
      });
      if (usable.length === 1 && client) {
        invoiceOptions.push(asOption(usable[0], 0.95));
        pickedInvoicesTotal += Number(usable[0].amount) + Number(usable[0].vat);
        continue;
      }
      if (usable.length > 1) {
        review.push(`La factura ${label} coincide con ${usable.length} facturas del sistema: elegí cuál.`);
        for (const invoice of usable) invoiceCandidates.push(asOption(invoice, 0.6, "mismo número"));
        continue;
      }
      if (usable.length === 1) {
        review.push(`Confirmá la factura ${label}: el cliente no se identificó con seguridad.`);
        invoiceCandidates.push(asOption(usable[0], 0.6, "mismo número"));
        continue;
      }
      const collected = hits.some((invoice) => invoice.collectStatus === ERP_COLLECT.collected);
      review.push(
        collected
          ? `La factura ${label} ya figura cobrada: revisá si corresponde a este recibo.`
          : `La factura ${label} es de otro cliente: revisá el cliente o la factura.`,
      );
      for (const invoice of hits) invoiceCandidates.push(asOption(invoice, 0.4, collected ? "ya cobrada" : "otro cliente"));
    }
  }

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

  const saleOrder = kind === "sale_invoice" && client ? pickSure(saleOrderOptions) : null;
  const purchaseOrder = kind === "purchase_invoice" && vendor ? pickSure(purchaseOrderOptions) : null;
  const invoices = invoiceOptions.filter((row) => row.score >= 0.7).slice(0, 8);

  const blockers: string[] = [];
  if (extracted.number == null) blockers.push("Falta el número.");
  if (!extracted.issuedAt) blockers.push("Falta la fecha.");
  if (kind !== "sale_receipt" && !(extracted.amount ?? 0)) blockers.push("Falta el importe neto.");
  if (kind === "sale_receipt" && !(extracted.amount ?? extracted.total ?? 0)) blockers.push("Falta el importe del recibo.");
  if (kind !== "purchase_invoice" && !client) {
    blockers.push(
      clientOptions.length
        ? "No estoy seguro del cliente: elegí el correcto entre las opciones."
        : "No hay cliente coincidente. Elegilo a mano.",
    );
  }
  if (kind === "purchase_invoice" && !vendor) {
    blockers.push(
      vendorOptions.length
        ? "No estoy seguro del proveedor: elegí el correcto entre las opciones."
        : "No hay proveedor coincidente. Elegilo a mano.",
    );
  }
  const saleTop = topOptions(saleOrderOptions);
  const purchaseTop = topOptions(purchaseOrderOptions);
  if (kind === "sale_invoice" && !saleOrder) {
    blockers.push(
      saleTop.length > 1
        ? `Hay ${saleTop.length} órdenes posibles: elegí la correcta.`
        : saleTop.length === 1
          ? "Confirmá la O.P. de venta sugerida."
          : "Falta vincular una O.P. de venta.",
    );
  }
  if (kind === "purchase_invoice" && !purchaseOrder) {
    blockers.push(
      purchaseTop.length > 1
        ? `Hay ${purchaseTop.length} órdenes de compra o producción posibles: elegí la correcta.`
        : purchaseTop.length === 1
          ? "Confirmá la orden de compra o producción sugerida."
          : "Falta vincular una orden de compra o producción.",
    );
  }
  if (duplicate) blockers.push(`Ya existe ${duplicate.label}.`);
  for (const label of missingInvoiceRefs) {
    blockers.push(`No encontré la factura ${label} en el sistema.`);
  }

  if (kind !== "sale_receipt") {
    review.push(
      ...amountReview({
        docType: extracted.docType,
        amount: extracted.isCreditNote && extracted.amount != null ? Math.abs(extracted.amount) : extracted.amount,
        vat: extracted.isCreditNote && extracted.vat != null ? Math.abs(extracted.vat) : extracted.vat,
        total: extracted.isCreditNote && extracted.total != null ? Math.abs(extracted.total) : extracted.total,
        extras:
          (extracted.nonTaxable ?? 0) +
          (extracted.internalTax ?? 0) +
          (kind === "purchase_invoice"
            ? (extracted.iibbCaba ?? 0) + (extracted.iibbBsAs ?? 0) + (extracted.vatWithholding ?? 0)
            : 0),
        confidence: extracted.fieldConfidence,
      }),
    );
    const picked = saleOrder ?? purchaseOrder;
    const remaining = picked ? (saleRemaining.get(picked.id) ?? supplierRemaining.get(picked.id)) : undefined;
    if (picked && remaining != null && total > remaining + 1 && !extracted.isCreditNote) {
      review.push(`La factura (${money(total)}) supera lo que resta de la orden (${money(remaining)}).`);
    }
  } else {
    const receiptTotal = extracted.amount ?? extracted.total ?? 0;
    const paid = extracted.payments.reduce((s, p) => s + (p.amount || 0), 0);
    if (extracted.payments.length && Math.abs(paid - receiptTotal) > 1) {
      review.push(`Los pagos suman ${money(paid)} y el recibo dice ${money(receiptTotal)}.`);
    }
    if (invoices.length && invoices.length === receiptRefs.length && Math.abs(pickedInvoicesTotal - receiptTotal) > 1) {
      review.push(`Las facturas suman ${money(pickedInvoicesTotal)} y el recibo dice ${money(receiptTotal)}.`);
    }
    const low = ["amount", "number"].filter((k) => (extracted.fieldConfidence[k] ?? 1) < 0.8);
    if (low.length) review.push("El OCR no está seguro del importe o el número del recibo.");
  }

  return {
    extracted,
    client: kind === "purchase_invoice" ? null : client,
    vendor: kind === "purchase_invoice" ? vendor : null,
    saleOrder,
    purchaseOrder,
    invoices,
    duplicate,
    candidates: {
      ...EMPTY_OCR_CANDIDATES,
      client: kind === "purchase_invoice" ? [] : topOptions(clientOptions),
      vendor: kind === "purchase_invoice" ? topOptions(vendorOptions) : [],
      saleOrder: saleTop,
      purchaseOrder: purchaseTop,
      invoices: invoiceCandidates,
    },
    review,
    ready: blockers.length === 0 && review.length === 0,
    blockers,
  };
}
