import { createHmac, timingSafeEqual } from "crypto";

export function parseMercadoPagoSignature(header: string | null): { ts: string; v1: string } | null {
  if (!header) return null;
  const parts = Object.fromEntries(
    header.split(",").map((p) => {
      const [k, ...rest] = p.trim().split("=");
      return [k, rest.join("=")];
    }),
  );
  if (!parts.ts || !parts.v1) return null;
  return { ts: parts.ts, v1: parts.v1 };
}

export function mercadoPagoManifest(dataId: string, requestId: string, ts: string): string {
  return `id:${dataId};request-id:${requestId};ts:${ts};`;
}

export function verifyMercadoPagoSignature(params: {
  signatureHeader: string | null;
  requestId: string | null;
  dataId: string;
  secret: string;
}): boolean {
  const parsed = parseMercadoPagoSignature(params.signatureHeader);
  if (!parsed || !params.requestId || !params.dataId || !params.secret) return false;
  const manifest = mercadoPagoManifest(params.dataId, params.requestId, parsed.ts);
  const expected = createHmac("sha256", params.secret).update(manifest).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(parsed.v1, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Twilio: HMAC-SHA1 de URL + params ordenados, Base64. */
export function twilioSignaturePayload(url: string, params: Record<string, string>): string {
  const keys = Object.keys(params).sort();
  return url + keys.map((k) => `${k}${params[k]}`).join("");
}

export function verifyTwilioSignature(params: {
  authToken: string;
  signature: string | null;
  url: string;
  body: Record<string, string>;
}): boolean {
  if (!params.signature || !params.authToken) return false;
  const data = twilioSignaturePayload(params.url, params.body);
  const expected = createHmac("sha1", params.authToken).update(data).digest("base64");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(params.signature, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function requireCronSecret(authHeader: string | null, secret: string | undefined): boolean {
  if (!secret) return false;
  return authHeader === `Bearer ${secret}`;
}
