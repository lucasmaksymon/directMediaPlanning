import { describe, expect, it } from "vitest";
import { ERP_ORDER, invoiceCoverAmount, nextAutoOrderEstado } from "./erp";

describe("invoiceCoverAmount", () => {
  it("suma factura e IVA", () => {
    expect(invoiceCoverAmount({ amount: 100, vat: 21, isCreditNote: false })).toBe(121);
  });

  it("resta la nota de crédito", () => {
    expect(invoiceCoverAmount({ amount: 10, vat: 2.1, isCreditNote: true })).toBe(-12.1);
  });
});

describe("nextAutoOrderEstado con NC de confidencial", () => {
  it("cierra si factura bruta menos NC cubre el neto de la orden", () => {
    const orderNet = 90;
    const facturaA = invoiceCoverAmount({ amount: 100, vat: 0, isCreditNote: false });
    const notaConfidencial = invoiceCoverAmount({ amount: 10, vat: 0, isCreditNote: true });
    expect(nextAutoOrderEstado(facturaA + notaConfidencial, orderNet, ERP_ORDER.issued)).toBe(
      ERP_ORDER.invoiced,
    );
  });

  it("no cierra si solo está la factura y falta cubrir", () => {
    expect(nextAutoOrderEstado(50, 90, ERP_ORDER.issued)).toBe(ERP_ORDER.issued);
  });
});
