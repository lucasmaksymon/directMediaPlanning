import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getProviderProfileByUserId } from "@/lib/provider";
import { surfaceCard } from "@/lib/ui-classes";
import { cn } from "@/lib/cn";

export const metadata = {
  title: "Inicio · Direct Planning",
};

export default async function InicioPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (session.user.role === "provider") {
    const profile = await getProviderProfileByUserId(session.user.id);

    if (!profile) redirect("/provider");

    const [totalUnits, publishedUnits, pendingReservations, acceptedReservations] = await Promise.all([
      prisma.inventoryUnit.count({ where: { providerId: profile.id } }),
      prisma.inventoryUnit.count({ where: { providerId: profile.id, status: "published" } }),
      prisma.reservation.count({
        where: { inventoryUnit: { providerId: profile.id }, status: "pending_provider" },
      }),
      prisma.reservation.count({
        where: { inventoryUnit: { providerId: profile.id }, status: "accepted" },
      }),
    ]);

    return (
      <div className="mx-auto max-w-[1440px] px-4 py-10 sm:px-6">
        <header className="mb-10 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-led">Panel del medio</p>
          <h1 className="font-display mt-3 text-3xl font-normal uppercase tracking-wide text-foreground sm:text-4xl">
            Bienvenido, {profile.companyName}
          </h1>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            href="/provider/inventory"
            label="Unidades publicadas"
            sublabel={`${totalUnits} en total`}
            value={publishedUnits}
            accent={publishedUnits > 0}
          />
          <StatCard
            href="/provider/reservations"
            label="Solicitudes pendientes"
            sublabel="requieren respuesta"
            value={pendingReservations}
            accent={pendingReservations > 0}
            urgent={pendingReservations > 0}
          />
          <StatCard
            href="/provider/reservations"
            label="Solicitudes aceptadas"
            sublabel="en curso"
            value={acceptedReservations}
          />
          <ActionCard
            href="/provider/inventory/new"
            label="Nueva unidad"
            description="Sumá un espacio al catálogo público."
            cta="Crear unidad"
          />
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <QuickLink href="/provider/inventory" label="Ver inventario completo" />
          <QuickLink href="/provider/reservations" label="Ver todas las solicitudes" />
        </div>
      </div>
    );
  }

  if (session.user.role === "advertiser") {
    const [totalRequests, pendingRequests, acceptedRequests] = await Promise.all([
      prisma.reservation.count({ where: { advertiserId: session.user.id } }),
      prisma.reservation.count({ where: { advertiserId: session.user.id, status: "pending_provider" } }),
      prisma.reservation.count({ where: { advertiserId: session.user.id, status: "accepted" } }),
    ]);

    return (
      <div className="mx-auto max-w-[1440px] px-4 py-10 sm:px-6">
        <header className="mb-10 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-led">Panel del anunciante</p>
          <h1 className="font-display mt-3 text-3xl font-normal uppercase tracking-wide text-foreground sm:text-4xl">
            Bienvenido
          </h1>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            href="/advertiser"
            label="Total de solicitudes"
            sublabel="enviadas"
            value={totalRequests}
          />
          <StatCard
            href="/advertiser"
            label="En revisión"
            sublabel="esperando respuesta del medio"
            value={pendingRequests}
            urgent={pendingRequests > 0}
          />
          <StatCard
            href="/advertiser"
            label="Aceptadas"
            sublabel="listas para coordinar"
            value={acceptedRequests}
            accent={acceptedRequests > 0}
          />
          <ActionCard
            href="/advertiser/planificar"
            label="Planificador IA"
            description="Describí tu campaña y la IA elige los mejores espacios."
            cta="Planificar"
            badge="IA"
          />
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <QuickLink href="/explorar" label="Explorar catálogo de espacios" />
          <QuickLink href="/advertiser" label="Ver mis solicitudes" />
        </div>
      </div>
    );
  }

  redirect("/");
}

function StatCard({
  value,
  label,
  sublabel,
  href,
  accent,
  urgent,
}: {
  value: number;
  label: string;
  sublabel?: string;
  href: string;
  accent?: boolean;
  urgent?: boolean;
}) {
  return (
    <Link
      className={cn(
        surfaceCard(),
        "flex flex-col p-6 transition duration-250 hover:border-led/40",
        urgent && "border-signal/40 bg-signal/5 dark:bg-signal/[0.04]",
      )}
      href={href}
    >
      <p
        className={cn(
          "text-4xl font-bold tabular-nums",
          accent ? "text-led" : urgent ? "text-signal" : "text-foreground",
        )}
      >
        {value}
      </p>
      <p className="mt-2 text-sm font-medium text-foreground">{label}</p>
      {sublabel && <p className="mt-0.5 text-xs text-muted-foreground">{sublabel}</p>}
    </Link>
  );
}

function ActionCard({
  href,
  label,
  description,
  cta,
  badge,
}: {
  href: string;
  label: string;
  description: string;
  cta: string;
  badge?: string;
}) {
  return (
    <Link
      className={cn(
        surfaceCard(),
        "flex flex-col justify-between p-6 transition duration-250 hover:border-led/40",
      )}
      href={href}
    >
      <div>
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-foreground">{label}</p>
          {badge && (
            <span className="rounded-full border border-led/30 bg-led/15 px-1.5 py-0.5 text-[10px] font-bold leading-none tracking-wide text-led">
              {badge}
            </span>
          )}
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <span className="mt-5 inline-flex items-center text-sm font-bold uppercase tracking-wide text-led">
        {cta} →
      </span>
    </Link>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      className="flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-4 text-sm font-medium text-foreground transition hover:border-led/40 hover:bg-muted/50"
      href={href}
    >
      {label}
      <span className="text-led">→</span>
    </Link>
  );
}
