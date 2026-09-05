import { prisma } from "@/lib/prisma";
import { productTitle } from "@/lib/brand";
import { cn } from "@/lib/cn";
import { adminPage, adminPageBody } from "@/lib/ui-classes";
import { EmptyState, Input, PageHeader, Select } from "@/components/ui";
import { EmpresasTable } from "@/components/erp/erp-standard-tables";
import { ErpForm } from "@/components/erp/ErpForm";
import { ErpField } from "@/components/erp/ErpField";
import { createErpCompany, updateErpCompany } from "@/app/actions/erp-masters";

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
      <div className={cn(adminPageBody, "gap-3")}>
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
          <EmpresasTable
            rows={companies.map((c) => ({
              id: c.id,
              name: c.name,
              currency: c.currency,
              paymentDays: c.paymentDays,
              estado: c.estado,
            }))}
          />
        )}
      </div>
    </div>
  );
}
