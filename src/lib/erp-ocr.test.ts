import { describe, expect, it } from "vitest";
import { parseOcrExtracted } from "./erp-ocr";

describe("parseOcrExtracted nota de crédito", () => {
  it("en compra deja el IVA positivo, igual que el importe", () => {
    const row = parseOcrExtracted(
      { isCreditNote: true, docType: "NC", amount: 1000, vat: -210, total: 790 },
      "purchase_invoice",
    );
    expect(row.isCreditNote).toBe(true);
    expect(row.amount).toBe(1000);
    expect(row.vat).toBe(210);
    expect(row.total).toBe(1210);
  });

  it("en compra calcula el neto si el total y el IVA vinieron negativos", () => {
    const row = parseOcrExtracted({ docType: "Nota de crédito", total: -1210, vat: -210 }, "purchase_invoice");
    expect(row.amount).toBe(1000);
    expect(row.vat).toBe(210);
    expect(row.total).toBe(1210);
  });

  it("en venta deja importe e IVA negativos", () => {
    const row = parseOcrExtracted(
      { docType: "Nota de crédito A", amount: 1000, vat: -210, total: 1210 },
      "sale_invoice",
    );
    expect(row.isCreditNote).toBe(true);
    expect(row.docType).toBe("NC");
    expect(row.amount).toBe(-1000);
    expect(row.vat).toBe(-210);
    expect(row.total).toBe(-1210);
  });

  it("no cambia el signo de una factura", () => {
    const row = parseOcrExtracted({ docType: "A", amount: 100, vat: 21, total: 121 }, "purchase_invoice");
    expect(row.isCreditNote).toBe(false);
    expect(row.amount).toBe(100);
    expect(row.vat).toBe(21);
  });
});
