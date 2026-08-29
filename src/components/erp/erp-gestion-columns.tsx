import type { ReactNode } from "react";
import Link from "next/link";
import { setErpPurchasePayStatus, setErpSaleCollectStatus } from "@/app/actions/erp-billing";
import { Badge } from "@/components/ui";
import { ErpRowActions } from "@/components/erp/ErpRowActions";
import { displayDate, ERP_COLLECT, ERP_MONTHS, ERP_SETTLE, money } from "@/lib/erp";
import type { GestionLineRow } from "@/lib/erp-gestion";
import { cn } from "@/lib/cn";

export const GESTION_GROUPS = ["Campaña", "Compra", "Producción", "Venta", "Resultado"] as const;

export type GestionGroup = (typeof GESTION_GROUPS)[number];

export type GestionTotals = {
  purchase: number;
  production: number;
  sale: number;
  ganancia: number;
  gananciaPct: number | null;
};

export type GestionColDef = {
  id: string;
  group: GestionGroup;
  label: string;
  align?: "left" | "right";
  value: (row: GestionLineRow) => string | number | null;
  cell: (row: GestionLineRow) => ReactNode;
  foot?: (totals: GestionTotals) => ReactNode;
};

const cell = "block text-[11px] leading-none";
const num = cn(cell, "tabular-nums text-right");
const sub = "block text-[10px] leading-none text-muted-foreground";

export const GROUP_TINT: Record<GestionGroup, { head: string; body: string; split: boolean }> = {
  Campaña: { head: "bg-card", body: "", split: false },
  Compra: {
    head: "bg-[color-mix(in_srgb,var(--card)_86%,var(--foreground)_14%)]",
    body: "bg-muted/25",
    split: true,
  },
  Producción: {
    head: "bg-[color-mix(in_srgb,var(--card)_90%,var(--foreground)_10%)]",
    body: "bg-muted/10",
    split: true,
  },
  Venta: {
    head: "bg-[color-mix(in_srgb,var(--card)_88%,#00b6c7_12%)]",
    body: "bg-led/5",
    split: true,
  },
  Resultado: {
    head: "bg-[color-mix(in_srgb,var(--card)_82%,#00b6c7_18%)]",
    body: "bg-led/10",
    split: true,
  },
};

function amt(value: number | null | undefined, present: boolean, hideZero = false) {
  if (!present) return "—";
  if (hideZero && Math.abs(value ?? 0) < 0.009) return "—";
  return money(value ?? 0);
}

function ts(d: Date | string | null | undefined) {
  if (d == null || d === "") return null;
  const t = new Date(d).getTime();
  return Number.isFinite(t) ? t : null;
}

function PayBadge({ status }: { status: number }) {
  return (
    <Badge variant={status === ERP_SETTLE.paid ? "success" : "warning"}>
      {status === ERP_SETTLE.paid ? "Pagado" : "Pendiente"}
    </Badge>
  );
}

export function gestionActions(row: GestionLineRow) {
  const p = row.purchase;
  const d = row.production;
  const s = row.sale;
  return (
    <ErpRowActions
      confirmAction={
        s && s.collectStatus !== ERP_COLLECT.collected
          ? setErpSaleCollectStatus.bind(null, s.id, ERP_COLLECT.collected)
          : p && p.payStatus !== ERP_SETTLE.paid
            ? setErpPurchasePayStatus.bind(null, p.id, ERP_SETTLE.paid)
            : d && d.payStatus !== ERP_SETTLE.paid
              ? setErpPurchasePayStatus.bind(null, d.id, ERP_SETTLE.paid)
              : undefined
      }
      confirmLabel={
        s && s.collectStatus !== ERP_COLLECT.collected
          ? "Cobrada"
          : p && p.payStatus !== ERP_SETTLE.paid
            ? "Pagada"
            : d && d.payStatus !== ERP_SETTLE.paid
              ? "Pagada"
              : undefined
      }
      confirmPrompt="¿Confirmar el cambio de estado?"
      editHref={`/backoffice/ordenes/venta?edit=${row.orderId}`}
    />
  );
}

