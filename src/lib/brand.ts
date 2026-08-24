/** Marca del producto y operador visible al cliente. */
export const PRODUCT_NAME = "NextPlanning";
export const CLIENT_BRAND = "NextMedia";
export const PRODUCT_TAGLINE = "Medios publicitarios, transparentes y en un solo lugar";

export function productTitle(page?: string): string {
  return page ? `${page} · ${PRODUCT_NAME}` : `${PRODUCT_NAME} — ${CLIENT_BRAND}`;
}

/** User-Agent para APIs externas (Nominatim, etc.). */
export const HTTP_USER_AGENT = `${PRODUCT_NAME}/1.0`;
