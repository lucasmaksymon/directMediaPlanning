import Link from "next/link";
import Image from "next/image";
import { auth } from "@/auth";
import { CLIENT_BRAND, PRODUCT_NAME, PRODUCT_TAGLINE } from "@/lib/brand";
import { getLastMinuteUnits } from "@/lib/last-minute";
import { prisma } from "@/lib/prisma";
import { formatArs } from "@/lib/format";
import {
  btnMarketing,
  btnMarketingSecondary,
  marketingContent,
  pageScroll,
  surfaceCard,
} from "@/lib/ui-classes";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/Badge";

const formatLabels: Record<string, string> = {
  digital_ooh: "Digital OOH",
  static_ooh: "OOH estático",
  digital_package: "Paquete digital",
};

const features = [
  {
    title: "Catálogo unificado",
    description:
      "Carteles, pantallas y circuitos curados por NextMedia. Sin intermediarios visibles: comparás, filtrás y elegís en un solo lugar.",
    href: "/explorar",
    cta: "Explorar espacios",
  },
  {
    title: "Planificación con IA",
    description:
      "Definí objetivo, zona y presupuesto; el asistente te propone combinaciones de medios acordes a tu campaña.",
    href: "/advertiser/planificar",
    cta: "Abrir planificador",
    auth: true,
  },
  {
    title: "Solicitudes claras",
    description:
      "Pedís fechas, seguís el estado con NextMedia y descargás tu media plan cuando la campaña está confirmada.",
    href: "/advertiser",
    cta: "Mis solicitudes",
    auth: true,
  },
] as const;

const steps = [
  { n: "01", title: "Explorá", text: "Buscá por zona, formato y presupuesto en el catálogo NextMedia." },
  { n: "02", title: "Solicitá", text: "Elegí fechas y enviá tu pedido; NextMedia revisa disponibilidad." },
  { n: "03", title: "Activá", text: "Coordinamos confirmación, creativo y puesta en marcha de la campaña." },
] as const;

