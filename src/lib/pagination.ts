/** Paginación server-side vía querystring (`page`, `limit`). */

export const DEFAULT_PAGE_SIZE = 40;
export const ADMIN_PAGE_SIZE = 50;

export function parsePage(raw: string | string[] | undefined): number {
  const s = Array.isArray(raw) ? raw[0] : raw;
  const n = Number(s ?? "1");
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.floor(n);
}

export function parseLimit(
  raw: string | string[] | undefined,
  fallback = DEFAULT_PAGE_SIZE,
  max = 100,
): number {
  const s = Array.isArray(raw) ? raw[0] : raw;
  const n = Number(s ?? String(fallback));
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(max, Math.floor(n));
}

export function pageToSkip(page: number, limit: number) {
  return (page - 1) * limit;
}

export function totalPages(total: number, limit: number) {
  return Math.max(1, Math.ceil(total / limit));
}

/** Conserva filtros al cambiar de página. */
export function withPageParam(
  basePath: string,
  current: Record<string, string | undefined>,
  page: number,
) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(current)) {
    if (!v || k === "page") continue;
    params.set(k, v);
  }
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function firstSearchParam(
  sp: Record<string, string | string[] | undefined>,
  key: string,
): string {
  const v = sp[key];
  if (v === undefined) return "";
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
}
