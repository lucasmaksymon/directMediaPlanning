import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { adminPage, surfaceCard, tableScroll } from "@/lib/ui-classes";
import { cn } from "@/lib/cn";
import { AdminUserActions } from "./AdminUserActions";
import { productTitle } from "@/lib/brand";
import { EmptyState, PageHeader } from "@/components/ui/Patterns";
import { Badge } from "@/components/ui/Badge";

export const metadata = { title: productTitle("Usuarios") };

const roleLabels: Record<string, string> = {
  advertiser: "Anunciante",
  provider: "Medio",
  admin: "Admin",
};

const roleBadgeVariant: Record<string, "info" | "brand" | "warning" | "default"> = {
  advertiser: "info",
  provider: "brand",
  admin: "warning",
};

export default async function AdminUsuariosPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") redirect("/");

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      advertiserProfile: { select: { legalName: true } },
      providerProfile: { select: { companyName: true } },
      _count: { select: { reservations: true } },
    },
  });

  return (
    <div className={cn(adminPage, "gap-3")}>
      <PageHeader
        actions={<span className="text-xs text-muted-foreground">{users.length} total</span>}
        title="Usuarios"
      />

      {users.length === 0 ? (
        <EmptyState
          description="Todavía no hay usuarios registrados."
          title="Sin usuarios"
        />
      ) : (
        <div className={cn(surfaceCard(), tableScroll, "min-h-0 flex-1")}>
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Rol</th>
                <th className="hidden px-4 py-2 sm:table-cell">Empresa / nombre</th>
                <th className="hidden px-4 py-2 md:table-cell">Solicitudes</th>
                <th className="hidden px-4 py-2 lg:table-cell">Registrado</th>
                <th className="px-4 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((u) => {
                const name =
                  u.providerProfile?.companyName ?? u.advertiserProfile?.legalName ?? "—";
                return (
                  <tr key={u.id} className="transition-colors hover:bg-muted/40">
                    <td className="px-4 py-2.5 font-medium text-foreground">{u.email}</td>
                    <td className="px-4 py-2.5">
                      <Badge variant={roleBadgeVariant[u.role] ?? "default"}>
                        {roleLabels[u.role] ?? u.role}
                      </Badge>
                    </td>
                    <td className="hidden px-4 py-2.5 text-xs text-muted-foreground sm:table-cell">
                      {name}
                    </td>
                    <td className="hidden px-4 py-2.5 text-xs tabular-nums text-muted-foreground md:table-cell">
                      {u._count.reservations}
                    </td>
                    <td className="hidden px-4 py-2.5 text-xs text-muted-foreground lg:table-cell">
                      {u.createdAt.toLocaleDateString("es-AR")}
                    </td>
                    <td className="px-4 py-2.5">
                      <AdminUserActions
                        userId={u.id}
                        userEmail={u.email}
                        isSelf={u.id === session.user.id}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
