import { describe, expect, it } from "vitest";
import { holdExpiresAt, isHoldActive, rangesOverlap } from "./availability";

describe("rangesOverlap", () => {
  it("detecta solape parcial", () => {
    expect(
      rangesOverlap(new Date("2026-01-01"), new Date("2026-01-10"), new Date("2026-01-08"), new Date("2026-01-20")),
    ).toBe(true);
  });

  it("no solapa rangos contiguos", () => {
    expect(
      rangesOverlap(new Date("2026-01-01"), new Date("2026-01-10"), new Date("2026-01-10"), new Date("2026-01-20")),
    ).toBe(false);
  });
});

describe("hold", () => {
  it("vence después de N minutos", () => {
    const from = new Date("2026-01-01T00:00:00.000Z");
    const exp = holdExpiresAt(from, 15);
    expect(isHoldActive(exp, new Date("2026-01-01T00:10:00.000Z"))).toBe(true);
    expect(isHoldActive(exp, new Date("2026-01-01T00:16:00.000Z"))).toBe(false);
  });

  it("sin fecha de vencimiento se considera activo", () => {
    expect(isHoldActive(null)).toBe(true);
  });
});
