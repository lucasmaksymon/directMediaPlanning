"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui";
import { ErpDataTable, type ErpTableColumn } from "@/components/erp/ErpDataTable";
import { ErpRowActions } from "@/components/erp/ErpRowActions";
import { cn } from "@/lib/cn";
import { displayDate, ERP_MONTHS, money } from "@/lib/erp";
import { dateSortValue } from "@/lib/table-prefs";
import type { GestionDetailLine, GestionOrderRow } from "@/lib/erp-gestion";

type BadgeVariant = "success" | "warning" | "info" | "error" | "default";

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  Cobrado: "success",
  Pagado: "success",
  Pendiente: "warning",
  "A facturar": "info",
  "Sin facturar": "info",
  "Sin factura": "info",
  "—": "default",
};

const KIND_CLASS: Record<GestionDetailLine["kind"], string> = {
  Venta: "bg-primary-subtle text-led",
  Compra: "bg-muted text-foreground",
  "Compra IVA": "bg-muted text-foreground",
  Producción: "bg-[var(--warning-subtle)] text-foreground",
};

function StatusBadge({ status }: { status: string }) {
  if (status === "—") return <span className="text-muted-foreground">—</span>;
  return <Badge variant={STATUS_VARIANT[status] ?? "default"}>{status}</Badge>;
}

function sum(rows: GestionOrderRow[], pick: (r: GestionOrderRow) => number) {
  return money(rows.reduce((acc, r) => acc + pick(r), 0));
}

function GestionDetail({ lines }: { lines: GestionDetailLine[] }) {
  if (lines.length === 0) {
    return <p className="px-10 py-3 text-xs text-muted-foreground">Sin facturas ni órdenes de compra/producción.</p>;
  }
  return (
    <div className="py-2 pl-10 pr-4">
      <table className="w-full text-xs">
        <thead className="text-[10px] uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="py-1 pr-3 text-left font-medium">Tipo</th>
            <th className="py-1 pr-3 text-left font-medium">Orden</th>
            <th className="py-1 pr-3 text-left font-medium">Cliente / proveedor</th>
            <th className="py-1 pr-3 text-left font-medium">Factura</th>
            <th className="py-1 pr-3 text-left font-medium">Fecha</th>
            <th className="py-1 pr-3 text-right font-medium">Neto</th>
            <th className="py-1 pr-3 text-right font-medium">Total</th>
            <th className="py-1 text-left font-medium">Estado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-divide">
          {lines.map((line) => (
            <tr key={line.id}>
              <td className="py-1 pr-3">
                <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold", KIND_CLASS[line.kind])}>
                  {line.kind}
                </span>
              </td>
              <td className="py-1 pr-3">{line.order}</td>
              <td className="py-1 pr-3">{line.party}</td>
              <td className="py-1 pr-3">
                <Link className="font-medium hover:underline" href={line.href}>
                  {line.doc ?? "Ver orden"}
                </Link>
              </td>
              <td className="py-1 pr-3">{displayDate(line.issuedAt)}</td>
              <td className="py-1 pr-3 text-right tabular-nums">{money(line.net)}</td>
              <td className="py-1 pr-3 text-right tabular-nums">{money(line.total)}</td>
              <td className="py-1">
                <StatusBadge status={line.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ErpGestionTable({ rows }: { rows: GestionOrderRow[] }) {
  const [open, setOpen] = useState<Set<string>>(() => new Set());

  const columns = useMemo<ErpTableColumn<GestionOrderRow>[]>(() => {
    const toggle = (id: string) =>
      setOpen((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    return [
      {
        id: "number",
        label: "Orden",
        value: (r) => r.number,
        cell: (r) => (
          <button
            className="inline-flex items-center gap-1 rounded bg-primary-subtle px-1.5 py-0.5 font-semibold text-led"
            onClick={() => toggle(r.id)}
            title={open.has(r.id) ? "Ocultar detalle" : "Ver compras, producción y facturas"}
            type="button"
          >
            {open.has(r.id) ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
            {r.number}
            <span className="text-[10px] font-normal text-muted-foreground">({r.details.length})</span>
          </button>
        ),
      },
      {
        id: "periodo",
        label: "Período",
        value: (r) => r.year * 100 + r.month,
        cell: (r) => `${ERP_MONTHS[r.month] ?? r.month} ${r.year}`,
      },
      { id: "issuedAt", label: "Fecha", value: (r) => dateSortValue(r.issuedAt), cell: (r) => displayDate(r.issuedAt) },
      { id: "client", label: "Cliente", value: (r) => r.client, cell: (r) => r.client },
      { id: "product", label: "Producto", value: (r) => r.product, cell: (r) => r.product || "—" },
      {
        id: "elements",
        label: "Elementos",
        value: (r) => r.elements,
        cell: (r) => (
          <span className="block max-w-[14rem] truncate" title={r.elements}>
            {r.elements || "—"}
          </span>
        ),
      },
      {
        id: "saleNet",
        label: "Venta neto",
        align: "right",
        value: (r) => r.saleNet,
        cell: (r) => money(r.saleNet),
        foot: (rows) => sum(rows, (r) => r.saleNet),
      },
      {
        id: "purchaseNet",
        label: "Compra neto",
        align: "right",
        value: (r) => r.purchaseNet,
        cell: (r) => money(r.purchaseNet),
        foot: (rows) => sum(rows, (r) => r.purchaseNet),
      },
      {
        id: "ganancia",
        label: "Ganancia",
        align: "right",
        value: (r) => r.ganancia,
        cell: (r) => (
          <span className={cn(r.ganancia < 0 && "text-[var(--error)]")}>
            {money(r.ganancia)}
            {r.gananciaPct != null ? (
              <span className="ml-1 text-[10px] text-muted-foreground">{r.gananciaPct.toFixed(0)}%</span>
            ) : null}
          </span>
        ),
        foot: (rows) => sum(rows, (r) => r.ganancia),
      },
      {
        id: "invoiced",
        label: "Facturado",
        align: "right",
        value: (r) => r.invoiced,
        cell: (r) => (r.invoiced ? money(r.invoiced) : "—"),
        foot: (rows) => sum(rows, (r) => r.invoiced),
      },
      { id: "saleStatus", label: "Cobro", value: (r) => r.saleStatus, cell: (r) => <StatusBadge status={r.saleStatus} /> },
      { id: "payStatus", label: "Pago", value: (r) => r.payStatus, cell: (r) => <StatusBadge status={r.payStatus} /> },
    ];
  }, [open]);

  return (
    <ErpDataTable
      actions={(r) => <ErpRowActions editHref={`/backoffice/ordenes/venta?edit=${r.id}`} />}
      columns={columns}
      expandedRow={(r) => (open.has(r.id) ? <GestionDetail lines={r.details} /> : null)}
      fill="page"
      rowKey={(r) => r.id}
      rows={rows}
      storageKey="erp.table.gestion-ordenes.v1"
    />
  );
}
