"use client";

import { Badge } from "@/components/ui";
import { ErpDataTable, type ErpTableColumn } from "@/components/erp/ErpDataTable";
import { ErpRowActions } from "@/components/erp/ErpRowActions";
import {
  deleteErpCheque,
  deleteErpPaymentOrder,
  deleteErpPurchaseInvoice,
  deleteErpSaleInvoice,
  deleteErpSaleReceipt,
  setErpPurchasePayStatus,
  setErpSaleCollectStatus,
} from "@/app/actions/erp-billing";
import {
  deleteErpCity,
  deleteErpClient,
  deleteErpCompany,
  deleteErpCurrency,
  deleteErpElement,
  deleteErpExpense,
  deleteErpProvince,
  deleteErpVendor,
} from "@/app/actions/erp-masters";
import {
  deleteErpCampaignItem,
  deleteErpProductionOrder,
  deleteErpPurchaseOrder,
  deleteErpSaleOrder,
} from "@/app/actions/erp-orders";
import {
  displayDate,
  ERP_COLLECT,
  ERP_MONTHS,
  ERP_PAY,
  ERP_SETTLE,
  erpOrderBadge,
  erpOrderLabel,
  erpSettlementLabel,
  erpRecordLabel,
  erpVendorKindLabel,
  money,
} from "@/lib/erp";

function docRef(docType: string, pos: number, number: number) {
  return `${docType} ${String(pos).padStart(4, "0")}-${String(number).padStart(8, "0")}`;
}

type Named = { id: string; name: string; estado: number };

export function ElementosTable({ rows }: { rows: Named[] }) {
  return (
    <ErpDataTable
      storageKey="erp.table.elementos.v1"
      rows={rows}
      rowKey={(r) => r.id}
      columns={[
        { id: "name", label: "Elemento", value: (r) => r.name, cell: (r) => <span className="font-medium">{r.name}</span> },
        {
          id: "estado",
          label: "Estado",
          value: (r) => r.estado,
          cell: (r) => <Badge variant={r.estado === 1 ? "success" : "default"}>{erpRecordLabel(r.estado)}</Badge>,
        },
      ]}
      actions={(r) => (
        <ErpRowActions
          deleteAction={deleteErpElement.bind(null, r.id)}
          deleteConfirm={`¿Borrar ${r.name}?`}
          editHref={`/backoffice/config/elementos?edit=${r.id}`}
        />
      )}
    />
  );
}

export function MonedasTable({
  rows,
}: {
  rows: { id: string; code: string; name: string; rate: number }[];
}) {
  return (
    <ErpDataTable
      storageKey="erp.table.monedas.v1"
      rows={rows}
      rowKey={(r) => r.id}
      columns={[
        { id: "code", label: "Código", value: (r) => r.code, cell: (r) => <span className="font-medium">{r.code}</span> },
        { id: "name", label: "Nombre", value: (r) => r.name, cell: (r) => r.name },
        { id: "rate", label: "Cotización", align: "right", value: (r) => r.rate, cell: (r) => r.rate },
      ]}
      actions={(r) => (
        <ErpRowActions
          deleteAction={deleteErpCurrency.bind(null, r.id)}
          deleteConfirm={`¿Borrar ${r.code}?`}
          editHref={`/backoffice/config/monedas?edit=${r.id}`}
        />
      )}
    />
  );
}

export function EmpresasTable({
  rows,
}: {
  rows: { id: string; name: string; currency: string; paymentDays: number; estado: number }[];
}) {
  return (
    <ErpDataTable
      storageKey="erp.table.empresas.v1"
      rows={rows}
      rowKey={(r) => r.id}
      columns={[
        { id: "name", label: "Empresa", value: (r) => r.name, cell: (r) => <span className="font-medium">{r.name}</span> },
        { id: "currency", label: "Moneda", value: (r) => r.currency, cell: (r) => r.currency },
        {
          id: "plazo",
          label: "Plazo",
          align: "right",
          value: (r) => r.paymentDays,
          cell: (r) => `${r.paymentDays} días`,
        },
        {
          id: "estado",
          label: "Estado",
          value: (r) => r.estado,
          cell: (r) => <Badge variant={r.estado === 1 ? "success" : "default"}>{erpRecordLabel(r.estado)}</Badge>,
        },
      ]}
      actions={(r) => (
        <ErpRowActions
          deleteAction={deleteErpCompany.bind(null, r.id)}
          deleteConfirm={`¿Borrar la empresa ${r.name}?`}
          editHref={`/backoffice/config/empresas?edit=${r.id}`}
        />
      )}
    />
  );
}