export async function HomePageContent() {
  const session = await auth();
  const role = session?.user?.role;
  const isLoggedIn = Boolean(session?.user);
  const isAdvertiser = role === "advertiser";
  const isAdmin = role === "admin";

  const [lastMinute, publishedCount] = await Promise.all([
    getLastMinuteUnits(),
    prisma.inventoryUnit.count({ where: { status: "published" } }),
  ]);
  const preview = lastMinute.slice(0, 3);

  const primaryHref = isAdmin ? "/admin" : isAdvertiser ? "/advertiser" : "/explorar";
  const primaryLabel = isAdmin ? "Ir a operaciones" : isAdvertiser ? "Mi cuenta" : "Ver catálogo";
  const secondaryHref = isLoggedIn ? "/explorar" : "/register";
  const secondaryLabel = isLoggedIn ? "Explorar catálogo" : "Crear cuenta gratis";

  return (
    <main className={pageScroll}>
      <div className={cn(marketingContent, "pt-6 sm:pt-8")}>
        <section className="relative isolate pb-4 pt-2">
          <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between lg:gap-12">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-led">
                {CLIENT_BRAND} presenta
              </p>
              <h1 className="font-display mt-3 text-5xl uppercase tracking-wide text-foreground sm:text-6xl lg:text-7xl">
                <span className="text-led">Next</span>Planning
              </h1>
              <p className="mt-5 max-w-xl text-lg font-medium leading-snug text-foreground sm:text-xl">
                {PRODUCT_TAGLINE}
              </p>
              <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
                La plataforma de {CLIENT_BRAND} para comprar medios OOH con transparencia: un solo
                operador, inventario verificado y seguimiento de punta a punta.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link className={btnMarketing} href={primaryHref}>
                  {primaryLabel}
                </Link>
                <Link className={btnMarketingSecondary} href={secondaryHref}>
                  {secondaryLabel}
                </Link>
                {!isLoggedIn && (
                  <Link
                    className="inline-flex min-h-11 items-center justify-center px-4 text-sm font-medium text-muted-foreground transition hover:text-foreground"
                    href="/login"
                  >
                    Ya tengo cuenta
                  </Link>
                )}
              </div>
            </div>

            <div className="grid w-full shrink-0 grid-cols-2 gap-3 sm:grid-cols-3 lg:w-[min(100%,300px)] lg:grid-cols-1">
              <StatBadge value={String(publishedCount)} label="Espacios publicados" />
              <StatBadge value={String(lastMinute.length)} label="Last minute hoy" accent="signal" />
              <StatBadge
                value="1"
                label="Operador"
                sub={CLIENT_BRAND}
                className="col-span-2 sm:col-span-1"
              />
            </div>
          </div>
        </section>
      </div>

      <section className={cn(marketingContent, "mt-16")}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Cómo funciona
        </p>
        <h2 className="mt-2 font-display text-3xl uppercase tracking-wide text-foreground sm:text-4xl">
          De la búsqueda a la campaña
        </h2>
        <ol className="mt-8 grid gap-6 md:grid-cols-3">
          {steps.map((s) => (
            <li key={s.n} className="border-t border-border pt-5">
              <span className="font-display text-3xl text-led/40">{s.n}</span>
              <h3 className="nm-card-title mt-3">{s.title}</h3>
              <p className="nm-secondary mt-2">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className={cn(marketingContent, "mt-16")}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Para anunciantes
        </p>
        <h2 className="mt-2 font-display text-3xl uppercase tracking-wide text-foreground sm:text-4xl">
          Todo en {PRODUCT_NAME}
        </h2>
        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {features.map((f) => {
            const needsAuth = "auth" in f && f.auth;
            const href = needsAuth && !isLoggedIn ? "/register" : f.href;
            return (
              <Link
                key={f.title}
                href={href}
                className={cn(
                  surfaceCard(),
                  "group flex flex-col p-6 transition hover:border-primary/40",
                )}
              >
                <h3 className="nm-card-title group-hover:text-led">{f.title}</h3>
                <p className="nm-secondary mt-3 flex-1">{f.description}</p>
                <span className="mt-6 text-sm font-semibold text-led">
                  {f.cta} →
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {preview.length > 0 && (
        <section className={cn(marketingContent, "mt-16")}>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-signal">
                Oportunidad
              </p>
              <h2 className="mt-2 font-display text-3xl uppercase tracking-wide text-foreground sm:text-4xl">
                Last minute
              </h2>
              <p className="nm-secondary mt-2 max-w-xl">
                Espacios con descuento por disponibilidad inmediata. Ideal para activaciones urgentes.
              </p>
            </div>
            <Link className="text-sm font-semibold text-led hover:underline" href="/explorar/last-minute">
              Ver todos →
            </Link>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {preview.map((u) => (
              <Link
                key={u.id}
                href={`/explorar/${u.id}`}
                className={cn(surfaceCard(), "overflow-hidden transition hover:border-signal/40")}
              >
                <div className="relative h-36 w-full bg-muted">
                  {u.imageUrl ? (
                    <Image src={u.imageUrl} alt={u.name} fill className="object-cover" unoptimized />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground/40">
                      —
                    </div>
                  )}
                  <Badge className="absolute right-2 top-2 bg-signal text-white" variant="warning">
                    -{u.discountPercent}%
                  </Badge>
                </div>
                <div className="p-4">
                  <p className="truncate font-semibold text-foreground">{u.name}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{u.locationLabel}</p>
                  <p className="mt-2 text-sm tabular-nums">
                    <span className="font-semibold text-signal">{formatArs(u.discountedPrice)}</span>
                    <span className="ml-2 text-xs text-muted-foreground line-through">
                      {formatArs(u.originalPrice)}
                    </span>
                  </p>
                  <p className="nm-caption mt-1">{formatLabels[u.format] ?? u.format}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className={cn(marketingContent, "mb-14 mt-16 sm:mb-20")}>
        <div
          className={cn(
            surfaceCard(),
            "flex flex-col items-center gap-4 px-6 py-10 text-center sm:flex-row sm:justify-between sm:text-left",
          )}
        >
          <div>
            <p className="text-sm font-semibold text-foreground">
              {isLoggedIn
                ? `Sesión activa${session?.user?.email ? ` · ${session.user.email}` : ""}`
                : "¿Listo para planificar tu próxima campaña?"}
            </p>
            <p className="nm-secondary mt-1">
              {isAdmin
                ? "Gestioná inventario, reservas y clientes desde operaciones."
                : isAdvertiser
                  ? "Seguí tus solicitudes o explorá nuevas oportunidades."
                  : `Creá tu cuenta de cliente en ${PRODUCT_NAME} en menos de un minuto.`}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap justify-center gap-3">
            {isAdmin ? (
              <Link className={btnMarketing} href="/admin/operaciones">
                Panel operaciones
              </Link>
            ) : isAdvertiser ? (
              <Link className={btnMarketing} href="/advertiser/planificar">
                Planificar con IA
              </Link>
            ) : (
              <>
                <Link className={btnMarketing} href="/register">
                  Crear cuenta
                </Link>
                <Link className={btnMarketingSecondary} href="/login">
                  Iniciar sesión
                </Link>
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function StatBadge({
  value,
  label,
  sub,
  accent,
  className,
}: {
  value: string;
  label: string;
  sub?: string;
  accent?: "signal" | "led";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border border-border bg-card px-4 py-3",
        className,
      )}
    >
      <p
        className={cn(
          "text-2xl font-semibold tabular-nums tracking-tight",
          accent === "signal" ? "text-signal" : "text-led",
        )}
      >
        {value}
      </p>
      {sub && <p className="text-[11px] font-semibold uppercase tracking-wide text-led">{sub}</p>}
      <p className="nm-caption mt-0.5">{label}</p>
    </div>
  );
}
