import { prisma } from "@/lib/prisma";
import { productTitle } from "@/lib/brand";
import { cn } from "@/lib/cn";
import { adminPage, adminPageBody } from "@/lib/ui-classes";
import { Badge, EmptyState, Input, PageHeader, Select, Table, TBody, TD, TH, THead, TR } from "@/components/ui";
import { ErpForm } from "@/components/erp/ErpForm";
import { ErpField } from "@/components/erp/ErpField";
import { ErpRowActions } from "@/components/erp/ErpRowActions";
import { createErpClient, deleteErpClient, updateErpClient } from "@/app/actions/erp-masters";
import { ERP_TAX_CONDITION, erpInputNumber, erpRecordLabel } from "@/lib/erp";

export const metadata = { title: productTitle("Clientes") };

export default async function ErpClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  const [clients, companies, executives] = await Promise.all([
    prisma.erpClient.findMany({
      orderBy: { name: "asc" },
      include: { company: true, executive: { select: { email: true } } },
    }),
    prisma.erpCompany.findMany({ where: { estado: 1 }, orderBy: { name: "asc" } }),
    prisma.user.findMany({
      where: { role: { in: ["admin", "agency"] } },
      orderBy: { email: "asc" },
      select: { id: true, email: true },
    }),
  ]);
  const current = clients.find((c) => c.id === edit);

  return (
    <div className={cn(adminPage, "gap-4")}>
      <PageHeader
        description="Anunciante del ERP. El ejecutivo filtra planificación; el servicio de agencia entra al costo."
        eyebrow="Administración"
        title="Clientes"
      />
      <div className={cn(adminPageBody, "flex flex-col gap-3 pb-8")}>
        <ErpForm
          action={current ? updateErpClient : createErpClient}
          cancelHref={current ? "/backoffice/clientes" : undefined}
          key={current?.id ?? "new"}
          resetOnSuccess={!current}
          submitLabel={current ? "Guardar cambios" : "Guardar"}
          title={current ? "Editar cliente" : "Nuevo cliente"}
        >
          {current ? <input name="id" type="hidden" value={current.id} /> : null}
          <ErpField htmlFor="name" label="Cliente">
            <Input defaultValue={current?.name} id="name" name="name" required />
          </ErpField>
          <ErpField htmlFor="companyId" label="Empresa">
            <Select defaultValue={current?.companyId} id="companyId" name="companyId" required>
              <option value="">Seleccioná</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </ErpField>
          <ErpField htmlFor="executiveUserId" label="Ejecutivo">
            <Select defaultValue={current?.executiveUserId ?? ""} id="executiveUserId" name="executiveUserId">
              <option value="">Sin asignar</option>
              {executives.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.email}
                </option>
              ))}
            </Select>
          </ErpField>
          <ErpField htmlFor="taxId" label="CUIT">
            <Input defaultValue={current?.taxId ?? ""} id="taxId" name="taxId" />
          </ErpField>
          <ErpField htmlFor="industry" label="Rubro">
            <Input defaultValue={current?.industry ?? ""} id="industry" name="industry" />
          </ErpField>
          <ErpField htmlFor="legalName" label="Razón social (Factura A)">
            <Input defaultValue={current?.legalName ?? ""} id="legalName" name="legalName" />
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
          <ErpField htmlFor="contact" label="Contacto">
            <Input defaultValue={current?.contact ?? ""} id="contact" name="contact" />
          </ErpField>
          <ErpField htmlFor="email" label="Email">
            <Input defaultValue={current?.email ?? ""} id="email" name="email" type="email" />
          </ErpField>
          <ErpField htmlFor="phone" label="Teléfono">
            <Input defaultValue={current?.phone ?? ""} id="phone" name="phone" />
          </ErpField>
          <ErpField htmlFor="address" label="Dirección" wide>
            <Input defaultValue={current?.address ?? ""} id="address" name="address" />
          </ErpField>
          <ErpField htmlFor="agencyFee" label="Servicio agencia">
            <Input defaultValue={erpInputNumber(current?.agencyFee)} id="agencyFee" name="agencyFee" />
          </ErpField>
          <ErpField htmlFor="costRate" label="Costo">
            <Input defaultValue={erpInputNumber(current?.costRate)} id="costRate" name="costRate" />
          </ErpField>
          <ErpField htmlFor="estado" label="Estado">
            <Select defaultValue={String(current?.estado ?? 1)} id="estado" name="estado">
              <option value="1">Activo</option>
              <option value="0">Inactivo</option>
            </Select>
          </ErpField>
        </ErpForm>

        {clients.length === 0 ? (
          <EmptyState
            description={companies.length === 0 ? "Primero cargá una empresa." : "Todavía no hay clientes."}
            title="Sin clientes"
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Cliente</TH>
                <TH>Empresa</TH>
                <TH>CUIT</TH>
                <TH>Ejecutivo</TH>
                <TH>Estado</TH>
                <TH className="text-right">Acciones</TH>
              </TR>
            </THead>
            <TBody>
              {clients.map((c) => (
                <TR key={c.id}>
                  <TD className="font-medium">{c.name}</TD>
                  <TD>{c.company.name}</TD>
                  <TD className="tabular-nums">{c.taxId ?? "—"}</TD>
                  <TD className="text-muted-foreground">{c.executive?.email ?? "—"}</TD>
                  <TD>
                    <Badge variant={c.estado === 1 ? "success" : "default"}>{erpRecordLabel(c.estado)}</Badge>
                  </TD>
                  <TD>
                    <ErpRowActions
                      deleteAction={deleteErpClient.bind(null, c.id)}
                      deleteConfirm={`¿Borrar el cliente ${c.name}?`}
                      editHref={`/backoffice/clientes?edit=${c.id}`}
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