export function ClientesTable({
  rows,
}: {
  rows: {
    id: string;
    name: string;
    company: string;
    taxId: string | null;
    executive: string | null;
    estado: number;
  }[];
}) {
  return (
    <ErpDataTable
      storageKey="erp.table.clientes.v1"
      rows={rows}
      rowKey={(r) => r.id}
      columns={[
        { id: "name", label: "Cliente", value: (r) => r.name, cell: (r) => <span className="font-medium">{r.name}</span> },
        { id: "company", label: "Empresa", value: (r) => r.company, cell: (r) => r.company },
        { id: "taxId", label: "CUIT", value: (r) => r.taxId, cell: (r) => r.taxId ?? "—" },
        { id: "executive", label: "Ejecutivo", value: (r) => r.executive, cell: (r) => r.executive ?? "—" },
        {
          id: "estado",
          label: "Estado",
          value: (r) => r.estado,
          cell: (r) => <Badge variant={r.estado === 1 ? "success" : "default"}>{erpRecordLabel(r.estado)}</Badge>,
        },
      ]}
      actions={(r) => (
        <ErpRowActions
          deleteAction={deleteErpClient.bind(null, r.id)}
          deleteConfirm={`¿Borrar el cliente ${r.name}?`}
          editHref={`/backoffice/clientes?edit=${r.id}`}
        />
      )}
    />
  );
}

export function ProveedoresTable({
  rows,
}: {
  rows: {
    id: string;
    name: string;
    kind: number;
    taxId: string | null;
    paymentDays: number;
    platform: string | null;
  }[];
}) {
  return (
    <ErpDataTable
      storageKey="erp.table.proveedores.v1"
      rows={rows}
      rowKey={(r) => r.id}
      columns={[
        { id: "name", label: "Proveedor", value: (r) => r.name, cell: (r) => <span className="font-medium">{r.name}</span> },
        {
          id: "kind",
          label: "Tipo",
          value: (r) => r.kind,
          cell: (r) => <Badge variant={r.kind === 1 ? "warning" : "info"}>{erpVendorKindLabel(r.kind)}</Badge>,
        },
        { id: "taxId", label: "CUIT", value: (r) => r.taxId, cell: (r) => r.taxId ?? "—" },
        {
          id: "plazo",
          label: "Plazo",
          align: "right",
          value: (r) => r.paymentDays,
          cell: (r) => `${r.paymentDays} días`,
        },
        { id: "platform", label: "Plataforma", value: (r) => r.platform, cell: (r) => r.platform ?? "—" },
      ]}
      actions={(r) => (
        <ErpRowActions
          deleteAction={deleteErpVendor.bind(null, r.id)}
          deleteConfirm={`¿Borrar el proveedor ${r.name}?`}
          editHref={`/backoffice/proveedores?edit=${r.id}`}
        />
      )}
    />
  );
}

export function GastosTable({
  rows,
}: {
  rows: { id: string; month: number; year: number; fixed: number; bank: number; vat: number; commissions: number }[];
}) {
  return (
    <ErpDataTable
      storageKey="erp.table.gastos.v1"
      rows={rows}
      rowKey={(r) => r.id}
      columns={[
        {
          id: "periodo",
          label: "Período",
          value: (r) => r.year * 100 + r.month,
          cell: (r) => (
            <span className="font-medium">
              {ERP_MONTHS[r.month]} {r.year}
            </span>
          ),
        },
        { id: "fixed", label: "Fijo", align: "right", value: (r) => r.fixed, cell: (r) => money(r.fixed) },
        { id: "bank", label: "Banco", align: "right", value: (r) => r.bank, cell: (r) => money(r.bank) },
        { id: "vat", label: "IVA", align: "right", value: (r) => r.vat, cell: (r) => money(r.vat) },
        {
          id: "commissions",
          label: "Comisiones",
          align: "right",
          value: (r) => r.commissions,
          cell: (r) => money(r.commissions),
        },
        {
          id: "total",
          label: "Total",
          align: "right",
          value: (r) => r.fixed + r.bank + r.vat + r.commissions,
          cell: (r) => <span className="font-medium">{money(r.fixed + r.bank + r.vat + r.commissions)}</span>,
        },
      ]}
      actions={(r) => (
        <ErpRowActions
          deleteAction={deleteErpExpense.bind(null, r.id)}
          deleteConfirm={`¿Borrar gastos de ${ERP_MONTHS[r.month]} ${r.year}?`}
          editHref={`/backoffice/gastos?edit=${r.id}`}
        />
      )}
    />
  );
}

