import { prisma } from "@/lib/prisma";
import { productTitle } from "@/lib/brand";
import { cn } from "@/lib/cn";
import { adminPage, adminPageBody } from "@/lib/ui-classes";
import { Badge, EmptyState, Input, PageHeader, Select, Table, TBody, TD, TH, THead, TR } from "@/components/ui";
import { ErpForm } from "@/components/erp/ErpForm";
import { ErpField } from "@/components/erp/ErpField";
import { ErpRowActions } from "@/components/erp/ErpRowActions";
import { createErpCompany, deleteErpCompany, updateErpCompany } from "@/app/actions/erp-masters";
import { erpRecordLabel } from "@/lib/erp";

export const metadata = { title: productTitle("Empresas") };

export default async function ErpEmpresasPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  const [companies, currencies] = await Promise.all([
    prisma.erpCompany.findMany({ orderBy: { name: "asc" } }),
    prisma.erpCurrency.findMany({ where: { estado: 1 }, orderBy: { code: "asc" } }),
  ]);
  const current = companies.find((c) => c.id === edit);
  const currencyCodes = new Set(currencies.map((c) => c.code));

  return (
    <div className={cn(adminPage, "gap-4")}>
      <PageHeader
        description="Holding del cliente: moneda (del catálogo) y plazo de pago para el vencimiento de facturas."
        eyebrow="Configuración"
        title="Empresas"
      />
      <div className={cn(adminPageBody, "flex flex-col gap-3 pb-8")}>
        <ErpForm
          action={current ? updateErpCompany : createErpCompany}
          cancelHref={current ? "/backoffice/config/empresas" : undefined}
          key={current?.id ?? "new"}
          resetOnSuccess={!current}
          submitLabel={current ? "Guardar cambios" : "Guardar"}
          title={current ? "Editar empresa" : "Nueva empresa"}
        >
          {current ? <input name="id" type="hidden" value={current.id} /> : null}
          <ErpField htmlFor="name" label="Nombre">
            <Input defaultValue={current?.name} id="name" name="name" required />
          </ErpField>
          <ErpField htmlFor="currency" label="Moneda">
            {currencies.length > 0 ? (
              <Select defaultValue={current?.currency ?? "ARS"} id="currency" name="currency">
                {currencies.map((c) => (
                  <option key={c.id} value={c.code}>
                    {c.code} — {c.name}
                  </option>
                ))}
                {current?.currency && !currencyCodes.has(current.currency) ? (
                  <option value={current.currency}>{current.currency}</option>
                ) : null}
              </Select>
            ) : (
              <Input defaultValue={current?.currency ?? "ARS"} id="currency" name="currency" />
            )}
          </ErpField>
          <ErpField htmlFor="paymentDays" label="Plazo de pago (días)">
            <Input defaultValue={String(current?.paymentDays ?? 30)} min={0} name="paymentDays" type="number" />
          </ErpField>
          <ErpField htmlFor="estado" label="Estado">
            <Select defaultValue={String(current?.estado ?? 1)} id="estado" name="estado">
              <option value="1">Activo</option>
              <option value="0">Inactivo</option>
            </Select>
          </ErpField>
        </ErpForm>

        {companies.length === 0 ? (
          <EmptyState description="Creá la primera empresa para poder cargar clientes." title="Sin empresas" />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Empresa</TH>
                <TH>Moneda</TH>
                <TH>Plazo</TH>
                <TH>Estado</TH>
                <TH className="text-right">Acciones</TH>
              </TR>
            </THead>
            <TBody>
              {companies.map((c) => (
                <TR key={c.id}>
                  <TD className="font-medium">{c.name}</TD>
                  <TD>{c.currency}</TD>
                  <TD className="tabular-nums">{c.paymentDays} días</TD>
                  <TD>
                    <Badge variant={c.estado === 1 ? "success" : "default"}>{erpRecordLabel(c.estado)}</Badge>
                  </TD>
                  <TD>
                    <ErpRowActions
                      deleteAction={deleteErpCompany.bind(null, c.id)}
                      deleteConfirm={`¿Borrar la empresa ${c.name}?`}
                      editHref={`/backoffice/config/empresas?edit=${c.id}`}
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
