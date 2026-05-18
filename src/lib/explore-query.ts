import { Prisma, ReservationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeText } from "@/lib/normalize-text";

export type ExploreUnitDTO = {
  id: string;
  name: string;
  locationLabel: string;
  basePriceAmount: string;
  providerName: string;
  providerId: string;
  lat: number | null;
  lng: number | null;
};

export type ExploreProviderOption = {
  id: string;
  companyName: string;
};

export type ExploreFilters = {
  q: string;
  providerId: string;
  desde: string;
  hasta: string;
  vista: "lista" | "mapa" | "ambos";
  precioMax: string;
};

/**
 * Genera condiciones OR para búsqueda de texto insensible a acentos.
 * Busca con el valor original Y con la versión sin acentos (para cubrir
 * "Cordoba" → "Córdoba" y viceversa).
 */
function buildTextSearch(q: string): Prisma.InventoryUnitWhereInput[] {
  const variants = Array.from(new Set([q, normalizeText(q)])).filter(Boolean);
  return variants.flatMap((v) => [
    { name: { contains: v, mode: "insensitive" as const } },
    { locationLabel: { contains: v, mode: "insensitive" as const } },
    { provider: { companyName: { contains: v, mode: "insensitive" as const } } },
  ]);
}

const BLOCKING: ReservationStatus[] = [
  ReservationStatus.pending_provider,
  ReservationStatus.accepted,
  ReservationStatus.payment_pending,
  ReservationStatus.confirmed,
];

function parseDateStartUTC(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return new Date(`${s}T00:00:00.000Z`);
}

function parseDateEndUTC(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return new Date(`${s}T23:59:59.999Z`);
}

export function flattenSearchParams(
  sp: Record<string, string | string[] | undefined>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(sp)) {
    if (v === undefined) continue;
    out[k] = Array.isArray(v) ? v[0] ?? "" : v;
  }
  return out;
}

export async function fetchExploreData(flat: Record<string, string>): Promise<{
  units: ExploreUnitDTO[];
  providers: ExploreProviderOption[];
  filters: ExploreFilters;
}> {
  const q = (flat.q ?? "").trim();
  const providerId = (flat.proveedor ?? "").trim();
  const desde = (flat.desde ?? "").trim();
  const hasta = (flat.hasta ?? "").trim();
  const vistaRaw = (flat.vista ?? "ambos").trim();
  const vista: ExploreFilters["vista"] =
    vistaRaw === "lista" || vistaRaw === "mapa" || vistaRaw === "ambos" ? vistaRaw : "ambos";
  const precioMaxRaw = (flat.precio_max ?? "").trim().replace(",", ".");
  const precioMaxNum = precioMaxRaw ? Number(precioMaxRaw) : NaN;

  const dateFrom = parseDateStartUTC(desde);
  const dateTo = parseDateEndUTC(hasta);
  const useDateFilter =
    dateFrom &&
    dateTo &&
    !Number.isNaN(dateFrom.getTime()) &&
    !Number.isNaN(dateTo.getTime()) &&
    dateFrom <= dateTo;

  const where: Prisma.InventoryUnitWhereInput = {
    status: "published",
    ...(providerId ? { providerId } : {}),
    ...(q
      ? {
          OR: buildTextSearch(q),
        }
      : {}),
    ...(Number.isFinite(precioMaxNum) && precioMaxNum > 0
      ? { basePriceAmount: { lte: precioMaxNum } }
      : {}),
    ...(useDateFilter
      ? {
          NOT: {
            reservations: {
              some: {
                status: { in: BLOCKING },
                startsAt: { lt: dateTo! },
                endsAt: { gt: dateFrom! },
              },
            },
          },
        }
      : {}),
  };

  const [units, providers] = await Promise.all([
    prisma.inventoryUnit.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: { provider: { select: { id: true, companyName: true } } },
    }),
    prisma.providerProfile.findMany({
      where: { inventoryUnits: { some: { status: "published" } } },
      select: { id: true, companyName: true },
      orderBy: { companyName: "asc" },
    }),
  ]);

  const dtos: ExploreUnitDTO[] = units.map((u) => ({
    id: u.id,
    name: u.name,
    locationLabel: u.locationLabel,
    basePriceAmount: u.basePriceAmount.toString(),
    providerName: u.provider.companyName,
    providerId: u.providerId,
    lat: u.latitude,
    lng: u.longitude,
  }));

  return {
    units: dtos,
    providers,
    filters: {
      q,
      providerId,
      desde,
      hasta,
      vista,
      precioMax: Number.isFinite(precioMaxNum) && precioMaxNum > 0 ? String(precioMaxNum) : "",
    },
  };
}

/** Arma la URL del catálogo con los mismos nombres de query que el formulario (`proveedor`, `desde`, …). */
export function buildExploreHref(parts: {
  q?: string;
  proveedor?: string;
  desde?: string;
  hasta?: string;
  vista?: string;
  precio_max?: string;
}) {
  const params = new URLSearchParams();
  if (parts.q) params.set("q", parts.q);
  if (parts.proveedor) params.set("proveedor", parts.proveedor);
  if (parts.desde) params.set("desde", parts.desde);
  if (parts.hasta) params.set("hasta", parts.hasta);
  if (parts.vista) params.set("vista", parts.vista);
  if (parts.precio_max) params.set("precio_max", parts.precio_max);
  const s = params.toString();
  return s ? `/explorar?${s}` : "/explorar";
}
