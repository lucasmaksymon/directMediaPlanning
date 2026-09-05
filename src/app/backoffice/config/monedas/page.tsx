import { prisma } from "@/lib/prisma";
import { productTitle } from "@/lib/brand";
import { cn } from "@/lib/cn";
import { adminPage, adminPageBody } from "@/lib/ui-classes";
import { EmptyState, Input, PageHeader } from "@/components/ui";
import { MonedasTable } from "@/components/erp/erp-standard-tables";
import { ErpForm } from "@/components/erp/ErpForm";
import { ErpField } from "@/components/erp/ErpField";
import { ErpCatalogSyncButton } from "@/components/erp/ErpCatalogSyncButton";
import {
  createErpCurrency,
  syncErpCatalogFromInventory,
  updateErpCurrency,
} from "@/app/actions/erp-masters";
import { erpInputNumber } from "@/lib/erp";

export const metadata = { title: productTitle("Monedas") };

export default async function ErpMonedasPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  const currencies = await prisma.erpCurrency.findMany({ orderBy: { code: "asc" } });
  const current = currencies.find((c) => c.id === edit);

  return (
    <div className={cn(adminPage, "gap-4")}>
      <PageHeader
        actions={<ErpCatalogSyncButton action={syncErpCatalogFromInventory} />}
        description="Cotizaciones que eligen las empresas. Se cargan desde la moneda de los carteles."
        eyebrow="Configuración"
        title="Monedas"
      />
      <div className={cn(adminPageBody, "gap-3")}>
        <ErpForm
          action={current ? updateErpCurrency : createErpCurrency}
          cancelHref={current ? "/backoffice/config/monedas" : undefined}
          key={current?.id ?? "new"}
          resetOnSuccess={!current}
          submitLabel={current ? "Guardar cambios" : "Guardar"}
          title={current ? "Editar moneda" : "Nueva moneda"}
        >
          {current ? <input name="id" type="hidden" value={current.id} /> : null}
          <ErpField htmlFor="code" label="Código">
            <Input defaultValue={current?.code} id="code" name="code" placeholder="USD" required />
          </ErpField>
          <ErpField htmlFor="name" label="Nombre">
            <Input defaultValue={current?.name} id="name" name="name" placeholder="Dólar" required />
          </ErpField>
          <ErpField htmlFor="rate" label="Cotización">
            <Input defaultValue={erpInputNumber(current?.rate ?? 1)} id="rate" name="rate" />
          </ErpField>
        </ErpForm>

        {currencies.length === 0 ? (
          <EmptyState
            description="Sincronizá desde los carteles o cargá la primera moneda."
            title="Sin monedas"
          />
        ) : (
          <MonedasTable
            rows={currencies.map((c) => ({
              id: c.id,
              code: c.code,
              name: c.name,
              rate: Number(c.rate),
            }))}
          />
        )}
      </div>
    </div>
  );
}
