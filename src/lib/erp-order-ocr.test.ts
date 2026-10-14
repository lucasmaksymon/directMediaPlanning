import { describe, expect, it } from "vitest";
import {
  normalizeOrderNumber,
  orderKindFromNumber,
  parentSaleNumber,
  parseOrderOcr,
} from "./erp-order-ocr";

describe("numeración de órdenes", () => {
  it("limpia el prefijo NRO y conserva la letra", () => {
    expect(normalizeOrderNumber("NRO 10.2026.0057.0007-1 M")).toBe("10.2026.0057.0007-1 M");
    expect(normalizeOrderNumber("ORDEN DE COMPRA 08.2026.0043 C")).toBe("08.2026.0043 C");
  });

  it("deduce el tipo por la letra", () => {
    expect(orderKindFromNumber("10.2026.0046 C")).toBe("sale_order");
    expect(orderKindFromNumber("10.2026.0057.0005 M")).toBe("purchase_order");
    expect(orderKindFromNumber("10.2026.0057.0002 P")).toBe("production_order");
  });

  it("encuentra la venta madre por prefijo", () => {
    expect(parentSaleNumber("10.2026.0057.0007-1 M")).toBe("10.2026.0057 C");
    expect(parentSaleNumber("10.2026.0046 C")).toBeNull();
  });
});

describe("parseOrderOcr", () => {
  it("en compra recalcula el neto encadenando los cierres", () => {
    const e = parseOrderOcr(
      {
        number: "10.2026.0057.0017 M",
        issuedAt: "2026-10-09",
        grossNet: 1893000,
        net: 1448145,
        adjustments: [
          { label: "DESCUENTO ESPECIAL 15%", kind: "deduct", percent: 15, amount: 283950 },
          { label: "CONFIDENCIAL AGENCIA", kind: "deduct", percent: 10, amount: -160905 },
        ],
      },
      "purchase_order",
    );
    expect(e.adjustments.map((a) => [a.label, a.amount])).toEqual([
      ["DESCUENTO ESPECIAL", 283950],
      ["CONFIDENCIAL AGENCIA", 160905],
    ]);
    expect(e.net).toBe(1448145);
    expect(e.warnings).toEqual([]);
  });

  it("en venta respeta el IVA impreso y deduce la alícuota", () => {
    const e = parseOrderOcr(
      { number: "08.2026.0043 C", issuedAt: "2026-08-10", net: 2479338.84, vat: 520661.16, total: 3000000 },
      "sale_order",
    );
    expect(e.vatRate).toBe(21);
    expect(e.month).toBe(8);
    expect(e.warnings).toEqual([]);
  });

  it("en producción calcula el IVA cuando la orden dice + iva", () => {
    const e = parseOrderOcr({ number: "10.2026.0057.0002 P", issuedAt: "2026-10-05", net: 785000 }, "production_order");
    expect(e.vat).toBe(164850);
    expect(e.parentNumber).toBe("10.2026.0057 C");
  });

  it("avisa cuando el PDF es de otra sección", () => {
    const e = parseOrderOcr({ number: "10.2026.0057.0002 P" }, "purchase_order");
    expect(e.detectedKind).toBe("production_order");
  });
});
