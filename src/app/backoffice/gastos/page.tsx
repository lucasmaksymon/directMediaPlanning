import { prisma } from "@/lib/prisma";
import { productTitle } from "@/lib/brand";
import { cn } from "@/lib/cn";
import { adminPage, adminPageBody } from "@/lib/ui-classes";
import { EmptyState, Input, PageHeader, Select } from "@/components/ui";
import { GastosTable } from "@/components/erp/erp-standard-tables";
import { ErpForm } from "@/components/erp/ErpForm";
import { ErpField } from "@/components/erp/ErpField";
import { upsertErpExpense } from "@/app/actions/erp-masters";
import { ERP_MONTHS, erpInputNumber } from "@/lib/erp";

export const metadata = { title: productTitle("Gastos") };

export default async function ErpGastosPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  const now = new Date();
  const expenses = await prisma.erpExpense.findMany({ orderBy: [{ year: "desc" }, { month: "desc" }] });
  const current = expenses.find((e) => e.id === edit);

  return (
    <div className={cn(adminPage, "gap-4")}>
      <PageHeader
        description="Fijos, banco, IVA y comisiones del mes. Entran restando en el informe mensual."
        eyebrow="Administración"
        title="Gastos"
      />
      <div className={cn(adminPageBody, "flex flex-col gap-3 pb-8")}>
        <ErpForm
          action={upsertErpExpense}
          cancelHref={current ? "/backoffice/gastos" : undefined}
          key={current?.id ?? "new"}
          resetOnSuccess={!current}
          submitLabel="Guardar mes"
          title={current ? "Editar mes" : "Cargar / actualizar mes"}
        >
          <ErpField htmlFor="month" label="Mes">
            <Select defaultValue={String(current?.month ?? now.getMonth() + 1)} id="month" name="month">
              {ERP_MONTHS.slice(1).map((label, i) => (
                <option key={label} value={i + 1}>
                  {label}
                </option>
              ))}
            </Select>
          </ErpField>
          <ErpField htmlFor="year" label="Año">
            <Input defaultValue={current?.year ?? now.getFullYear()} id="year" name="year" type="number" />
          </ErpField>
          <ErpField htmlFor="fixed" label="Fijo">
            <Input defaultValue={erpInputNumber(current?.fixed)} id="fixed" name="fixed" />
          </ErpField>
          <ErpField htmlFor="bank" label="Banco">
            <Input defaultValue={erpInputNumber(current?.bank)} id="bank" name="bank" />
          </ErpField>
          <ErpField htmlFor="vat" label="IVA">
            <Input defaultValue={erpInputNumber(current?.vat)} id="vat" name="vat" />
          </ErpField>
          <ErpField htmlFor="commissions" label="Comisiones">
            <Input defaultValue={erpInputNumber(current?.commissions)} id="commissions" name="commissions" />
          </ErpField>
        </ErpForm>

        {expenses.length === 0 ? (
          <EmptyState description="No hay gastos cargados." title="Sin gastos" />
        ) : (
          <GastosTable
            rows={expenses.map((e) => ({
              id: e.id,
              month: e.month,
              year: e.year,
              fixed: Number(e.fixed),
              bank: Number(e.bank),
              vat: Number(e.vat),
              commissions: Number(e.commissions),
            }))}
          />
        )}
      </div>
    </div>
  );
}
