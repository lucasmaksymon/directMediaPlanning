/**
 * Reemplaza el ERP de NextPlanning con el dump de ADMINISTRACION (data/admin-sql).
 * No toca User / Reservation / inventario del marketplace.
 */
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

const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl() } } });
const DIR = path.join(process.cwd(), "data", "admin-sql");

function load<T>(name: string): T[] {
  const raw = JSON.parse(readFileSync(path.join(DIR, name), "utf8"));
  if (Array.isArray(raw)) return raw as T[];
  if (raw && typeof raw === "object") return [raw as T];
  return [];
}

function num(v: unknown, fallback = 0) {
  if (v == null || v === "") return fallback;
  const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
}

function int(v: unknown, fallback = 0) {
  return Math.trunc(num(v, fallback));
}

function text(v: unknown) {
  const s = String(v ?? "").trim();
  return s || null;
}

function at(v: unknown, fallback?: Date) {
  if (v == null || v === "") return fallback ?? new Date("2024-01-01T12:00:00");
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return fallback ?? new Date("2024-01-01T12:00:00");
  return d;
}

function id(prefix: string, raw: unknown) {
  return `${prefix}-${int(raw)}`;
}

function moneyTriple(importe: unknown, neto: unknown, iva: unknown) {
  const total = num(importe);
  const vat = num(iva);
  let net = num(neto);
  if (!net && !vat) net = total;
  else if (!net && vat) net = total - vat;
  const amount = total || net + vat;
  return { net, vat, amount };
}

type Row = Record<string, unknown>;

async function createMany<T extends object>(label: string, fn: (data: T[]) => Promise<{ count: number }>, rows: T[]) {
  const chunk = 400;
  let count = 0;
  for (let i = 0; i < rows.length; i += chunk) {
    const part = rows.slice(i, i + chunk);
    if (!part.length) continue;
    const res = await fn(part);
    count += res.count;
  }
  console.log(`  ${label}: ${count}`);
}

async function wipe() {
  console.log("Borrando ERP actual…");
  await prisma.$transaction([
    prisma.erpGestionLine.deleteMany(),
    prisma.erpCampaignItem.deleteMany(),
    prisma.erpTreasuryPayment.deleteMany(),
    prisma.erpSaleReceiptInvoice.deleteMany(),
    prisma.erpPurchaseReceiptInvoice.deleteMany(),
    prisma.erpPaymentOrderInvoice.deleteMany(),
    prisma.erpPurchaseInvoiceOrder.deleteMany(),
    prisma.erpSaleInvoice.deleteMany(),
    prisma.erpPurchaseInvoice.deleteMany(),
    prisma.erpSaleReceipt.deleteMany(),
    prisma.erpPurchaseReceipt.deleteMany(),
    prisma.erpPaymentOrder.deleteMany(),
    prisma.erpPurchaseOrder.deleteMany(),
    prisma.erpProductionOrder.deleteMany(),
    prisma.erpSaleOrder.deleteMany(),
    prisma.erpExpense.deleteMany(),
    prisma.erpClient.deleteMany(),
    prisma.erpVendor.deleteMany(),
    prisma.erpCity.deleteMany(),
    prisma.erpProvince.deleteMany(),
    prisma.erpCurrency.deleteMany(),
    prisma.erpElement.deleteMany(),
    prisma.erpCompany.deleteMany(),
  ]);
}

