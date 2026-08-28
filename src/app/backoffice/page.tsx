import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { productTitle } from "@/lib/brand";
import { cn } from "@/lib/cn";
import { adminPage, adminPageBody, surfaceCard } from "@/lib/ui-classes";
import { PageHeader, Stat, StatRow } from "@/components/ui/Patterns";
import { ERP_HUB_MODULES } from "@/lib/erp-modules";
import { ERP_ORDER } from "@/lib/erp";

export const metadata = { title: productTitle("Administración") };

export default async function BackofficeHomePage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") redirect("/");

  const [clients, saleOrders, openOrders, invoices, expenses] = await Promise.all([
    prisma.erpClient.count(),
    prisma.erpSaleOrder.count(),
    prisma.erpSaleOrder.count({ where: { estado: ERP_ORDER.issued } }),
    prisma.erpSaleInvoice.count(),
    prisma.erpExpense.count(),
  ]);

  return (
    <div className={cn(adminPage, "gap-5")}>
      <PageHeader
        description="Back-office de la agencia: mismas reglas que ADMINISTRACION, con la interfaz de NextPlanning."
        eyebrow="Administración"
        title="Administración"
      />

      <StatRow>
        <Stat label="Clientes" value={clients} />
        <Stat label="O.P. venta" value={saleOrders} />
        <Stat accent label="Sin facturar" urgent={openOrders > 0} value={openOrders} />
        <Stat label="Facturas venta" value={invoices} />
        <Stat label="Meses con gastos" value={expenses} />
      </StatRow>

      <div className={cn(adminPageBody, "flex flex-col gap-8 pb-10")}>
        {ERP_HUB_MODULES.map((mod) => (
          <section className="space-y-3" key={mod.title}>
            <div>
              <h2 className="nm-section-title">{mod.title}</h2>
              <p className="nm-caption mt-1">{mod.description}</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {mod.items.map((item) => (
                <Link
                  className={cn(surfaceCard(), "flex flex-col p-4 transition hover:border-led/40")}
                  href={item.href}
                  key={item.href}
                >
                  <p className="text-sm font-semibold text-foreground">{item.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.desc}</p>
                  <span className="mt-3 text-xs font-semibold text-led">Abrir →</span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