export function FacturasVentaTable({
  rows,
}: {
  rows: {
    id: string;
    docType: string;
    pos: number;
    number: number;
    client: string;
    order: string;
    issuedAt: string | Date;
    dueAt: string | Date;
    total: number;
    collectStatus: number;
  }[];
}) {
  return (
    <ErpDataTable
      storageKey="erp.table.facturas-venta.v1"
      rows={rows}
      rowKey={(r) => r.id}
      columns={[
        {
          id: "doc",
          label: "Comprobante",
          value: (r) => r.number,
          cell: (r) => <span className="font-medium">{docRef(r.docType, r.pos, r.number)}</span>,
        },
        { id: "client", label: "Cliente", value: (r) => r.client, cell: (r) => r.client },
        { id: "order", label: "Orden", value: (r) => r.order, cell: (r) => r.order },
        { id: "issuedAt", label: "Fecha", value: (r) => String(r.issuedAt), cell: (r) => displayDate(r.issuedAt) },
        { id: "dueAt", label: "Vence", value: (r) => String(r.dueAt), cell: (r) => displayDate(r.dueAt) },
        { id: "total", label: "Total", align: "right", value: (r) => r.total, cell: (r) => money(r.total) },
        {
          id: "cobro",
          label: "Cobro",
          value: (r) => r.collectStatus,
          cell: (r) => (r.collectStatus === 1 ? "Cobrado" : "Pendiente"),
        },
      ]}
      actions={(r) => (
        <ErpRowActions
          confirmAction={
            r.collectStatus === ERP_COLLECT.collected
              ? undefined
              : setErpSaleCollectStatus.bind(null, r.id, ERP_COLLECT.collected)
          }
          confirmLabel="Cobrada"
          confirmPrompt="¿Marcar esta factura como cobrada?"
          deleteAction={deleteErpSaleInvoice.bind(null, r.id)}
          deleteConfirm="¿Borrar esta factura? Si la orden ya no cubre el importe, se reabre."
          editHref={`/backoffice/facturacion/venta?edit=${r.id}`}
        />
      )}
    />
  );
}

export function FacturasCompraTable({
  rows,
}: {
  rows: {
    id: string;
    docType: string;
    pos: number;
    number: number;
    vendor: string;
    issuedAt: string | Date;
    total: number;
    retenciones: number;
    payStatus: number;
    isCreditNote: boolean;
  }[];
}) {
  return (
    <ErpDataTable
      storageKey="erp.table.facturas-compra.v1"
      rows={rows}
      rowKey={(r) => r.id}
      columns={[
        {
          id: "doc",
          label: "Comprobante",
          value: (r) => r.number,
          cell: (r) => <span className="font-medium">{docRef(r.docType, r.pos, r.number)}</span>,
        },
        { id: "vendor", label: "Proveedor", value: (r) => r.vendor, cell: (r) => r.vendor },
        { id: "issuedAt", label: "Fecha", value: (r) => String(r.issuedAt), cell: (r) => displayDate(r.issuedAt) },
        { id: "total", label: "Importe", align: "right", value: (r) => r.total, cell: (r) => money(r.total) },
        {
          id: "retenciones",
          label: "Retenciones",
          align: "right",
          value: (r) => r.retenciones,
          cell: (r) => money(r.retenciones),
        },
        {
          id: "pago",
          label: "Pago",
          value: (r) => r.payStatus,
          cell: (r) => `${r.isCreditNote ? "NC · " : ""}${r.payStatus === 1 ? "Pagado" : "Pendiente"}`,
        },
      ]}
      actions={(r) => (
        <ErpRowActions
          deleteAction={deleteErpPurchaseInvoice.bind(null, r.id)}
          deleteConfirm="¿Borrar esta factura? Si la orden ya no cubre el importe, se reabre."
          editHref={`/backoffice/facturacion/compra?edit=${r.id}`}
        />
      )}
    />
  );
}

