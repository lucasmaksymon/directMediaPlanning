import { prisma } from "@/lib/prisma";
import { productTitle } from "@/lib/brand";
import { cn } from "@/lib/cn";
import { adminPage, adminPageBody } from "@/lib/ui-classes";
import { EmptyState, Input, PageHeader, Table, TBody, TD, TH, THead, TR } from "@/components/ui";
import { ErpForm } from "@/components/erp/ErpForm";
import { ErpField } from "@/components/erp/ErpField";
import { ErpRowActions } from "@/components/erp/ErpRowActions";
import { ErpCatalogSyncButton } from "@/components/erp/ErpCatalogSyncButton";
import {
  createErpCurrency,
  deleteErpCurrency,
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
      <div className={cn(adminPageBody, "flex flex-col gap-3 pb-8")}>
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
          <Table>
            <THead>
              <TR>
                <TH>Código</TH>
                <TH>Nombre</TH>
                <TH>Cotización</TH>
                <TH className="text-right">Acciones</TH>
              </TR>
            </THead>
            <TBody>
              {currencies.map((c) => (
                <TR key={c.id}>
                  <TD className="font-medium">{c.code}</TD>
                  <TD>{c.name}</TD>
                  <TD className="tabular-nums">{Number(c.rate)}</TD>
                  <TD>
                    <ErpRowActions
                      deleteAction={deleteErpCurrency.bind(null, c.id)}
                      deleteConfirm={`¿Borrar ${c.code}?`}
                      editHref={`/backoffice/config/monedas?edit=${c.id}`}
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
