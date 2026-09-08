import { createHmac } from "crypto";
import { describe, expect, it } from "vitest";
import {
  mercadoPagoManifest,
  requireCronSecret,
  twilioSignaturePayload,
  verifyMercadoPagoSignature,
  verifyTwilioSignature,
} from "./webhook-verify";

describe("Mercado Pago signature", () => {
  it("acepta un HMAC válido", () => {
    const secret = "test-secret";
    const dataId = "12345";
    const requestId = "req-1";
    const ts = "1700000000";
    const v1 = createHmac("sha256", secret).update(mercadoPagoManifest(dataId, requestId, ts)).digest("hex");
    expect(
      verifyMercadoPagoSignature({
        signatureHeader: `ts=${ts},v1=${v1}`,
        requestId,
        dataId,
        secret,
      }),
    ).toBe(true);
  });

  it("rechaza firma inválida", () => {
    expect(
      verifyMercadoPagoSignature({
        signatureHeader: "ts=1,v1=deadbeef",
        requestId: "req",
        dataId: "1",
        secret: "x",
      }),
    ).toBe(false);
  });
});

describe("Twilio signature", () => {
  it("acepta HMAC-SHA1 de URL + params", () => {
    const authToken = "token";
    const url = "https://app.example/api/whatsapp/webhook";
    const body = { Body: "ACEPTAR ABC123", From: "whatsapp:+54911" };
    const signature = createHmac("sha1", authToken).update(twilioSignaturePayload(url, body)).digest("base64");
    expect(verifyTwilioSignature({ authToken, signature, url, body })).toBe(true);
  });
});

describe("cron secret", () => {
  it("exige Bearer y secret presente", () => {
    expect(requireCronSecret("Bearer abc", "abc")).toBe(true);
    expect(requireCronSecret("Bearer abc", undefined)).toBe(false);
    expect(requireCronSecret(null, "abc")).toBe(false);
  });
});
