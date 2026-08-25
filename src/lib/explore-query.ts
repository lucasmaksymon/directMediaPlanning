import { Prisma, ReservationStatus, type InventoryFormat } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeText } from "@/lib/normalize-text";
import { DEFAULT_PAGE_SIZE, pageToSkip, parseLimit, parsePage } from "@/lib/pagination";

export type ExploreUnitDTO = {
  id: string;
  name: string;
  locationLabel: string;
  basePriceAmount: string;
  providerName: string;
  lat: number | null;
  lng: number | null;
};

export type ExploreMapMarker = {
  id: string;
  name: string;
  lat: number;
  lng: number;
};

export type ExploreFilters = {
  q: string;
  proveedor: string;
  formato: string;
  desde: string;
  hasta: string;
  vista: "lista" | "mapa" | "ambos";
  precioMax: string;
};

const FORMATS: InventoryFormat[] = ["digital_ooh", "static_ooh", "digital_package"];

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

export function buildExploreWhere(flat: Record<string, string>): {
  where: Prisma.InventoryUnitWhereInput;
  filters: ExploreFilters;
} {
  const q = (flat.q ?? "").trim();
  const proveedor = (flat.proveedor ?? "").trim();
  const formato = (flat.formato ?? "").trim();
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
    ...(q ? { OR: buildTextSearch(q) } : {}),
    ...(proveedor
      ? { provider: { companyName: { equals: proveedor, mode: "insensitive" } } }
      : {}),
    ...(FORMATS.includes(formato as InventoryFormat)
      ? { format: formato as InventoryFormat }
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

  return {
    where,
    filters: {
      q,
      proveedor,
      formato: FORMATS.includes(formato as InventoryFormat) ? formato : "",
      desde,
      hasta,
      vista,
      precioMax: Number.isFinite(precioMaxNum) && precioMaxNum > 0 ? String(precioMaxNum) : "",
    },
  };
}

function toDto(u: {
  id: string;
  name: string;
  locationLabel: string;
  basePriceAmount: { toString(): string };
  latitude: number | null;
  longitude: number | null;
  provider: { companyName: string };
}): ExploreUnitDTO {
  return {
    id: u.id,
    name: u.name,
    locationLabel: u.locationLabel,
    basePriceAmount: u.basePriceAmount.toString(),
    providerName: u.provider.companyName,
    lat: u.latitude,
    lng: u.longitude,
  };
}

export async function fetchExplorePage(
  flat: Record<string, string>,
  opts?: { page?: number; limit?: number },
): Promise<{
  units: ExploreUnitDTO[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  filters: ExploreFilters;
}> {
  const { where, filters } = buildExploreWhere(flat);
  const page = opts?.page ?? parsePage(flat.page);
  const limit = opts?.limit ?? parseLimit(flat.limit, DEFAULT_PAGE_SIZE);

  const [total, rows] = await Promise.all([
    prisma.inventoryUnit.count({ where }),
    prisma.inventoryUnit.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: pageToSkip(page, limit),
      take: limit,
      select: {
        id: true,
        name: true,
        locationLabel: true,
        basePriceAmount: true,
        latitude: true,
        longitude: true,
        provider: { select: { companyName: true } },
      },
    }),
  ]);

  return {
    units: rows.map(toDto),
    total,
    page,
    limit,
    hasMore: pageToSkip(page, limit) + rows.length < total,
    filters,
  };
}

/** Markers livianos para el mapa (sin precios ni joins pesados). */
export async function fetchExploreMarkers(
  flat: Record<string, string>,
  max = 800,
): Promise<ExploreMapMarker[]> {
  const { where } = buildExploreWhere(flat);
  const rows = await prisma.inventoryUnit.findMany({
    where: {
      ...where,
      latitude: { not: null },
      longitude: { not: null },
    },
    select: { id: true, name: true, latitude: true, longitude: true },
    take: max,
  });
  return rows
    .filter((r) => r.latitude != null && r.longitude != null)
    .map((r) => ({ id: r.id, name: r.name, lat: r.latitude!, lng: r.longitude! }));
}

export async function fetchExploreData(flat: Record<string, string>): Promise<{
  units: ExploreUnitDTO[];
  markers: ExploreMapMarker[];
  total: number;
  hasMore: boolean;
  filters: ExploreFilters;
  providerNames: string[];
}> {
  const [pageData, markers, providersWithPublished] = await Promise.all([
    fetchExplorePage(flat, { page: 1 }),
    flat.vista === "lista" ? Promise.resolve([] as ExploreMapMarker[]) : fetchExploreMarkers(flat),
    prisma.providerProfile.findMany({
      where: { inventoryUnits: { some: { status: "published" } } },
      select: { companyName: true },
      orderBy: { companyName: "asc" },
    }),
  ]);

  return {
    units: pageData.units,
    markers,
    total: pageData.total,
    hasMore: pageData.hasMore,
    filters: pageData.filters,
    providerNames: providersWithPublished.map((p) => p.companyName),
  };
}

export function buildExploreHref(parts: {
  q?: string;
  proveedor?: string;
  formato?: string;
  desde?: string;
  hasta?: string;
  vista?: string;
  precio_max?: string;
}) {
  const params = new URLSearchParams();
  if (parts.q) params.set("q", parts.q);
  if (parts.proveedor) params.set("proveedor", parts.proveedor);
  if (parts.formato) params.set("formato", parts.formato);
  if (parts.desde) params.set("desde", parts.desde);
  if (parts.hasta) params.set("hasta", parts.hasta);
  if (parts.vista) params.set("vista", parts.vista);
  if (parts.precio_max) params.set("precio_max", parts.precio_max);
  const s = params.toString();
  return s ? `/explorar?${s}` : "/explorar";
}
