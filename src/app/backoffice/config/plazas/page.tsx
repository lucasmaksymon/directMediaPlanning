import { prisma } from "@/lib/prisma";
import { productTitle } from "@/lib/brand";
import { cn } from "@/lib/cn";
import { adminPage, adminPageBody } from "@/lib/ui-classes";
import { EmptyState, Input, PageHeader, Select, Table, TBody, TD, TH, THead, TR } from "@/components/ui";
import { ErpForm } from "@/components/erp/ErpForm";
import { ErpField } from "@/components/erp/ErpField";
import { ErpRowActions } from "@/components/erp/ErpRowActions";
import { ErpCatalogSyncButton } from "@/components/erp/ErpCatalogSyncButton";
import {
  createErpCity,
  createErpProvince,
  deleteErpCity,
  deleteErpProvince,
  syncErpCatalogFromInventory,
  updateErpCity,
  updateErpProvince,
} from "@/app/actions/erp-masters";

export const metadata = { title: productTitle("Plazas") };

export default async function ErpPlazasPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; city?: string }>;
}) {
  const { edit, city } = await searchParams;
  const provinces = await prisma.erpProvince.findMany({
    orderBy: { name: "asc" },
    include: { cities: { orderBy: { name: "asc" } } },
  });
  const currentProvince = provinces.find((p) => p.id === edit);
  const currentCity = provinces.flatMap((p) => p.cities).find((c) => c.id === city);

  return (
    <div className={cn(adminPage, "gap-4")}>
      <PageHeader
        actions={<ErpCatalogSyncButton action={syncErpCatalogFromInventory} />}
        description="Plazas y localidades que usan las O.P. de venta. Se cargan desde las zonas de los carteles y se pueden completar a mano."
        eyebrow="Configuración"
        title="Plazas"
      />
      <div className={cn(adminPageBody, "flex flex-col gap-3 pb-8")}>
        <div className="grid gap-4 lg:grid-cols-2">
          <ErpForm
            action={currentProvince ? updateErpProvince : createErpProvince}
            cancelHref={currentProvince ? "/backoffice/config/plazas" : undefined}
            key={currentProvince?.id ?? "new-p"}
            resetOnSuccess={!currentProvince}
            submitLabel={currentProvince ? "Guardar cambios" : "Guardar"}
            title={currentProvince ? "Editar plaza" : "Nueva plaza"}
          >
            {currentProvince ? <input name="id" type="hidden" value={currentProvince.id} /> : null}
            <ErpField htmlFor="name" label="Plaza" wide>
              <Input defaultValue={currentProvince?.name} id="name" name="name" required />
            </ErpField>
          </ErpForm>
          <ErpForm
            action={currentCity ? updateErpCity : createErpCity}
            cancelHref={currentCity ? "/backoffice/config/plazas" : undefined}
            key={currentCity?.id ?? "new-c"}
            resetOnSuccess={!currentCity}
            submitLabel={currentCity ? "Guardar cambios" : "Guardar"}
            title={currentCity ? "Editar localidad" : "Nueva localidad"}
          >
            {currentCity ? <input name="id" type="hidden" value={currentCity.id} /> : null}
            <ErpField htmlFor="provinceId" label="Plaza">
              <Select defaultValue={currentCity?.provinceId} id="provinceId" name="provinceId" required>
                <option value="">Seleccioná</option>
                {provinces.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </ErpField>
            <ErpField htmlFor="cityName" label="Localidad">
              <Input defaultValue={currentCity?.name} id="cityName" name="name" required />
            </ErpField>
          </ErpForm>
        </div>

        {provinces.length === 0 ? (
          <EmptyState
            description="Sincronizá desde los carteles o cargá la primera plaza."
            title="Sin plazas"
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Plaza</TH>
                <TH>Localidades</TH>
                <TH className="text-right">Acciones</TH>
              </TR>
            </THead>
            <TBody>
              {provinces.map((p) => (
                <TR key={p.id}>
                  <TD className="font-medium">{p.name}</TD>
                  <TD>
                    {p.cities.length === 0 ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <ul className="space-y-1">
                        {p.cities.map((c) => (
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
                    )}
                  </TD>
                  <TD>
                    <ErpRowActions
                      deleteAction={deleteErpProvince.bind(null, p.id)}
                      deleteConfirm={`¿Borrar la plaza ${p.name} y sus localidades?`}
                      editHref={`/backoffice/config/plazas?edit=${p.id}`}
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
