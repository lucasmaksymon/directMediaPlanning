import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { CLIENT_BRAND, productTitle } from "@/lib/brand";
import { advertiserPage, pageScroll, surfaceCard } from "@/lib/ui-classes";
import { cn } from "@/lib/cn";

export const metadata = {
  title: productTitle("Inicio"),
};

export default async function InicioPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (session.user.role === "provider") redirect("/provider");
  if (session.user.role === "agency") redirect("/agency");

  if (session.user.role === "advertiser") {
    const [totalRequests, pendingRequests, acceptedRequests] = await Promise.all([
      prisma.reservation.count({ where: { advertiserId: session.user.id } }),
      prisma.reservation.count({ where: { advertiserId: session.user.id, status: "pending_provider" } }),
      prisma.reservation.count({ where: { advertiserId: session.user.id, status: "accepted" } }),
    ]);

    return (
      <div className={cn(advertiserPage, pageScroll, "gap-4")}>
        <header>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-led">
            {CLIENT_BRAND} · Mi cuenta
          </p>
          <h1 className="font-display text-2xl font-normal uppercase tracking-wide text-foreground sm:text-3xl">
            Hola
            {session.user.email
              ? `, ${session.user.email.split("@")[0].replace(/\./g, " ")}`
              : ""}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Resumen de tus solicitudes y accesos rápidos al catálogo.
          </p>
        </header>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          <StatCard href="/advertiser" label="Solicitudes" sublabel="enviadas" value={totalRequests} />
          <StatCard href="/advertiser" label="En revisión" sublabel="esperando respuesta" value={pendingRequests} urgent={pendingRequests > 0} />
          <StatCard href="/advertiser" label="Aceptadas" sublabel="listas" value={acceptedRequests} accent={acceptedRequests > 0} />
          <ActionCard href="/advertiser/planificar" label="Planificador IA" cta="Planificar →" badge="IA" />
          <ActionCard href="/advertiser/creativo" label="Validar creativo" cta="Validar →" badge="IA" />
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <QuickLink href="/explorar" label="Explorar catálogo de espacios" />
          <QuickLink href="/advertiser" label="Ver mis solicitudes" />
          <QuickLink href="/advertiser/creativo" label="Validar creativo" />
          <QuickLink href="/explorar/last-minute" label="Últimas oportunidades" />
        </div>
      </div>
    );
  }

  if (session.user.role === "admin") redirect("/admin");
  redirect("/");
}

function StatCard({
  value,
  label,
  sublabel,
  sub,
  href,
  accent,
  urgent,
}: {
  value: number;
  label: string;
  sublabel?: string;
  sub?: number;
  href: string;
  accent?: boolean;
  urgent?: boolean;
}) {
  return (
    <Link
      className={cn(
        surfaceCard(),
        "flex flex-col p-4 transition duration-200 hover:border-led/40",
        urgent && "border-signal/40 bg-signal/5 dark:bg-signal/[0.04]",
      )}
      href={href}
    >
      <p
        className={cn(
          "text-3xl font-bold tabular-nums",
          accent ? "text-led" : urgent ? "text-signal" : "text-foreground",
        )}
      >
        {value}
        {sub != null && (
          <span className="ml-1 text-base font-normal text-muted-foreground">/ {sub}</span>
        )}
      </p>
      <p className="mt-1 text-xs font-medium text-foreground">{label}</p>
      {sublabel && <p className="text-[11px] text-muted-foreground">{sublabel}</p>}
    </Link>
  );
}

function ActionCard({
  href,
  label,
  cta,
  badge,
}: {
  href: string;
  label: string;
  cta: string;
  badge?: string;
}) {
  return (
    <Link
      className={cn(
        surfaceCard(),
        "flex flex-col justify-between p-4 transition duration-200 hover:border-led/40",
      )}
      href={href}
    >
      <div className="flex items-center gap-1.5">
        <p className="text-xs font-semibold text-foreground">{label}</p>
        {badge && (
          <span className="rounded-full border border-led/30 bg-led/15 px-1.5 py-0.5 text-[9px] font-bold leading-none tracking-wide text-led">
            {badge}
          </span>
        )}
      </div>
      <span className="mt-4 inline-flex items-center text-sm font-bold uppercase tracking-wide text-led">
        {cta}
      </span>
    </Link>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-medium text-foreground transition hover:border-led/40 hover:bg-muted/50"
      href={href}
    >
      {label}
      <span className="text-led">→</span>
    </Link>
  );
}
