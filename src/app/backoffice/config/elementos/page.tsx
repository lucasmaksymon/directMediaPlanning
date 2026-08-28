import { prisma } from "@/lib/prisma";
import { productTitle } from "@/lib/brand";
import { cn } from "@/lib/cn";
import { adminPage, adminPageBody } from "@/lib/ui-classes";
import { Badge, EmptyState, Input, PageHeader, Select, Table, TBody, TD, TH, THead, TR } from "@/components/ui";
import { ErpForm } from "@/components/erp/ErpForm";
import { ErpField } from "@/components/erp/ErpField";
import { ErpRowActions } from "@/components/erp/ErpRowActions";
import { ErpCatalogSyncButton } from "@/components/erp/ErpCatalogSyncButton";
import {
  createErpElement,
  deleteErpElement,
  syncErpElementsFromCampaigns,
  updateErpElement,
} from "@/app/actions/erp-masters";
import { erpRecordLabel } from "@/lib/erp";

export const metadata = { title: productTitle("Elementos") };

export default async function ErpElementosPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  const elements = await prisma.erpElement.findMany({ orderBy: { name: "asc" } });
  const current = elements.find((e) => e.id === edit);

  return (
    <div className={cn(adminPage, "gap-4")}>
      <PageHeader
        actions={
          <ErpCatalogSyncButton
            action={syncErpElementsFromCampaigns}
            label="Sincronizar desde campañas"
          />
        }
        description="Soportes de GESTIÓN (CPM, MUPIS, Pantalla LED). Las O.P. de venta eligen de esta lista."
        eyebrow="Configuración"
        title="Elementos"
      />
      <div className={cn(adminPageBody, "flex flex-col gap-3 pb-8")}>
        <ErpForm
          action={current ? updateErpElement : createErpElement}
          cancelHref={current ? "/backoffice/config/elementos" : undefined}
          key={current?.id ?? "new"}
          resetOnSuccess={!current}
          submitLabel={current ? "Guardar cambios" : "Guardar"}
          title={current ? "Editar elemento" : "Nuevo elemento"}
        >
          {current ? <input name="id" type="hidden" value={current.id} /> : null}
          <ErpField htmlFor="name" label="Elemento">
            <Input defaultValue={current?.name} id="name" name="name" placeholder="Pantalla LED" required />
          </ErpField>
          <ErpField htmlFor="estado" label="Estado">
            <Select defaultValue={String(current?.estado ?? 1)} id="estado" name="estado">
              <option value="1">Activo</option>
              <option value="0">Inactivo</option>
            </Select>
          </ErpField>
        </ErpForm>

        {elements.length === 0 ? (
          <EmptyState
            description="Sincronizá desde las campañas o cargá el primer elemento."
            title="Sin elementos"
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Elemento</TH>
                <TH>Estado</TH>
                <TH className="text-right">Acciones</TH>
              </TR>
            </THead>
            <TBody>
              {elements.map((e) => (
                <TR key={e.id}>
                  <TD className="font-medium">{e.name}</TD>
                  <TD>
                    <Badge variant={e.estado === 1 ? "success" : "default"}>{erpRecordLabel(e.estado)}</Badge>
                  </TD>
                  <TD>
                    <ErpRowActions
                      deleteAction={deleteErpElement.bind(null, e.id)}
                      deleteConfirm={`¿Borrar ${e.name}?`}
                      editHref={`/backoffice/config/elementos?edit=${e.id}`}
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
