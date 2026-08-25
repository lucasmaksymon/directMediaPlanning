import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { CLIENT_BRAND, productTitle } from "@/lib/brand";
import { advertiserPage, pageScroll } from "@/lib/ui-classes";
import { cn } from "@/lib/cn";
import { PageHeader, Stat, StatRow } from "@/components/ui/Patterns";
import { buttonVariants } from "@/lib/ui-variants";

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

    const greeting = session.user.email
      ? `Hola, ${session.user.email.split("@")[0].replace(/\./g, " ")}`
      : "Hola";

    return (
      <div className={cn(advertiserPage, pageScroll, "gap-4")}>
        <PageHeader
          eyebrow={`${CLIENT_BRAND} · Mi cuenta`}
          title={greeting}
          description="Resumen de tus solicitudes y accesos rápidos al catálogo."
        />

        <StatRow>
          <Link href="/advertiser" className="block">
            <Stat
              className="h-full transition hover:border-led/40"
              label="Solicitudes"
              hint="enviadas"
              value={totalRequests}
            />
          </Link>
          <Link href="/advertiser" className="block">
            <Stat
              className="h-full transition hover:border-led/40"
              label="En revisión"
              hint="esperando respuesta"
              urgent={pendingRequests > 0}
              value={pendingRequests}
            />
          </Link>
          <Link href="/advertiser" className="block">
            <Stat
              accent={acceptedRequests > 0}
              className="h-full transition hover:border-led/40"
              label="Aceptadas"
              hint="listas"
              value={acceptedRequests}
            />
          </Link>
          <Link
            href="/advertiser/planificar"
            className={cn(
              buttonVariants({ variant: "outline", size: "md" }),
              "h-auto min-h-[72px] flex-col items-start justify-between gap-2 py-3",
            )}
          >
            <span className="flex items-center gap-1.5">
              Planificador IA
              <span className="rounded-[var(--radius-sm)] border border-led/30 bg-led/15 px-1.5 py-0.5 text-[9px] font-semibold leading-none tracking-wide text-led">
                IA
              </span>
            </span>
            <span className="text-sm font-medium text-led">Planificar →</span>
          </Link>
          <Link
            href="/advertiser/creativo"
            className={cn(
              buttonVariants({ variant: "outline", size: "md" }),
              "h-auto min-h-[72px] flex-col items-start justify-between gap-2 py-3",
            )}
          >
            <span className="flex items-center gap-1.5">
              Validar creativo
              <span className="rounded-[var(--radius-sm)] border border-led/30 bg-led/15 px-1.5 py-0.5 text-[9px] font-semibold leading-none tracking-wide text-led">
                IA
              </span>
            </span>
            <span className="text-sm font-medium text-led">Validar →</span>
          </Link>
        </StatRow>

        <div className="grid gap-2 sm:grid-cols-2">
          {[
            { href: "/explorar", label: "Explorar catálogo de espacios" },
            { href: "/advertiser", label: "Ver mis solicitudes" },
            { href: "/advertiser/creativo", label: "Validar creativo" },
            { href: "/explorar/last-minute", label: "Últimas oportunidades" },
          ].map((a) => (
            <Link
              key={a.href + a.label}
              href={a.href}
              className={cn(buttonVariants({ variant: "outline", size: "md" }), "justify-between")}
            >
              {a.label} <span className="text-led">→</span>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  if (session.user.role === "admin") redirect("/admin");
  redirect("/");
}
