import { prisma } from "@/lib/prisma";
import { productTitle } from "@/lib/brand";
import { cn } from "@/lib/cn";
import { adminPage, adminPageBody } from "@/lib/ui-classes";
import { Badge, EmptyState, Input, PageHeader, Select, Table, TBody, TD, TH, THead, TR } from "@/components/ui";
import { ErpForm } from "@/components/erp/ErpForm";
import { ErpField } from "@/components/erp/ErpField";
import { ErpRowActions } from "@/components/erp/ErpRowActions";
import { createErpVendor, deleteErpVendor, updateErpVendor } from "@/app/actions/erp-masters";
import { ERP_TAX_CONDITION, erpVendorKindLabel } from "@/lib/erp";

export const metadata = { title: productTitle("Proveedores ERP") };

export default async function ErpProveedoresPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  const [vendors, platform] = await Promise.all([
    prisma.erpVendor.findMany({
      orderBy: { name: "asc" },
      include: { nextmediaProvider: { select: { companyName: true } } },
    }),
    prisma.providerProfile.findMany({ orderBy: { companyName: "asc" }, select: { id: true, companyName: true } }),
  ]);
  const current = vendors.find((v) => v.id === edit);

  return (
    <div className={cn(adminPage, "gap-4")}>
      <PageHeader
        description="Medios (tipo 0) y productores (tipo 1). idNextmedia enlaza con el medio de la plataforma."
        eyebrow="Administración"
        title="Proveedores"
      />
      <div className={cn(adminPageBody, "flex flex-col gap-3 pb-8")}>
        <ErpForm
          action={current ? updateErpVendor : createErpVendor}
          cancelHref={current ? "/backoffice/proveedores" : undefined}
          key={current?.id ?? "new"}
          resetOnSuccess={!current}
          submitLabel={current ? "Guardar cambios" : "Guardar"}
          title={current ? "Editar proveedor" : "Nuevo proveedor"}
        >
          {current ? <input name="id" type="hidden" value={current.id} /> : null}
          <ErpField htmlFor="name" label="Nombre">
            <Input defaultValue={current?.name} id="name" name="name" required />
          </ErpField>
          <ErpField htmlFor="kind" label="Tipo">
            <Select defaultValue={String(current?.kind ?? 0)} id="kind" name="kind">
              <option value="0">Medio</option>
              <option value="1">Productor</option>
            </Select>
          </ErpField>
          <ErpField htmlFor="taxId" label="CUIT">
            <Input defaultValue={current?.taxId ?? ""} id="taxId" name="taxId" />
          </ErpField>
          <ErpField htmlFor="cbu" label="CBU">
            <Input defaultValue={current?.cbu ?? ""} id="cbu" name="cbu" />
          </ErpField>
          <ErpField htmlFor="taxCondition" label="Condición IVA">
            <Select defaultValue={String(current?.taxCondition ?? 0)} id="taxCondition" name="taxCondition">
              {ERP_TAX_CONDITION.map((label, i) => (
                <option key={label} value={i}>
                  {label}
                </option>
              ))}
            </Select>
          </ErpField>
          <ErpField htmlFor="paymentDays" label="Plazo de pago (días)">
            <Input defaultValue={String(current?.paymentDays ?? 30)} id="paymentDays" name="paymentDays" type="number" />
          </ErpField>
          <ErpField htmlFor="contact" label="Contacto">
            <Input defaultValue={current?.contact ?? ""} id="contact" name="contact" />
          </ErpField>
          <ErpField htmlFor="email" label="Email">
            <Input defaultValue={current?.email ?? ""} id="email" name="email" type="email" />
          </ErpField>
          <ErpField htmlFor="phone" label="Teléfono">
            <Input defaultValue={current?.phone ?? ""} id="phone" name="phone" />
          </ErpField>
          <ErpField htmlFor="nextmediaProviderId" label="Medio en la plataforma">
            <Select defaultValue={current?.nextmediaProviderId ?? ""} id="nextmediaProviderId" name="nextmediaProviderId">
              <option value="">Sin vínculo</option>
              {platform.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.companyName}
                </option>
              ))}
            </Select>
          </ErpField>
          <ErpField htmlFor="address" label="Dirección" wide>
            <Input defaultValue={current?.address ?? ""} id="address" name="address" />
          </ErpField>
          <ErpField htmlFor="estado" label="Estado">
            <Select defaultValue={String(current?.estado ?? 1)} id="estado" name="estado">
              <option value="1">Activo</option>
              <option value="0">Inactivo</option>
            </Select>
          </ErpField>
        </ErpForm>

        {vendors.length === 0 ? (
          <EmptyState description="Cargá medios y productores para emitir órdenes de compra." title="Sin proveedores" />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Proveedor</TH>
                <TH>Tipo</TH>
                <TH>CUIT</TH>
                <TH>Plazo</TH>
                <TH>Plataforma</TH>
                <TH className="text-right">Acciones</TH>
              </TR>
            </THead>
            <TBody>
              {vendors.map((v) => (
                <TR key={v.id}>
                  <TD className="font-medium">{v.name}</TD>
                  <TD>
                    <Badge variant={v.kind === 1 ? "warning" : "info"}>{erpVendorKindLabel(v.kind)}</Badge>
                  </TD>
                  <TD className="tabular-nums">{v.taxId ?? "—"}</TD>
                  <TD className="tabular-nums">{v.paymentDays} días</TD>
                  <TD className="text-muted-foreground">{v.nextmediaProvider?.companyName ?? "—"}</TD>
                  <TD>
                    <ErpRowActions
                      deleteAction={deleteErpVendor.bind(null, v.id)}
                      deleteConfirm={`¿Borrar el proveedor ${v.name}?`}
                      editHref={`/backoffice/proveedores?edit=${v.id}`}
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
