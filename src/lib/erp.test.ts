import { describe, expect, it } from "vitest";
import {
  ERP_ORDER,
  erpCashAmount,
  erpCashMode,
  erpInvoiceRef,
  erpSettlementLabel,
  fixSwappedDueIso,
  fixSwappedIssuedIso,
  invoiceCoverAmount,
  isSaleOrderOpen,
  nextAutoOrderEstado,
  saleOrderInvoiceCover,
  saleOrderPickLabel,
  saleOrderRemaining,
  vatPurchaseCommission,
} from "./erp";

describe("vatPurchaseCommission", () => {
  it("usa solo el neto, sin IVA", () => {
    expect(vatPurchaseCommission(14_000_000)).toBe(1_470_000);
    expect(vatPurchaseCommission(14_000_000, 12.5)).toBe(1_750_000);
  });
});

describe("erpInvoiceRef", () => {
  it("arma el comprobante con punto de venta y número como en Facturación", () => {
    expect(erpInvoiceRef("A", 3, 523)).toBe("A 0003-00000523");
    expect(erpInvoiceRef("nc", 4, 12)).toBe("NC 0004-00000012");
  });
});

describe("fixSwappedDueIso", () => {
  it("corrige 12/10 leído como 10/12 (caso Wallstreet)", () => {
    expect(fixSwappedDueIso("2026-08-12", "2026-12-10", 60)).toBe("2026-10-12");
  });

  it("deja un vencimiento creíble", () => {
    expect(fixSwappedDueIso("2026-09-30", "2026-11-29", 60)).toBeNull();
    expect(fixSwappedDueIso("2026-10-01", "2026-11-05", 60)).toBeNull();
    expect(fixSwappedDueIso("2025-11-12", "2025-11-12", 30)).toBeNull();
  });

  it("corrige un vencimiento anterior a la factura", () => {
    expect(fixSwappedDueIso("2026-08-12", "2026-02-10", 60)).toBe("2026-10-02");
  });

  it("no toca días mayores a 12", () => {
    expect(fixSwappedDueIso("2026-08-12", "2026-12-13", 60)).toBeNull();
  });
});

describe("fixSwappedIssuedIso", () => {
  const today = new Date("2026-10-19T12:00:00Z");

  it("corrige una emisión futura", () => {
    expect(fixSwappedIssuedIso("2026-12-08", today)).toBe("2026-08-12");
  });

  it("deja una emisión pasada", () => {
    expect(fixSwappedIssuedIso("2026-08-12", today)).toBeNull();
  });
});

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

  it("queda seleccionable solo si todavía resta saldo", () => {
    const order = { net: 100, vat: 21 };
    expect(isSaleOrderOpen(order, { amount: 40, vat: 8.4 })).toBe(true);
    expect(isSaleOrderOpen(order, { amount: 100, vat: 21 })).toBe(false);
  });
});

describe("factura + efectivo", () => {
  it("reparte el neto según la condición", () => {
    expect(erpCashAmount("invoice", 1000, 300)).toBe(0);
    expect(erpCashAmount("cash", 1000, 0)).toBe(1000);
    expect(erpCashAmount("mixed", 1000, 300)).toBe(300);
    expect(erpCashAmount("mixed", 1000, 5000)).toBe(1000);
  });

  it("deduce la condición guardada", () => {
    expect(erpCashMode(1000, 0)).toBe("invoice");
    expect(erpCashMode(1000, 0, true)).toBe("cash");
    expect(erpCashMode(1000, 1000)).toBe("cash");
    expect(erpCashMode(1000, 300)).toBe("mixed");
    expect(erpSettlementLabel(true, 1000, 300)).toBe("Factura + efectivo");
  });

  it("lo pendiente de facturar descuenta el efectivo", () => {
    // neto 1000, 300 en efectivo, IVA 21% sobre 700 = 147
    const order = { net: 1000, vat: 147, cashAmount: 300 };
    expect(saleOrderRemaining(order, { amount: 0, vat: 0 })).toEqual({ net: 700, vat: 147, amount: 847 });
    expect(isSaleOrderOpen(order, { amount: 700, vat: 147 })).toBe(false);
    expect(isSaleOrderOpen({ net: 1000, vat: 0, cashAmount: 1000 }, { amount: 0, vat: 0 })).toBe(false);
  });
});
