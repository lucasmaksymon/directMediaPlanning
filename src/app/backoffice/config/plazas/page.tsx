import { prisma } from "@/lib/prisma";
import { productTitle } from "@/lib/brand";
import { cn } from "@/lib/cn";
import { adminPage, adminPageBody } from "@/lib/ui-classes";
import { Autocomplete, EmptyState, Input, PageHeader } from "@/components/ui";
import { PlazasTable } from "@/components/erp/erp-standard-tables";
import { ErpForm } from "@/components/erp/ErpForm";
import { ErpField } from "@/components/erp/ErpField";
import { ErpCatalogSyncButton } from "@/components/erp/ErpCatalogSyncButton";
import {
  createErpCity,
  createErpProvince,
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
      <div className={cn(adminPageBody, "gap-3")}>
        <div className="flex flex-wrap items-center justify-end gap-2">
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
              <Autocomplete
                defaultValue={currentCity?.provinceId}
                id="provinceId"
                name="provinceId"
                options={provinces.map((p) => ({ value: p.id, label: p.name }))}
                placeholder="Buscar plaza…"
                required
              />
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
          <PlazasTable
            rows={provinces.map((p) => ({
              id: p.id,
              name: p.name,
              cities: p.cities.map((c) => ({ id: c.id, name: c.name })),
            }))}
          />
        )}
      </div>
    </div>
  );
}