export function FacturasIvaTable({
  rows,
}: {
  rows: {
    id: string;
    docType: string;
    pos: number;
    number: number;
    vendor: string;
    issuedAt: string | Date;
    total: number;
    commission: number;
  }[];
}) {
  return (
    <ErpDataTable
      storageKey="erp.table.facturas-iva.v1"
      rows={rows}
      rowKey={(r) => r.id}
      columns={[
        {
          id: "doc",
          label: "Comprobante",
          value: (r) => r.number,
          cell: (r) => <span className="font-medium">{docRef(r.docType, r.pos, r.number)}</span>,
        },
        { id: "vendor", label: "Proveedor", value: (r) => r.vendor, cell: (r) => r.vendor },
        { id: "issuedAt", label: "Fecha", value: (r) => String(r.issuedAt), cell: (r) => displayDate(r.issuedAt) },
        { id: "total", label: "Total", align: "right", value: (r) => r.total, cell: (r) => money(r.total) },
        {
          id: "commission",
          label: "Comisión",
          align: "right",
          value: (r) => r.commission,
          cell: (r) => money(r.commission),
        },
      ]}
      actions={(r) => (
        <ErpRowActions
          deleteAction={deleteErpPurchaseInvoice.bind(null, r.id)}
          deleteConfirm="¿Borrar esta factura IVA?"
          editHref={`/backoffice/facturacion/iva?edit=${r.id}`}
        />
      )}
    />
  );
}

export function PendientesTable({
  rows,
}: {
  rows: {
    id: string;
    dueAt: string | Date;
    issuedAt: string | Date;
    doc: string;
    vendor: string;
    order: string;
    amount: number;
    overdue: boolean;
  }[];
}) {
  return (
    <ErpDataTable
      storageKey="erp.table.pendientes.v1"
      rows={rows}
      rowKey={(r) => r.id}
      rowClassName={(r) => (r.overdue ? "text-[var(--error)]" : undefined)}
      columns={[
        {
          id: "dueAt",
          label: "Vence",
          value: (r) => String(r.dueAt),
          cell: (r) => (
            <span className="flex flex-col leading-none">
              {displayDate(r.dueAt)}
              <span className="text-[10px] leading-none text-muted-foreground">FC {displayDate(r.issuedAt)}</span>
            </span>
          ),
        },
        {
          id: "doc",
          label: "Factura",
          value: (r) => r.doc,
          cell: (r) => (
            <span className="font-medium">
              {r.doc}
              {r.overdue ? (
                <Badge className="ml-2" variant="warning">
                  Vencido
                </Badge>
              ) : null}
            </span>
          ),
        },
        { id: "vendor", label: "Proveedor", value: (r) => r.vendor, cell: (r) => r.vendor },
        { id: "order", label: "Orden", value: (r) => r.order, cell: (r) => r.order },
        { id: "amount", label: "Importe", align: "right", value: (r) => r.amount, cell: (r) => money(r.amount) },
      ]}
      actions={(r) => (
        <ErpRowActions
          confirmAction={setErpPurchasePayStatus.bind(null, r.id, ERP_SETTLE.paid)}
          confirmLabel="Pagada"
          confirmPrompt="¿Marcar esta factura como pagada?"
          editHref={`/backoffice/facturacion/compra?edit=${r.id}`}
        />
      )}
    />
  );
}

export function RecibosTable({
  rows,
}: {
  rows: {
    id: string;
    number: number;
    client: string;
    issuedAt: string | Date;
    amount: number;
    balance: number;
    invoices: number;
  }[];
}) {
  return (
    <ErpDataTable
      storageKey="erp.table.recibos.v1"
      rows={rows}
      rowKey={(r) => r.id}
      columns={[
        { id: "number", label: "Nº", value: (r) => r.number, cell: (r) => <span className="font-medium">{r.number}</span> },
        { id: "client", label: "Cliente", value: (r) => r.client, cell: (r) => r.client },
        { id: "issuedAt", label: "Fecha", value: (r) => String(r.issuedAt), cell: (r) => displayDate(r.issuedAt) },
        { id: "amount", label: "Importe", align: "right", value: (r) => r.amount, cell: (r) => money(r.amount) },
        { id: "balance", label: "Saldo", align: "right", value: (r) => r.balance, cell: (r) => money(r.balance) },
        { id: "invoices", label: "Facturas", align: "right", value: (r) => r.invoices, cell: (r) => r.invoices },
      ]}
      actions={(r) => (
        <ErpRowActions
          deleteAction={deleteErpSaleReceipt.bind(null, r.id)}
          deleteConfirm="¿Borrar este recibo y sus cheques asociados?"
          editHref={`/backoffice/facturacion/recibos?edit=${r.id}`}
        />
      )}
    />
  );
}

