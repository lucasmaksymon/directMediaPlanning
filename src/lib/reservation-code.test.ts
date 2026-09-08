import { describe, expect, it } from "vitest";
import { generateReservationShortCode, normalizeReservationShortCode } from "./reservation-code";

describe("reservation short code", () => {
  it("genera 6 caracteres alfanuméricos", () => {
    const code = generateReservationShortCode();
    expect(code).toMatch(/^[A-Z0-9]{6}$/);
  });

  it("normaliza el comando de WhatsApp", () => {
    expect(normalizeReservationShortCode(" ab-12 ")).toBe("AB12");
  });
});
