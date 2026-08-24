import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { adminPage, surfaceCard } from "@/lib/ui-classes";
import { cn } from "@/lib/cn";
import { AdminUserActions } from "./AdminUserActions";

import { productTitle } from "@/lib/brand";

export const metadata = { title: productTitle("Usuarios") };

const roleLabels: Record<string, string> = {
  advertiser: "Anunciante",
  provider: "Medio",
  admin: "Admin",
};

const roleBadge: Record<string, string> = {
  advertiser: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  provider: "bg-led/15 text-led",
  admin: "bg-signal/15 text-signal",
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
      <header className="flex items-center justify-between">
        <h1 className="font-display text-xl font-normal uppercase tracking-wide text-foreground sm:text-2xl">
          Usuarios
        </h1>
        <span className="text-xs text-muted-foreground">{users.length} total</span>
      </header>

      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto rounded-xl border border-border bg-card shadow-sm [scrollbar-gutter:stable]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Rol</th>
              <th className="px-4 py-2 hidden sm:table-cell">Empresa / nombre</th>
              <th className="px-4 py-2 hidden md:table-cell">Solicitudes</th>
              <th className="px-4 py-2 hidden lg:table-cell">Registrado</th>
              <th className="px-4 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((u) => {
              const name = u.providerProfile?.companyName ?? u.advertiserProfile?.legalName ?? "—";
              return (
                <tr key={u.id} className="hover:bg-muted/30 transition">
                  <td className="px-4 py-2.5 font-medium text-foreground">{u.email}</td>
                  <td className="px-4 py-2.5">
                    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", roleBadge[u.role] ?? "bg-muted text-muted-foreground")}>
                      {roleLabels[u.role] ?? u.role}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground hidden sm:table-cell">{name}</td>
                  <td className="px-4 py-2.5 text-xs tabular-nums text-muted-foreground hidden md:table-cell">{u._count.reservations}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground hidden lg:table-cell">
                    {u.createdAt.toLocaleDateString("es-AR")}
                  </td>
                  <td className="px-4 py-2.5">
                    <AdminUserActions userId={u.id} userEmail={u.email} isSelf={u.id === session.user.id} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