export const GESTION_COLS: GestionColDef[] = [
  {
    id: "order",
    group: "Campaña",
    label: "Orden",
    value: (r) => Number(r.number) || r.number,
    cell: (r) => (
      <span className={cn(cell, "flex flex-col font-medium")}>
        <Link className="hover:underline" href={`/backoffice/ordenes/venta?edit=${r.orderId}`}>
          {r.number}
        </Link>
        <span className={sub}>
          {ERP_MONTHS[r.month]} {r.year}
        </span>
      </span>
    ),
    foot: () => "Totales",
  },
  {
    id: "client",
    group: "Campaña",
    label: "Cliente",
    value: (r) => r.client,
    cell: (r) => (
      <span className={cn(cell, "flex flex-col")}>
        {r.client}
        {r.legalName ? <span className={sub}>{r.legalName}</span> : null}
      </span>
    ),
  },
  {
    id: "element",
    group: "Campaña",
    label: "Elemento",
    value: (r) => r.element,
    cell: (r) => <span className={cell}>{r.element ?? "—"}</span>,
  },
  {
    id: "location",
    group: "Campaña",
    label: "Ubicación",
    value: (r) => r.location,
    cell: (r) => <span className={cell}>{r.location ?? "—"}</span>,
  },
  {
    id: "qty",
    group: "Campaña",
    label: "Cant.",
    align: "right",
    value: (r) => r.quantity || null,
    cell: (r) => <span className={num}>{r.quantity || "—"}</span>,
  },
  {
    id: "from",
    group: "Campaña",
    label: "Desde",
    value: (r) => ts(r.startsAt),
    cell: (r) => <span className={cn(cell, "text-muted-foreground")}>{displayDate(r.startsAt)}</span>,
  },
  {
    id: "to",
    group: "Campaña",
    label: "Hasta",
    value: (r) => ts(r.endsAt),
    cell: (r) => <span className={cn(cell, "text-muted-foreground")}>{displayDate(r.endsAt)}</span>,
  },
  {
    id: "buyDate",
    group: "Compra",
    label: "Fecha",
    value: (r) => ts(r.purchase?.issuedAt),
    cell: (r) => <span className={cell}>{r.purchase ? displayDate(r.purchase.issuedAt) : "—"}</span>,
  },
  {
    id: "buyDoc",
    group: "Compra",
    label: "Factura",
    value: (r) => r.purchase?.doc ?? null,
    cell: (r) =>
      r.purchase ? (
        <Link className={cn(cell, "hover:underline")} href={`/backoffice/facturacion/compra?edit=${r.purchase.id}`}>
          {r.purchase.doc}
        </Link>
      ) : (
        <span className={cell}>—</span>
      ),
  },
  {
    id: "buyVendor",
    group: "Compra",
    label: "Proveedor",
    value: (r) => r.purchase?.vendor ?? null,
    cell: (r) => <span className={cell}>{r.purchase?.vendor ?? "—"}</span>,
  },
  {
    id: "buyNet",
    group: "Compra",
    label: "Neto",
    align: "right",
    value: (r) => r.purchase?.net ?? null,
    cell: (r) => <span className={num}>{amt(r.purchase?.net, Boolean(r.purchase))}</span>,
  },
  {
    id: "buyVat",
    group: "Compra",
    label: "IVA",
    align: "right",
    value: (r) => r.purchase?.vat ?? null,
    cell: (r) => <span className={num}>{amt(r.purchase?.vat, Boolean(r.purchase))}</span>,
  },
  {
    id: "buyIibb",
    group: "Compra",
    label: "IIBB",
    align: "right",
    value: (r) => r.purchase?.iibb ?? null,
    cell: (r) => <span className={num}>{amt(r.purchase?.iibb, Boolean(r.purchase), true)}</span>,
  },
  {
    id: "buyPerc",
    group: "Compra",
    label: "Perc. IVA",
    align: "right",
    value: (r) => r.purchase?.percVat ?? null,
    cell: (r) => <span className={num}>{amt(r.purchase?.percVat, Boolean(r.purchase), true)}</span>,
  },
  {
    id: "buyDiego",
    group: "Compra",
    label: "Com. Diego",
    align: "right",
    value: (r) => r.purchase?.diegoFee ?? null,
    cell: (r) => <span className={num}>{amt(r.purchase?.diegoFee, Boolean(r.purchase), true)}</span>,
  },
  {
    id: "buyTotal",
    group: "Compra",
    label: "Total",
    align: "right",
    value: (r) => r.purchase?.total ?? null,
    cell: (r) => <span className={cn(num, "font-medium")}>{amt(r.purchase?.total, Boolean(r.purchase))}</span>,
    foot: (t) => money(t.purchase),
  },
  {
    id: "buyStatus",
    group: "Compra",
    label: "Estado",
    value: (r) => (r.purchase ? r.purchase.payStatus : -1),
    cell: (r) => <span className={cell}>{r.purchase ? <PayBadge status={r.purchase.payStatus} /> : "—"}</span>,
  },
  {
    id: "prodDate",
    group: "Producción",
    label: "Fecha",
    value: (r) => ts(r.production?.issuedAt),
    cell: (r) => <span className={cell}>{r.production ? displayDate(r.production.issuedAt) : "—"}</span>,
  },
  {
    id: "prodDoc",
    group: "Producción",
    label: "Factura",
    value: (r) => r.production?.doc ?? null,
    cell: (r) =>
      r.production ? (
        <Link className={cn(cell, "hover:underline")} href={`/backoffice/facturacion/compra?edit=${r.production.id}`}>
          {r.production.doc}
        </Link>
      ) : (
        <span className={cell}>—</span>
      ),
  },
  {
    id: "prodVendor",
    group: "Producción",
    label: "Imprenta",
    value: (r) => r.production?.vendor ?? null,
    cell: (r) => <span className={cell}>{r.production?.vendor ?? "—"}</span>,
  },
  {
    id: "prodNet",
    group: "Producción",
    label: "Neto",
    align: "right",
    value: (r) => r.production?.net ?? null,
    cell: (r) => <span className={num}>{amt(r.production?.net, Boolean(r.production))}</span>,
  },
  {
    id: "prodVat",
    group: "Producción",
    label: "IVA",
    align: "right",
    value: (r) => r.production?.vat ?? null,
    cell: (r) => <span className={num}>{amt(r.production?.vat, Boolean(r.production))}</span>,
  },
  {
    id: "prodTotal",
    group: "Producción",
    label: "Total",
    align: "right",
    value: (r) => r.production?.total ?? null,
    cell: (r) => <span className={cn(num, "font-medium")}>{amt(r.production?.total, Boolean(r.production))}</span>,
    foot: (t) => money(t.production),
  },
  {
    id: "prodStatus",
    group: "Producción",
    label: "Estado",
    value: (r) => (r.production ? r.production.payStatus : -1),
    cell: (r) => <span className={cell}>{r.production ? <PayBadge status={r.production.payStatus} /> : "—"}</span>,
  },
  {
    id: "saleDate",
    group: "Venta",
    label: "Fecha",
    value: (r) => ts(r.sale?.issuedAt),
    cell: (r) => <span className={cell}>{r.sale ? displayDate(r.sale.issuedAt) : "—"}</span>,
  },
  {
    id: "saleDoc",
    group: "Venta",
    label: "Factura",
    value: (r) => r.sale?.doc ?? null,
    cell: (r) =>
      r.sale ? (
        <Link className={cn(cell, "hover:underline")} href={`/backoffice/facturacion/venta?edit=${r.sale.id}`}>
          {r.sale.doc}
        </Link>
      ) : (
        <span className={cell}>—</span>
      ),
  },
  {
    id: "saleNet",
    group: "Venta",
    label: "Neto",
    align: "right",
    value: (r) => r.sale?.net ?? null,
    cell: (r) => <span className={num}>{amt(r.sale?.net, Boolean(r.sale))}</span>,
  },
  {
    id: "saleVat",
    group: "Venta",
    label: "IVA",
    align: "right",
    value: (r) => r.sale?.vat ?? null,
    cell: (r) => <span className={num}>{amt(r.sale?.vat, Boolean(r.sale))}</span>,
  },
  {
    id: "saleRetVat",
    group: "Venta",
    label: "Ret. IVA",
    align: "right",
    value: (r) => r.sale?.retVat ?? null,
    cell: (r) => <span className={num}>{amt(r.sale?.retVat, Boolean(r.sale), true)}</span>,
  },
  {
    id: "saleRetSuss",
    group: "Venta",
    label: "Ret. SUSS",
    align: "right",
    value: (r) => r.sale?.retSuss ?? null,
    cell: (r) => <span className={num}>{amt(r.sale?.retSuss, Boolean(r.sale), true)}</span>,
  },
  {
    id: "saleRetGan",
    group: "Venta",
    label: "Ret. gan.",
    align: "right",
    value: (r) => r.sale?.retGan ?? null,
    cell: (r) => <span className={num}>{amt(r.sale?.retGan, Boolean(r.sale), true)}</span>,
  },
  {
    id: "saleRetIibb",
    group: "Venta",
    label: "Ret. IIBB",
    align: "right",
    value: (r) => r.sale?.retIibb ?? null,
    cell: (r) => <span className={num}>{amt(r.sale?.retIibb, Boolean(r.sale), true)}</span>,
  },
  {
    id: "saleTotal",
    group: "Venta",
    label: "Total",
    align: "right",
    value: (r) => r.sale?.total ?? null,
    cell: (r) => <span className={cn(num, "font-medium")}>{amt(r.sale?.total, Boolean(r.sale))}</span>,
    foot: (t) => money(t.sale),
  },
  {
    id: "saleStatus",
    group: "Venta",
    label: "Estado",
    value: (r) => (r.sale ? r.sale.collectStatus : -1),
    cell: (r) => (
      <span className={cell}>
        {r.sale ? (
          <Badge variant={r.sale.collectStatus === ERP_COLLECT.collected ? "success" : "info"}>
            {r.sale.collectStatus === ERP_COLLECT.collected ? "Cobrado" : "Pendiente"}
          </Badge>
        ) : (
          <Badge variant="warning">A facturar</Badge>
        )}
      </span>
    ),
  },
  {
    id: "saleReceipt",
    group: "Venta",
    label: "Recibo",
    value: (r) => r.sale?.receiptRef ?? null,
    cell: (r) => <span className={cn(cell, "text-muted-foreground")}>{r.sale?.receiptRef ?? "—"}</span>,
  },
  {
    id: "ganancia",
    group: "Resultado",
    label: "Ganancia",
    align: "right",
    value: (r) => r.ganancia,
    cell: (r) => (
      <span className={cn(num, "font-semibold", r.ganancia != null && r.ganancia < 0 && "text-[var(--error)]")}>
        {amt(r.ganancia, r.ganancia != null)}
      </span>
    ),
    foot: (t) => <span className={t.ganancia < 0 ? "text-[var(--error)]" : undefined}>{money(t.ganancia)}</span>,
  },
  {
    id: "gananciaPct",
    group: "Resultado",
    label: "%",
    align: "right",
    value: (r) => r.gananciaPct,
    cell: (r) => <span className={num}>{r.gananciaPct == null ? "—" : `${r.gananciaPct.toFixed(1)}%`}</span>,
    foot: (t) => (t.gananciaPct == null ? "—" : `${t.gananciaPct.toFixed(1)}%`),
  },
];

export const GESTION_COL_IDS = GESTION_COLS.map((c) => c.id);