export function PagosTable({
  rows,
}: {
  rows: {
    id: string;
    number: number;
    vendor: string;
    issuedAt: string | Date;
    amount: number;
    notes: string | null;
    invoices: number;
  }[];
}) {
  return (
    <ErpDataTable
      storageKey="erp.table.pagos.v1"
      rows={rows}
      rowKey={(r) => r.id}
      columns={[
        { id: "number", label: "Nº", value: (r) => r.number, cell: (r) => <span className="font-medium">{r.number}</span> },
        { id: "vendor", label: "Proveedor", value: (r) => r.vendor, cell: (r) => r.vendor },
        { id: "issuedAt", label: "Fecha", value: (r) => String(r.issuedAt), cell: (r) => displayDate(r.issuedAt) },
        { id: "amount", label: "Importe", align: "right", value: (r) => r.amount, cell: (r) => money(r.amount) },
        { id: "notes", label: "Medio", value: (r) => r.notes, cell: (r) => r.notes ?? "—" },
        { id: "invoices", label: "Facturas", align: "right", value: (r) => r.invoices, cell: (r) => r.invoices },
      ]}
      actions={(r) => (
        <ErpRowActions
          deleteAction={deleteErpPaymentOrder.bind(null, r.id)}
          deleteConfirm="¿Borrar esta orden de pago?"
          editHref={`/backoffice/facturacion/pagos?edit=${r.id}`}
        />
      )}
    />
  );
}

type ChequeRow = {
  id: string;
  number: string | number | null;
  paymentKind: number;
  party: string;
  issuedAt: string | Date | null;
  paidAt: string | Date | null;
  amount: number;
  estado?: number;
};

export function ChequesTable({
  rows,
  storageKey,
  showEstado,
}: {
  rows: ChequeRow[];
  storageKey: string;
  showEstado?: boolean;
}) {
  const columns: ErpTableColumn<ChequeRow>[] = [
    { id: "number", label: "Nº", value: (r) => r.number, cell: (r) => <span className="font-medium">{r.number ?? "—"}</span> },
    {
      id: "tipo",
      label: "Tipo",
      value: (r) => r.paymentKind,
      cell: (r) => (r.paymentKind === ERP_PAY.transfer ? "Transfer" : "E-cheq"),
    },
    { id: "party", label: showEstado ? "Proveedor" : "Cliente", value: (r) => r.party, cell: (r) => r.party },
    { id: "issuedAt", label: "Emisión", value: (r) => (r.issuedAt ? String(r.issuedAt) : null), cell: (r) => displayDate(r.issuedAt) },
    { id: "paidAt", label: "Pago", value: (r) => (r.paidAt ? String(r.paidAt) : null), cell: (r) => displayDate(r.paidAt) },
    { id: "amount", label: "Importe", align: "right", value: (r) => r.amount, cell: (r) => money(r.amount) },
  ];
  if (showEstado) {
    columns.push({
      id: "estado",
      label: "Estado",
      value: (r) => r.estado ?? 0,
      cell: (r) => <Badge>{r.estado === 1 ? "Pagado" : "Pendiente"}</Badge>,
    });
  }
  return (
    <ErpDataTable
      storageKey={storageKey}
      rows={rows}
      rowKey={(r) => r.id}
      columns={columns}
      actions={(r) => (
        <ErpRowActions
          deleteAction={deleteErpCheque.bind(null, r.id)}
          deleteConfirm="¿Borrar este cheque?"
          editHref={`/backoffice/facturacion/cheques?edit=${r.id}`}
        />
      )}
    />
  );
}

