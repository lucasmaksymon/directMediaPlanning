import { prisma } from "@/lib/prisma";
import { ERP_VENDOR } from "@/lib/erp";
import {
  ORDER_OCR_KIND_LABEL,
  orderNumberRoot,
  type OrderOcrExtracted,
  type OrderOcrKind,
  type OrderOcrMatchResult,
  type OrderOcrPick,
} from "@/lib/erp-order-ocr";

const STOP_WORDS = new Set(["srl", "sa", "sau", "sas", "sociedad", "argentina", "s", "a", "l", "r", "y", "de"]);

export function foldPartyName(raw: string | null | undefined) {
  return String(raw ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((part) => part && !STOP_WORDS.has(part))
    .join(" ");
}

function bigrams(s: string) {
  const compact = s.replace(/\s+/g, "");
  const out = new Map<string, number>();
  for (let i = 0; i < compact.length - 1; i += 1) {
    const g = compact.slice(i, i + 2);
    out.set(g, (out.get(g) ?? 0) + 1);
  }
  return out;
}

function dice(a: string, b: string) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const ga = bigrams(a);
  const gb = bigrams(b);
  let hit = 0;
  let total = 0;
  for (const [g, n] of ga) {
    hit += Math.min(n, gb.get(g) ?? 0);
    total += n;
  }
  for (const n of gb.values()) total += n;
  return total ? (2 * hit) / total : 0;
}

/**
 * Las órdenes escriben al cliente o al medio a mano ("DF ENTERTAIMENT", "OSP SA - ESTATIC SA"),
 * así que además del nombre exacto se tolera typo y que el PDF nombre a dos razones sociales juntas.
 */
export function partyScore(query: string | null | undefined, names: (string | null | undefined)[]) {
  const variants = String(query ?? "")
    .split(/\s[-/]\s|\s\/|\/\s|\//)
    .map(foldPartyName)
    .filter(Boolean);
  const whole = foldPartyName(query);
  if (whole && !variants.includes(whole)) variants.unshift(whole);
  let best = 0;
  for (const candidate of names.map(foldPartyName).filter(Boolean)) {
    for (const q of variants) {
      if (q === candidate) return 1;
      if (q.length >= 4 && (candidate.includes(q) || q.includes(candidate)) && candidate.length >= 3) {
        best = Math.max(best, 0.85);
      }
      best = Math.max(best, dice(q, candidate) * 0.9);
    }
  }
  return best;
}

function pickBest<T>(rows: T[], score: (row: T) => number, min = 0.62) {
  let best: { row: T; score: number } | null = null;
  for (const row of rows) {
    const s = score(row);
    if (s >= min && (!best || s > best.score)) best = { row, score: s };
  }
  return best?.row ?? null;
}

async function findSaleOrder(extracted: OrderOcrExtracted, clientName: string | null) {
  const parent = extracted.parentNumber ? orderNumberRoot(extracted.parentNumber) : null;
  if (parent) {
    const byNumber = await prisma.erpSaleOrder.findMany({
      where: { number: { startsWith: parent, mode: "insensitive" } },
      select: { id: true, number: true, client: { select: { name: true } } },
    });
    const hit = byNumber.find((order) => orderNumberRoot(order.number) === parent);
    if (hit) return hit;
  }
  if (!clientName) return null;
  const recent = await prisma.erpSaleOrder.findMany({
    orderBy: { issuedAt: "desc" },
    take: 200,
    select: { id: true, number: true, product: true, client: { select: { name: true, legalName: true } } },
  });
  return pickBest(
    recent,
    (order) =>
      partyScore(clientName, [order.client.name, order.client.legalName]) * 0.6 +
      partyScore(extracted.product, [order.product]) * 0.4,
    0.75,
  );
}

async function findDuplicate(kind: OrderOcrKind, number: string | null, currentId: string | null) {
  if (!number) return null;
  const where = { number: { equals: number, mode: "insensitive" as const }, ...(currentId ? { id: { not: currentId } } : {}) };
  const hit =
    kind === "sale_order"
      ? await prisma.erpSaleOrder.findFirst({ where, select: { id: true, number: true } })
      : kind === "purchase_order"
        ? await prisma.erpPurchaseOrder.findFirst({ where, select: { id: true, number: true } })
        : await prisma.erpProductionOrder.findFirst({ where, select: { id: true, number: true } });
  return hit ? { id: hit.id, label: hit.number } : null;
}

export async function matchOrderOcr(
  extracted: OrderOcrExtracted,
  opts: { currentId?: string | null } = {},
): Promise<Omit<OrderOcrMatchResult, "attachmentUrl">> {
  const kind = extracted.kind;
  const blockers: string[] = [];

  if (extracted.detectedKind && extracted.detectedKind !== kind) {
    blockers.push(
      `Este PDF parece una ${ORDER_OCR_KIND_LABEL[extracted.detectedKind]}, no una ${ORDER_OCR_KIND_LABEL[kind]}. Cargalo en la sección que corresponde.`,
    );
  }

  let client: OrderOcrPick | null = null;
  let vendor: OrderOcrPick | null = null;
  let saleOrder: OrderOcrPick | null = null;

  if (kind === "sale_order") {
    const clients = await prisma.erpClient.findMany({
      where: { estado: 1 },
      select: { id: true, name: true, legalName: true },
    });
    const hit = pickBest(clients, (c) => partyScore(extracted.client, [c.name, c.legalName]));
    client = hit ? { id: hit.id, label: hit.name } : null;
    if (!client) {
      blockers.push(
        extracted.client
          ? `No encontré el cliente «${extracted.client}». Elegilo a mano o crealo en Clientes.`
          : "No se leyó el cliente. Elegilo a mano.",
      );
    }
  } else {
    const vendors = await prisma.erpVendor.findMany({
      where: {
        estado: 1,
        kind: kind === "purchase_order" ? ERP_VENDOR.media : ERP_VENDOR.producer,
      },
      select: { id: true, name: true },
    });
    const query = [extracted.vendor, extracted.media].filter(Boolean).join(" / ") || null;
    const hit = pickBest(vendors, (v) => Math.max(partyScore(extracted.vendor, [v.name]), partyScore(query, [v.name])));
    vendor = hit ? { id: hit.id, label: hit.name } : null;
    if (!vendor) {
      const noun = kind === "purchase_order" ? "medio" : "productor";
      blockers.push(
        extracted.vendor
          ? `El ${noun} «${extracted.vendor.toUpperCase()}» no está cargado: se da de alta al guardar. Si ya existe con otro nombre, elegilo en la lista.`
          : `No se leyó el ${noun}. Elegilo a mano.`,
      );
    }
    const sale = await findSaleOrder(extracted, extracted.client);
    saleOrder = sale ? { id: sale.id, label: `${sale.number} · ${sale.client.name}` } : null;
    if (!saleOrder) {
      blockers.push(
        extracted.parentNumber
          ? `No existe la O.P. de venta ${extracted.parentNumber}. Cargala primero o elegí otra.`
          : "Falta vincular la O.P. de venta.",
      );
    }
  }

  const duplicate = await findDuplicate(kind, extracted.number, opts.currentId ?? null);
  if (duplicate) blockers.push(`Ya existe la orden ${duplicate.label}.`);
  if (!extracted.number) blockers.push("Falta el número.");
  if (!extracted.issuedAt) blockers.push("Falta la fecha.");

  return { extracted, client, vendor, saleOrder, duplicate, blockers };
}
