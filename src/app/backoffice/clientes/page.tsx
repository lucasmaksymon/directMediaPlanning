import { prisma } from "@/lib/prisma";
import { productTitle } from "@/lib/brand";
import { cn } from "@/lib/cn";
import { adminPage, adminPageBody } from "@/lib/ui-classes";
import { Autocomplete, EmptyState, Input, PageHeader, Select } from "@/components/ui";
import { ClientesTable } from "@/components/erp/erp-standard-tables";
import { ErpForm } from "@/components/erp/ErpForm";
import { ErpField } from "@/components/erp/ErpField";
import { createErpClient, updateErpClient } from "@/app/actions/erp-masters";
import { ERP_TAX_CONDITION, erpInputNumber } from "@/lib/erp";

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
      <div className={cn(adminPageBody, "gap-3")}>
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
            <Autocomplete
              defaultValue={current?.companyId}
              id="companyId"
              name="companyId"
              options={companies.map((c) => ({ value: c.id, label: c.name }))}
              placeholder="Buscar empresa…"
              required
            />
          </ErpField>
          <ErpField htmlFor="executiveUserId" label="Ejecutivo">
            <Autocomplete
              defaultValue={current?.executiveUserId ?? ""}
              emptyLabel="Sin asignar"
              id="executiveUserId"
              name="executiveUserId"
              options={executives.map((u) => ({ value: u.id, label: u.email }))}
              placeholder="Buscar ejecutivo…"
            />
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
          <ClientesTable
            rows={clients.map((c) => ({
              id: c.id,
              name: c.name,
              company: c.company.name,
              taxId: c.taxId,
              executive: c.executive?.email ?? null,
              estado: c.estado,
            }))}
          />
        )}
      </div>
    </div>
  );
}