export function OrdenesVentaTable({
  rows,
}: {
  rows: {
    id: string;
    number: string;
    client: string;
    month: number;
    year: number;
    issuedAt: string | Date;
    items: string;
    amount: number;
    estado: number;
    cashPayment: boolean;
  }[];
}) {
  return (
    <ErpDataTable
      storageKey="erp.table.ordenes-venta.v2"
      rows={rows}
      rowKey={(r) => r.id}
      columns={[
        { id: "number", label: "Número", value: (r) => r.number, cell: (r) => <span className="font-medium">{r.number}</span> },
        { id: "client", label: "Cliente", value: (r) => r.client, cell: (r) => r.client },
        {
          id: "periodo",
          label: "Período",
          value: (r) => r.year * 100 + r.month,
          cell: (r) => `${ERP_MONTHS[r.month]} ${r.year}`,
        },
        { id: "issuedAt", label: "Fecha", value: (r) => String(r.issuedAt), cell: (r) => displayDate(r.issuedAt) },
        { id: "items", label: "Ítems", value: (r) => r.items, cell: (r) => r.items || "—" },
        { id: "amount", label: "Importe", align: "right", value: (r) => r.amount, cell: (r) => money(r.amount) },
        {
          id: "settlement",
          label: "Condición",
          value: (r) => (r.cashPayment ? 1 : 0),
          cell: (r) => (
            <Badge variant={r.cashPayment ? "warning" : "info"}>{erpSettlementLabel(r.cashPayment)}</Badge>
          ),
        },
        {
          id: "estado",
          label: "Estado",
          value: (r) => r.estado,
          cell: (r) => <Badge variant={erpOrderBadge(r.estado)}>{erpOrderLabel(r.estado)}</Badge>,
        },
      ]}
      actions={(r) => (
        <ErpRowActions
          deleteAction={deleteErpSaleOrder.bind(null, r.id)}
          deleteConfirm={`¿Borrar la O.P. ${r.number}?`}
          editHref={`/backoffice/ordenes/venta?edit=${r.id}`}
          pdfHref={`/api/pdf/erp/orden?tipo=venta&id=${r.id}`}
        />
      )}
    />
  );
}

export function CampaignItemsTable({
  rows,
}: {
  rows: {
    id: string;
    element: string;
    location: string | null;
    quantity: number;
    startsAt: string | Date | null;
    endsAt: string | Date | null;
  }[];
}) {
  return (
    <ErpDataTable
      storageKey="erp.table.campaign-items.v1"
      rows={rows}
      rowKey={(r) => r.id}
      columns={[
        { id: "element", label: "Elemento", value: (r) => r.element, cell: (r) => <span className="font-medium">{r.element}</span> },
        { id: "location", label: "Ubicación", value: (r) => r.location, cell: (r) => r.location ?? "—" },
        { id: "quantity", label: "Cant.", align: "right", value: (r) => r.quantity, cell: (r) => r.quantity },
        {
          id: "periodo",
          label: "Período",
          value: (r) => (r.startsAt ? String(r.startsAt) : null),
          cell: (r) =>
            `${r.startsAt ? displayDate(r.startsAt) : "—"}${r.endsAt ? ` → ${displayDate(r.endsAt)}` : ""}`,
        },
      ]}
      actions={(r) => (
        <ErpRowActions deleteAction={deleteErpCampaignItem.bind(null, r.id)} deleteConfirm="¿Borrar este ítem?" />
      )}
    />
  );
}

export function OrdenesCompraTable({
  rows,
  kind,
}: {
  kind: "compra" | "produccion";
  rows: {
    id: string;
    number: string;
    saleNumber: string;
    client: string;
    vendor: string;
    issuedAt: string | Date;
    amount: number;
    estado: number;
    cashPayment: boolean;
  }[];
}) {
  const isBuy = kind === "compra";
  return (
    <ErpDataTable
      storageKey={`erp.table.ordenes-${kind}.v2`}
      rows={rows}
      rowKey={(r) => r.id}
      columns={[
        { id: "number", label: "Número", value: (r) => r.number, cell: (r) => <span className="font-medium">{r.number}</span> },
        {
          id: "venta",
          label: "Venta",
          value: (r) => r.saleNumber,
          cell: (r) => (
            <span className="flex flex-col leading-none">
              {r.saleNumber}
              <span className="text-[10px] leading-none text-muted-foreground">{r.client}</span>
            </span>
          ),
        },
        { id: "vendor", label: isBuy ? "Proveedor" : "Productor", value: (r) => r.vendor, cell: (r) => r.vendor },
        { id: "issuedAt", label: "Fecha", value: (r) => String(r.issuedAt), cell: (r) => displayDate(r.issuedAt) },
        { id: "amount", label: "Importe", align: "right", value: (r) => r.amount, cell: (r) => money(r.amount) },
        {
          id: "settlement",
          label: "Condición",
          value: (r) => (r.cashPayment ? 1 : 0),
          cell: (r) => (
            <Badge variant={r.cashPayment ? "warning" : "info"}>{erpSettlementLabel(r.cashPayment)}</Badge>
          ),
        },
        {
          id: "estado",
          label: "Estado",
          value: (r) => r.estado,
          cell: (r) => <Badge variant={erpOrderBadge(r.estado)}>{erpOrderLabel(r.estado)}</Badge>,
        },
      ]}
      actions={(r) => (
        <ErpRowActions
          deleteAction={
            isBuy ? deleteErpPurchaseOrder.bind(null, r.id) : deleteErpProductionOrder.bind(null, r.id)
          }
          deleteConfirm={`¿Borrar la ${isBuy ? "O.P." : "orden"} ${r.number}?`}
          editHref={`/backoffice/ordenes/${kind}?edit=${r.id}`}
          pdfHref={`/api/pdf/erp/orden?tipo=${kind}&id=${r.id}`}
        />
      )}
    />
  );
}

