import Link from "next/link";
import Image from "next/image";
import { auth } from "@/auth";
import { CLIENT_BRAND, PRODUCT_NAME, PRODUCT_TAGLINE } from "@/lib/brand";
import { getLastMinuteUnits } from "@/lib/last-minute";
import { prisma } from "@/lib/prisma";
import { formatArs } from "@/lib/format";
import { btnPrimary, btnSecondary, marketingContent, pageScroll, surfaceCard } from "@/lib/ui-classes";
import { cn } from "@/lib/cn";

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
      <div className={cn(marketingContent, "pt-4 sm:pt-6")}>
        <section
          className={cn(
            surfaceCard(),
            "relative isolate px-6 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12",
          )}
        >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
        >
          <div className="absolute -right-16 top-0 h-56 w-56 rounded-full bg-led/12 blur-3xl" />
          <div className="absolute bottom-0 left-1/4 h-40 w-40 rounded-full bg-electric/10 blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between lg:gap-10">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-led">
              {CLIENT_BRAND} presenta
            </p>
            <h1 className="font-display mt-3 pb-1 text-5xl font-normal uppercase leading-none tracking-wide text-foreground sm:text-6xl lg:text-7xl">
              <span className="text-led">Next</span>Planning
            </h1>
            <p className="mt-5 max-w-xl text-lg font-medium leading-snug text-foreground sm:text-xl">
              {PRODUCT_TAGLINE}
            </p>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
              La plataforma de {CLIENT_BRAND} para comprar medios OOH con transparencia: un solo operador,
              inventario verificado y seguimiento de punta a punta.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link className={btnPrimary} href={primaryHref}>
                {primaryLabel}
              </Link>
              <Link className={btnSecondary} href={secondaryHref}>
                {secondaryLabel}
              </Link>
              {!isLoggedIn && (
                <Link
                  className="inline-flex min-h-[44px] items-center justify-center rounded-full px-4 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
                  href="/login"
                >
                  Ya tengo cuenta
                </Link>
              )}
            </div>
          </div>

          <div className="grid w-full shrink-0 grid-cols-2 gap-3 sm:grid-cols-3 lg:w-[min(100%,320px)] lg:grid-cols-2">
            <StatBadge value={String(publishedCount)} label="Espacios publicados" />
            <StatBadge value={String(lastMinute.length)} label="Last minute hoy" accent="signal" />
            <StatBadge
              value="1"
              label="Operador"
              sub={CLIENT_BRAND}
              className="col-span-2 sm:col-span-1 lg:col-span-2"
            />
          </div>
        </div>
        </section>
      </div>

      <section className={cn(marketingContent, "mt-14")}>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Cómo funciona</p>
        <h2 className="mt-2 font-display text-2xl uppercase tracking-wide text-foreground sm:text-3xl">
          De la búsqueda a la campaña
        </h2>
        <ol className="mt-8 grid gap-4 md:grid-cols-3">
          {steps.map((s) => (
            <li key={s.n} className={cn(surfaceCard(), "relative p-6")}>
              <span className="font-display text-4xl text-led/30">{s.n}</span>
              <h3 className="mt-3 text-base font-semibold text-foreground">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className={cn(marketingContent, "mt-14")}>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Para anunciantes
        </p>
        <h2 className="mt-2 font-display text-2xl uppercase tracking-wide text-foreground sm:text-3xl">
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
                  "group flex flex-col p-6 transition duration-200 hover:border-led/40",
                )}
              >
                <h3 className="text-base font-semibold text-foreground group-hover:text-led">{f.title}</h3>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">{f.description}</p>
                <span className="mt-6 text-sm font-bold uppercase tracking-wide text-led">
                  {f.cta} →
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {preview.length > 0 && (
        <section className={cn(marketingContent, "mt-14")}>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-signal">Oportunidad</p>
              <h2 className="mt-2 font-display text-2xl uppercase tracking-wide text-foreground sm:text-3xl">
                Last minute
              </h2>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
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
                    <div className="flex h-full items-center justify-center text-3xl text-muted-foreground/30">
                      📺
                    </div>
                  )}
                  <span className="absolute right-2 top-2 rounded-full bg-signal px-2 py-0.5 text-xs font-bold text-white">
                    -{u.discountPercent}%
                  </span>
                </div>
                <div className="p-4">
                  <p className="truncate font-semibold text-foreground">{u.name}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{u.locationLabel}</p>
                  <p className="mt-2 text-sm tabular-nums">
                    <span className="font-bold text-signal">{formatArs(u.discountedPrice)}</span>
                    <span className="ml-2 text-xs text-muted-foreground line-through">
                      {formatArs(u.originalPrice)}
                    </span>
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {formatLabels[u.format] ?? u.format}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className={cn(marketingContent, "mb-12 mt-14 sm:mb-16")}>
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
            <p className="mt-1 text-sm text-muted-foreground">
              {isAdmin
                ? "Gestioná inventario, reservas y clientes desde operaciones."
                : isAdvertiser
                  ? "Seguí tus solicitudes o explorá nuevas oportunidades."
                  : `Creá tu cuenta de cliente en ${PRODUCT_NAME} en menos de un minuto.`}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap justify-center gap-3">
            {isAdmin ? (
              <Link className={btnPrimary} href="/admin/operaciones">
                Panel operaciones
              </Link>
            ) : isAdvertiser ? (
              <Link className={btnPrimary} href="/advertiser/planificar">
                Planificar con IA
              </Link>
            ) : (
              <>
                <Link className={btnPrimary} href="/register">
                  Crear cuenta
                </Link>
                <Link className={btnSecondary} href="/login">
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
        "rounded-2xl border border-border/80 bg-muted/40 px-4 py-3 dark:bg-white/[0.03]",
        className,
      )}
    >
      <p
        className={cn(
          "text-2xl font-bold tabular-nums",
          accent === "signal" ? "text-signal" : "text-led",
        )}
      >
        {value}
      </p>
      {sub && <p className="text-[11px] font-semibold uppercase tracking-wide text-led">{sub}</p>}
      <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">{label}</p>
    </div>
  );
}