async function main() {
  console.log("Import ADMINISTRACION → NextPlanning");
  await prisma.$connect();
  await wipe();

  const empresas = load<Row>("empresas.json");
  const clientes = load<Row>("clientes.json");
  const proveedores = load<Row>("proveedores.json");
  const provincias = load<Row>("provincias.json");
  const ciudades = load<Row>("ciudades.json");
  const formatos = load<Row>("formatos.json");
  const dispositivos = load<Row>("dispositivos.json");
  const gastos = load<Row>("gastos.json");
  const opVenta = load<Row>("opVenta.json");
  const opCompra = load<Row>("opCompra.json");
  const oProduccion = load<Row>("oProduccion.json");
  const facturasVenta = load<Row>("facturasVenta.json");
  const facturasCompra = load<Row>("facturasCompra.json");
  const facturasCompraOrdenes = load<Row>("facturasCompraOrdenes.json");
  const recibosVenta = load<Row>("recibosVenta.json");
  const recibosVentaFacturas = load<Row>("recibosVentaFacturas.json");
  const ordenesPago = load<Row>("ordenesPago.json");
  const ordenesPagoFacturas = load<Row>("ordenesPagoFacturas.json");
  const pagos = load<Row>("pagos.json");

  const companyIds = new Set(empresas.map((e) => id("adm-emp", e.id)));
  const clientIds = new Set(clientes.map((c) => id("adm-cli", c.id)));
  const vendorIds = new Set(proveedores.map((v) => id("adm-prv", v.id)));
  const provinceIds = new Set(provincias.map((p) => id("adm-prov", p.id)));
  const saleIds = new Set(
    opVenta.filter((o) => clientIds.has(id("adm-cli", o.idCliente))).map((o) => id("adm-ov", o.id)),
  );
  const purchaseInvoiceIds = new Set(
    facturasCompra.filter((f) => vendorIds.has(id("adm-prv", f.idProveedor))).map((f) => id("adm-fc", f.id)),
  );
  const receiptIds = new Set(
    recibosVenta.filter((r) => clientIds.has(id("adm-cli", r.idCliente))).map((r) => id("adm-rv", r.id)),
  );
  const payOrderIds = new Set(
    ordenesPago.filter((o) => vendorIds.has(id("adm-prv", o.idProveedor))).map((o) => id("adm-opo", o.id)),
  );

  const skip = { purchaseNoSale: 0, prodNoSale: 0, saleInvNoOrder: 0, saleInvNoClient: 0, links: 0, receipts: 0, pays: 0 };

  console.log("Maestros…");
  await createMany(
    "empresas",
    (data) => prisma.erpCompany.createMany({ data }),
    empresas.map((e) => ({
      id: id("adm-emp", e.id),
      name: text(e.empresa) ?? "NEXTMEDIA",
      currency: int(e.moneda) === 1 ? "USD" : "ARS",
      paymentDays: int(e.plazoPago, 30) || 30,
      estado: int(e.estado, 1),
    })),
  );

  const defaultCompanyId = empresas[0] ? id("adm-emp", empresas[0].id) : "adm-emp-1";
  if (!empresas.length) {
    await prisma.erpCompany.create({
      data: { id: defaultCompanyId, name: "NEXTMEDIA", currency: "ARS", paymentDays: 30 },
    });
    companyIds.add(defaultCompanyId);
  }

  await prisma.erpCurrency.createMany({
    data: [
      { id: "adm-mon-ars", code: "ARS", name: "Pesos Argentinos", rate: 1, estado: 1 },
      { id: "adm-mon-usd", code: "USD", name: "Dólares Estadounidenses", rate: 350.5, estado: 1 },
    ],
  });
  console.log("  monedas: 2");

  await createMany(
    "clientes",
    (data) => prisma.erpClient.createMany({ data }),
    clientes.map((c) => ({
      id: id("adm-cli", c.id),
      name: text(c.cliente) ?? `Cliente ${c.id}`,
      companyId: companyIds.has(id("adm-emp", c.idEmpresa)) ? id("adm-emp", c.idEmpresa) : defaultCompanyId,
      taxId: text(c.cuit),
      address: text(c.direccion),
      contact: text(c.contacto),
      email: text(c.email),
      phone: text(c.telefono),
      costRate: num(c.costo),
      agencyFee: num(c.servicioAgencia),
      taxCondition: int(c.iva),
      estado: int(c.estado, 1),
      industry: text(c.rubro),
    })),
  );

  await createMany(
    "proveedores",
    (data) => prisma.erpVendor.createMany({ data }),
    proveedores.map((v) => ({
      id: id("adm-prv", v.id),
      kind: int(v.tipo),
      name: text(v.proveedor) ?? `Proveedor ${v.id}`,
      taxId: text(v.cuit),
      address: text(v.direccion),
      contact: text(v.contacto),
      email: text(v.email),
      phone: text(v.telefono),
      cbu: text(v.cbu),
      taxCondition: int(v.iva),
      estado: int(v.estado, 1),
      paymentDays: int(v.plazoPago, 30) || 30,
    })),
  );

  await createMany(
    "provincias",
    (data) => prisma.erpProvince.createMany({ data }),
    provincias.map((p) => ({
      id: id("adm-prov", p.id),
      name: text(p.provincia) ?? `Provincia ${p.id}`,
      estado: int(p.estado, 1),
    })),
  );

  await createMany(
    "ciudades",
    (data) => prisma.erpCity.createMany({ data }),
    ciudades
      .filter((c) => provinceIds.has(id("adm-prov", c.idProvincia)))
      .map((c) => ({
        id: id("adm-ciu", c.id),
        provinceId: id("adm-prov", c.idProvincia),
        name: text(c.ciudad) ?? `Ciudad ${c.id}`,
        estado: int(c.estado, 1),
      })),
  );

  const elements = new Map<string, { id: string; name: string; estado: number }>();
  for (const d of dispositivos) {
    const name = text(d.dispositivo);
    if (!name) continue;
    const key = name.toUpperCase();
    if (!elements.has(key)) elements.set(key, { id: id("adm-dis", d.id), name, estado: int(d.estado, 1) });
  }
  for (const f of formatos) {
    const name = text(f.formato);
    if (!name) continue;
    const key = name.toUpperCase();
    if (!elements.has(key)) elements.set(key, { id: id("adm-fmt", f.id), name, estado: int(f.estado, 1) });
  }
  await createMany("elementos", (data) => prisma.erpElement.createMany({ data }), [...elements.values()]);

  await createMany(
    "gastos",
    (data) => prisma.erpExpense.createMany({ data }),
    gastos.map((g) => ({
      id: id("adm-gas", g.id),
      month: int(g.mes),
      year: int(g.anio),
      fixed: num(g.fijo),
      bank: num(g.banco),
      vat: num(g.iva),
      commissions: num(g.comisiones),
    })),
  );

  console.log("Órdenes…");
  await createMany(
    "opVenta",
    (data) => prisma.erpSaleOrder.createMany({ data }),
    opVenta
      .filter((o) => clientIds.has(id("adm-cli", o.idCliente)))
      .map((o) => {
        const { net, vat, amount } = moneyTriple(o.importe, o.neto, o.iva);
        return {
          id: id("adm-ov", o.id),
          clientId: id("adm-cli", o.idCliente),
          issuedAt: at(o.fecha),
          month: int(o.mes, at(o.fecha).getMonth() + 1),
          year: int(o.anio, at(o.fecha).getFullYear()),
          number: (text(o.numero) ?? String(o.id)).trim(),
          net,
          vat,
          amount,
          estado: int(o.estado, 1),
          attachmentExt: text(o.comprobante),
        };
      }),
  );

  const purchaseRows = [];
  for (const o of opCompra) {
    const saleOrderId = id("adm-ov", o.idOpVenta);
    if (!saleIds.has(saleOrderId) || !vendorIds.has(id("adm-prv", o.idProveedor))) {
      skip.purchaseNoSale += 1;
      continue;
    }
    const { net, vat, amount } = moneyTriple(o.importe, o.neto, o.iva);
    purchaseRows.push({
      id: id("adm-oc", o.id),
      saleOrderId,
      vendorId: id("adm-prv", o.idProveedor),
      issuedAt: at(o.fecha),
      number: (text(o.numero) ?? String(o.id)).trim(),
      net,
      vat,
      amount,
      estado: int(o.estado, 1),
      attachmentExt: text(o.comprobante),
    });
  }
  const purchaseIds = new Set(purchaseRows.map((r) => r.id));
  await createMany("opCompra", (data) => prisma.erpPurchaseOrder.createMany({ data }), purchaseRows);

  const productionRows = [];
  for (const o of oProduccion) {
    const saleOrderId = id("adm-ov", o.idOpVenta);
    if (!saleIds.has(saleOrderId) || !vendorIds.has(id("adm-prv", o.idProveedor))) {
      skip.prodNoSale += 1;
      continue;
    }
    const { net, vat, amount } = moneyTriple(o.importe, o.neto, o.iva);
    productionRows.push({
      id: id("adm-op", o.id),
      saleOrderId,
      vendorId: id("adm-prv", o.idProveedor),
      issuedAt: at(o.fecha),
      number: (text(o.numero) ?? String(o.id)).trim(),
      net,
      vat,
      amount,
      estado: int(o.estado, 1),
      attachmentExt: text(o.comprobante),
    });
  }
  const productionIds = new Set(productionRows.map((r) => r.id));
  await createMany("oProduccion", (data) => prisma.erpProductionOrder.createMany({ data }), productionRows);

  console.log("Facturas y tesorería…");
  const saleInvRows = [];
  for (const f of facturasVenta) {
    const saleOrderId = id("adm-ov", f.idOrden);
    const clientId = id("adm-cli", f.idCliente);
    if (!saleIds.has(saleOrderId)) {
      skip.saleInvNoOrder += 1;
      continue;
    }
    if (!clientIds.has(clientId)) {
      skip.saleInvNoClient += 1;
      continue;
    }
    const issuedAt = at(f.fecha);
    const net = num(f.importe);
    const vat = num(f.iva);
    saleInvRows.push({
      id: id("adm-fv", f.id),
      clientId,
      saleOrderId,
      issuedAt,
      dueAt: at(f.vencimiento, issuedAt),
      docType: (text(f.tipo) ?? "A").toUpperCase(),
      pos: int(f.punto),
      number: int(f.numero),
      amount: net,
      vat,
      collected: int(f.estado) === 1 ? net + vat : 0,
      collectStatus: int(f.estado),
      attachmentExt: text(f.comprobante),
    });
  }
  const saleInvoiceIds = new Set(saleInvRows.map((r) => r.id));
  await createMany("facturasVenta", (data) => prisma.erpSaleInvoice.createMany({ data }), saleInvRows);

  await createMany(
    "facturasCompra",
    (data) => prisma.erpPurchaseInvoice.createMany({ data }),
    facturasCompra
      .filter((f) => vendorIds.has(id("adm-prv", f.idProveedor)))
      .map((f) => {
        const issuedAt = at(f.fecha);
        const docType = (text(f.tipo) ?? "A").toUpperCase();
        const net = num(f.importe);
        return {
          id: id("adm-fc", f.id),
          vendorId: id("adm-prv", f.idProveedor),
          issuedAt,
          dueAt: at(f.vencimiento, issuedAt),
          docType,
          pos: int(f.punto),
          number: int(f.numero),
          amount: net,
          vat: num(f.iva),
          vatWithholding: num(f.retencionIVA),
          iibbCaba: num(f.retencionIIBBCaba),
          iibbBsAs: num(f.retencionIIBBBsAs),
          internalTax: num(f.impuestoInterno),
          nonTaxable: num(f.importeNoGrabado),
          isVatPurchase: Boolean(f.compraIva),
          isCreditNote: docType.includes("NC") || net < 0,
          commission: num(f.comision),
          payStatus: int(f.estado),
          attachmentExt: text(f.comprobante),
        };
      }),
  );

  const linkRows = [];
  for (const l of facturasCompraOrdenes) {
    const invoiceId = id("adm-fc", l.idFactura);
    if (!purchaseInvoiceIds.has(invoiceId)) {
      skip.links += 1;
      continue;
    }
    const kind = int(l.tipoProveedor);
    const purchaseOrderId = kind === 0 ? id("adm-oc", l.idOrden) : null;
    const productionOrderId = kind === 1 ? id("adm-op", l.idOrden) : null;
    if (purchaseOrderId && !purchaseIds.has(purchaseOrderId)) {
      skip.links += 1;
      continue;
    }
    if (productionOrderId && !productionIds.has(productionOrderId)) {
      skip.links += 1;
      continue;
    }
    linkRows.push({
      id: id("adm-fco", l.id),
      invoiceId,
      purchaseOrderId,
      productionOrderId,
      vendorKind: kind,
    });
  }
  await createMany("facturasCompraOrdenes", (data) => prisma.erpPurchaseInvoiceOrder.createMany({ data }), linkRows);

  await createMany(
    "recibosVenta",
    (data) => prisma.erpSaleReceipt.createMany({ data }),
    recibosVenta
      .filter((r) => clientIds.has(id("adm-cli", r.idCliente)))
      .map((r) => ({
        id: id("adm-rv", r.id),
        clientId: id("adm-cli", r.idCliente),
        issuedAt: at(r.fecha),
        number: int(r.numero),
        amount: num(r.importe),
        balance: num(r.saldo),
        attachmentExt: text(r.comprobante),
      })),
  );

  const receiptLinks = [];
  for (const l of recibosVentaFacturas) {
    const receiptId = id("adm-rv", l.idRecibo);
    const invoiceId = id("adm-fv", l.idFactura);
    if (!receiptIds.has(receiptId) || !saleInvoiceIds.has(invoiceId)) {
      skip.receipts += 1;
      continue;
    }
    receiptLinks.push({ id: id("adm-rvf", l.id), receiptId, invoiceId });
  }
  await createMany("recibosVentaFacturas", (data) => prisma.erpSaleReceiptInvoice.createMany({ data }), receiptLinks);

  await createMany(
    "ordenesPago",
    (data) => prisma.erpPaymentOrder.createMany({ data }),
    ordenesPago
      .filter((o) => vendorIds.has(id("adm-prv", o.idProveedor)))
      .map((o) => ({
        id: id("adm-opo", o.id),
        vendorId: id("adm-prv", o.idProveedor),
        issuedAt: at(o.fecha),
        number: int(o.numero),
        amount: num(o.importe),
        balance: num(o.saldo),
      })),
  );

  const payLinks = [];
  for (const l of ordenesPagoFacturas) {
    const paymentOrderId = id("adm-opo", l.idOrden);
    const invoiceId = id("adm-fc", l.idFactura);
    if (!payOrderIds.has(paymentOrderId) || !purchaseInvoiceIds.has(invoiceId)) {
      skip.pays += 1;
      continue;
    }
    payLinks.push({ id: id("adm-opf", l.id), paymentOrderId, invoiceId });
  }
  await createMany("ordenesPagoFacturas", (data) => prisma.erpPaymentOrderInvoice.createMany({ data }), payLinks);

  const treasury = [];
  for (const p of pagos) {
    const saleReceiptId = p.idReciboVenta ? id("adm-rv", p.idReciboVenta) : null;
    const paymentOrderId = p.idReciboCompra ? id("adm-opo", p.idReciboCompra) : null;
    treasury.push({
      id: id("adm-pag", p.id),
      saleReceiptId: saleReceiptId && receiptIds.has(saleReceiptId) ? saleReceiptId : null,
      paymentOrderId: paymentOrderId && payOrderIds.has(paymentOrderId) ? paymentOrderId : null,
      paymentKind: int(p.tipoPago),
      number: text(p.numero),
      issuedAt: p.fechaEmision ? at(p.fechaEmision) : null,
      paidAt: p.fechaPago ? at(p.fechaPago) : null,
      checkOrder: int(p.ordenCheque),
      checkType: int(p.tipoCheque),
      checkMode: int(p.modoCheque),
      amount: num(p.importe),
      estado: int(p.estado),
      endorsedFromId: int(p.idPago) ? id("adm-pag", p.idPago) : null,
    });
  }
  const treasuryIds = new Set(treasury.map((row) => row.id));
  for (const row of treasury) {
    if (row.endorsedFromId && !treasuryIds.has(row.endorsedFromId)) row.endorsedFromId = null;
  }
  await createMany("pagos", (data) => prisma.erpTreasuryPayment.createMany({ data }), treasury);

  const { rebuildGestionLinesFromOrders } = await import("../src/lib/erp-gestion");
  const gestion = await rebuildGestionLinesFromOrders();
  console.log(`  gestion: ${gestion}`);

  const counts = {
    companies: await prisma.erpCompany.count(),
    clients: await prisma.erpClient.count(),
    vendors: await prisma.erpVendor.count(),
    provinces: await prisma.erpProvince.count(),
    cities: await prisma.erpCity.count(),
    elements: await prisma.erpElement.count(),
    expenses: await prisma.erpExpense.count(),
    saleOrders: await prisma.erpSaleOrder.count(),
    purchaseOrders: await prisma.erpPurchaseOrder.count(),
    productionOrders: await prisma.erpProductionOrder.count(),
    saleInvoices: await prisma.erpSaleInvoice.count(),
    purchaseInvoices: await prisma.erpPurchaseInvoice.count(),
    saleReceipts: await prisma.erpSaleReceipt.count(),
    paymentOrders: await prisma.erpPaymentOrder.count(),
    treasury: await prisma.erpTreasuryPayment.count(),
  };
  console.log("Listo", counts);
  if (Object.values(skip).some(Boolean)) console.log("Omitidos (FK huérfana en origen)", skip);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
