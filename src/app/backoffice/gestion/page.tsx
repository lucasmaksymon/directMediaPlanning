import Link from "next/link";
import { productTitle } from "@/lib/brand";
import { cn } from "@/lib/cn";
import { adminPage, adminPageBody } from "@/lib/ui-classes";
import { Badge, EmptyState, Input, PageHeader, Select, Table, TBody, TD, TH, THead, TR } from "@/components/ui";
import { ErpRowActions } from "@/components/erp/ErpRowActions";
import { loadGestionLines } from "@/lib/erp-gestion";
import { displayDate, ERP_COLLECT, ERP_MONTHS, ERP_SETTLE, money } from "@/lib/erp";
import { setErpPurchasePayStatus, setErpSaleCollectStatus } from "@/app/actions/erp-billing";

export const metadata = { title: productTitle("Gestión") };

export default async function ErpGestionPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; anio?: string; q?: string; cobro?: string; pago?: string }>;
}) {
  const params = await searchParams;
  const now = new Date();
  const year = Number(params.anio) || now.getFullYear();
  const month = params.mes ? Number(params.mes) : 0;
  const rows = await loadGestionLines({
    year,
    month: month || undefined,
    q: params.q?.trim() || undefined,
    sale: (params.cobro as "all" | "to_invoice" | "pending" | "collected") || "all",
    pay: (params.pago as "all" | "pending" | "paid") || "all",
  });

  const toInvoice = rows.filter((r) => !r.sale).length;
  const pendingSale = rows.filter((r) => r.sale && r.sale.collectStatus !== ERP_COLLECT.collected).length;
  const pendingPay = rows.filter(
    (r) =>
      (r.purchase && r.purchase.payStatus !== ERP_SETTLE.paid) ||
      (r.production && r.production.payStatus !== ERP_SETTLE.paid),
  ).length;

  return (
    <div className={cn(adminPage, "gap-4")}>
      <PageHeader
        description="Misma planilla que ADMIN 2026: una fila = ítem + compra + producción + venta."
        eyebrow="Administración"
        title="Gestión"
      />
      <div className={cn(adminPageBody, "flex flex-col gap-3 pb-8")}>
        <form className="flex flex-wrap items-end gap-3" method="get">
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Mes</span>
            <Select defaultValue={String(month)} name="mes">
              <option value="0">Todos</option>
              {ERP_MONTHS.slice(1).map((label, i) => (
                <option key={label} value={i + 1}>
                  {label}
                </option>
              ))}
            </Select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Año</span>
            <Input defaultValue={year} name="anio" type="number" />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Cliente / orden / ítem</span>
            <Input defaultValue={params.q ?? ""} name="q" placeholder="MIMO, CPM, 12…" />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Cobro</span>
            <Select defaultValue={params.cobro ?? "all"} name="cobro">
              <option value="all">Todos</option>
              <option value="to_invoice">A facturar</option>
              <option value="pending">Pendiente</option>
              <option value="collected">Cobrado</option>
            </Select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Pago</span>
            <Select defaultValue={params.pago ?? "all"} name="pago">
              <option value="all">Todos</option>
              <option value="pending">Pendiente</option>
              <option value="paid">Pagado</option>
            </Select>
          </label>
          <button className="text-sm font-semibold text-led" type="submit">
            Filtrar
          </button>
          <Link className="text-sm text-muted-foreground hover:text-foreground" href="/backoffice/facturacion/pendientes">
            Pagos pendientes →
          </Link>
          <Link className="text-sm text-muted-foreground hover:text-foreground" href="/backoffice/facturacion/cheques">
            Tesorería →
          </Link>
        </form>

        <p className="text-xs text-muted-foreground">
          {rows.length} filas · {toInvoice} a facturar · {pendingSale} cobro pendiente · {pendingPay} pago pendiente
        </p>

        {rows.length === 0 ? (
          <EmptyState
            description="No hay filas con estos filtros. Importá el Excel 2026 o cargá una O.P. de venta."
            title="Sin campañas"
          />
        ) : (
          <Table className="min-w-[86rem] text-xs">
            <THead>
              <TR>
                <TH>Orden</TH>
                <TH>Cliente</TH>
                <TH>Ítem</TH>
                <TH>Plaza</TH>
                <TH>Cant.</TH>
                <TH>Período</TH>
                <TH>FC compra</TH>
                <TH>Medio</TH>
                <TH>Neto</TH>
                <TH>IIBB</TH>
                <TH>Diego</TH>
                <TH>Pago</TH>
                <TH>Producción</TH>
                <TH>FC venta</TH>
                <TH>Neto vta</TH>
                <TH>Cobro</TH>
                <TH className="text-right">Acciones</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((r) => (
                <TR key={r.id}>
                  <TD className="font-medium">
                    <Link className="hover:underline" href={`/backoffice/ordenes/venta?edit=${r.orderId}`}>
                      {r.number}
                    </Link>
                    <span className="block text-[10px] text-muted-foreground">
                      {ERP_MONTHS[r.month]} {r.year}
                    </span>
                  </TD>
                  <TD>
                    {r.client}
                    {r.legalName ? (
                      <span className="block text-[10px] text-muted-foreground">{r.legalName}</span>
                    ) : null}
                  </TD>
                  <TD>{r.element ?? "—"}</TD>
                  <TD>{r.location ?? "—"}</TD>
                  <TD className="tabular-nums">{r.quantity || "—"}</TD>
                  <TD className="text-muted-foreground">
                    {r.startsAt ? displayDate(r.startsAt) : "—"}
                    {r.endsAt ? ` → ${displayDate(r.endsAt)}` : ""}
                  </TD>
                  <TD>
                    {r.purchase ? (
                      <Link className="hover:underline" href={`/backoffice/facturacion/compra?edit=${r.purchase.id}`}>
                        {r.purchase.doc}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TD>
                  <TD>{r.purchase?.vendor ?? "—"}</TD>
                  <TD className="tabular-nums">{r.purchase ? money(r.purchase.net) : "—"}</TD>
                  <TD className="tabular-nums text-muted-foreground">
                    {r.purchase?.iibb || r.purchase?.percVat
                      ? money((r.purchase?.iibb ?? 0) + (r.purchase?.percVat ?? 0))
                      : "—"}
                  </TD>
                  <TD className="tabular-nums">{r.purchase?.diegoFee ? money(r.purchase.diegoFee) : "—"}</TD>
                  <TD>
                    {r.purchase ? (
                      <Badge variant={r.purchase.payStatus === ERP_SETTLE.paid ? "success" : "warning"}>
                        {r.purchase.payStatus === ERP_SETTLE.paid ? "Pagado" : "Pendiente"}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </TD>
                  <TD>
                    {r.production ? (
                      <span>
                        {r.production.doc}
                        <span className="block text-[10px] text-muted-foreground">
                          {r.production.vendor} · {money(r.production.net)}
                        </span>
                      </span>
                    ) : (
                      "—"
                    )}
                  </TD>
                  <TD>
                    {r.sale ? (
                      <Link className="hover:underline" href={`/backoffice/facturacion/venta?edit=${r.sale.id}`}>
                        {r.sale.doc}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TD>
                  <TD className="tabular-nums">{r.sale ? money(r.sale.net) : "—"}</TD>
                  <TD>
                    {r.sale ? (
                      <span>
                        <Badge variant={r.sale.collectStatus === ERP_COLLECT.collected ? "success" : "info"}>
                          {r.sale.collectStatus === ERP_COLLECT.collected ? "Cobrado" : "Pendiente"}
                        </Badge>
                        {r.sale.receiptRef ? (
                          <span className="block text-[10px] text-muted-foreground">{r.sale.receiptRef}</span>
                        ) : null}
                      </span>
                    ) : (
                      <Badge variant="warning">A facturar</Badge>
                    )}
                  </TD>
                  <TD>
                    <ErpRowActions
                      confirmAction={
                        r.sale && r.sale.collectStatus !== ERP_COLLECT.collected
                          ? setErpSaleCollectStatus.bind(null, r.sale.id, ERP_COLLECT.collected)
                          : r.purchase && r.purchase.payStatus !== ERP_SETTLE.paid
                            ? setErpPurchasePayStatus.bind(null, r.purchase.id, ERP_SETTLE.paid)
                            : r.production && r.production.payStatus !== ERP_SETTLE.paid
                              ? setErpPurchasePayStatus.bind(null, r.production.id, ERP_SETTLE.paid)
                              : undefined
                      }
                      confirmLabel={
                        r.sale && r.sale.collectStatus !== ERP_COLLECT.collected
                          ? "Cobrada"
                          : r.purchase && r.purchase.payStatus !== ERP_SETTLE.paid
                            ? "Pagada"
                            : r.production && r.production.payStatus !== ERP_SETTLE.paid
                              ? "Pagada"
                              : undefined
                      }
                      confirmPrompt="¿Confirmar el cambio de estado?"
                      editHref={`/backoffice/ordenes/venta?edit=${r.orderId}`}
                    />
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </div>
    </div>
  );
}