export function InformeTable({
  rows,
}: {
  rows: {
    key: string;
    kind: string;
    client: string;
    order: string;
    uninvoiced: boolean;
    compraTotal: number;
    ventaTotal: number;
    totalCompraIva: number;
    comision: number;
    gananciaBruta: number;
    porcentaje: number | null;
  }[];
}) {
  return (
    <ErpDataTable
      storageKey="erp.table.informe.v1"
      rows={rows}
      rowKey={(r) => r.key}
      rowClassName={(r) => (r.kind !== "order" ? "font-semibold" : undefined)}
      columns={[
        { id: "client", label: "Cliente", value: (r) => r.client, cell: (r) => r.client },
        {
          id: "order",
          label: "Orden",
          value: (r) => r.order,
          cell: (r) => <span className={r.uninvoiced ? "text-[var(--error)]" : undefined}>{r.order}</span>,
        },
        { id: "compra", label: "Compra", align: "right", value: (r) => r.compraTotal, cell: (r) => money(r.compraTotal) },
        {
          id: "venta",
          label: "Venta",
          align: "right",
          value: (r) => r.ventaTotal,
          cell: (r) => (r.kind === "expenses" ? "—" : money(r.ventaTotal)),
        },
        {
          id: "iva",
          label: "Compra IVA",
          align: "right",
          value: (r) => r.totalCompraIva,
          cell: (r) => (r.kind === "expenses" ? "—" : money(r.totalCompraIva)),
        },
        {
          id: "comision",
          label: "Comisión",
          align: "right",
          value: (r) => r.comision,
          cell: (r) => (r.kind === "expenses" ? "—" : money(r.comision)),
        },
        {
          id: "ganancia",
          label: "Ganancia",
          align: "right",
          value: (r) => r.gananciaBruta,
          cell: (r) => <span className="font-medium">{money(r.gananciaBruta)}</span>,
        },
        {
          id: "pct",
          label: "%",
          align: "right",
          value: (r) => r.porcentaje,
          cell: (r) => (r.porcentaje == null ? "—" : `${r.porcentaje.toFixed(2)}%`),
        },
      ]}
    />
  );
}

export function PlazasTable({
  rows,
}: {
  rows: {
    id: string;
    name: string;
    cities: { id: string; name: string }[];
  }[];
}) {
  return (
    <ErpDataTable
      storageKey="erp.table.plazas.v1"
      rows={rows}
      rowKey={(r) => r.id}
      columns={[
        { id: "name", label: "Plaza", value: (r) => r.name, cell: (r) => <span className="font-medium">{r.name}</span> },
        {
          id: "cities",
          label: "Localidades",
          value: (r) => r.cities.length,
          cell: (r) =>
            r.cities.length === 0 ? (
              "—"
            ) : (
              <ul className="space-y-1">
                {r.cities.map((c) => (
                  <li className="flex items-center justify-between gap-3" key={c.id}>
                    <span>{c.name}</span>
                    <ErpRowActions
                      deleteAction={deleteErpCity.bind(null, c.id)}
                      deleteConfirm={`¿Borrar ${c.name}?`}
                      editHref={`/backoffice/config/plazas?city=${c.id}`}
                    />
                  </li>
                ))}
              </ul>
            ),
        },
      ]}
      actions={(r) => (
        <ErpRowActions
          deleteAction={deleteErpProvince.bind(null, r.id)}
          deleteConfirm={`¿Borrar la plaza ${r.name} y sus localidades?`}
          editHref={`/backoffice/config/plazas?edit=${r.id}`}
        />
      )}
    />
  );
}
