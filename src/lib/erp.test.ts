import { describe, expect, it } from "vitest";
import {
  ERP_ORDER,
  invoiceCoverAmount,
  nextAutoOrderEstado,
  saleOrderInvoiceCover,
  saleOrderPickLabel,
  saleOrderRemaining,
} from "./erp";

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

describe("saleOrderRemaining", () => {
  it("resta facturas parciales y deja la orden abierta", () => {
    const invoiced = saleOrderInvoiceCover([
      { amount: 40, vat: 8.4 },
      { amount: 20, vat: 4.2 },
    ]);
    const remaining = saleOrderRemaining({ net: 100, vat: 21 }, invoiced);
    expect(remaining).toEqual({ net: 40, vat: 8.4, amount: 48.4 });
    expect(nextAutoOrderEstado(invoiced.amount + invoiced.vat, 121, ERP_ORDER.issued)).toBe(ERP_ORDER.issued);
  });

  it("cierra cuando la suma de facturas cubre el total", () => {
    const invoiced = saleOrderInvoiceCover([
      { amount: 60, vat: 12.6 },
      { amount: 40, vat: 8.4 },
    ]);
    const remaining = saleOrderRemaining({ net: 100, vat: 21 }, invoiced);
    expect(remaining.amount).toBe(0);
    expect(nextAutoOrderEstado(invoiced.amount + invoiced.vat, 121, ERP_ORDER.issued)).toBe(ERP_ORDER.invoiced);
  });

  it("marca Facturada en el picker solo si no resta nada", () => {
    const order = { number: "12", client: { name: "DF" }, amount: 121 };
    expect(saleOrderPickLabel(order, { amount: 48.4 })).toContain("resta");
    expect(saleOrderPickLabel(order, { amount: 0 })).toContain("Facturada");
    expect(saleOrderPickLabel(order, { amount: 121 })).not.toContain("Facturada");
  });

  it("no deja resto si el bruto ya cubre el total aunque falte neto o IVA", () => {
    const remaining = saleOrderRemaining({ net: 21423192, vat: 4498870.32 }, { amount: 15180000, vat: 17970000 });
    expect(remaining).toEqual({ net: 0, vat: 0, amount: 0 });
  });
});
