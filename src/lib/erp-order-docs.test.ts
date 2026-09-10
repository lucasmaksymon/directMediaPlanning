import { describe, expect, it } from "vitest";
import {
  ERP_ADJUSTMENT,
  adjustmentLabel,
  purchaseBreakdown,
  purchaseCostLabel,
} from "./erp-order-docs";

describe("purchaseBreakdown", () => {
  it("suma el detalle cuando no se cargó el costo bruto", () => {
    const { gross, net } = purchaseBreakdown({
      items: [{ net: 1191871 }, { net: 1025319 }, { net: 877203 }],
    });
    expect(gross).toBe(3094393);
    expect(net).toBe(3094393);
  });

  it("descuenta el confidencial de agencia por porcentaje", () => {
    const { gross, rows, net } = purchaseBreakdown({
      items: [{ net: 800000 }, { net: 800000 }, { net: 800000 }],
      adjustments: [{ label: "CONFIDENCIAL AGENCIA", kind: ERP_ADJUSTMENT.deduct, percent: 10, amount: 0 }],
    });
    expect(gross).toBe(2400000);
    expect(rows[0].value).toBe(240000);
    expect(net).toBe(2160000);
  });

  it("prioriza el importe cargado a mano sobre el porcentaje", () => {
    const { rows, net } = purchaseBreakdown({
      grossNet: 3094393,
      adjustments: [{ label: "DESCUENTO ESPECIAL", kind: ERP_ADJUSTMENT.deduct, percent: 7, amount: 216607.51 }],
    });
    expect(rows[0].value).toBe(216607.51);
    expect(net).toBe(2877785.49);
  });

  it("acumula ajustes que restan y que suman", () => {
    const { net } = purchaseBreakdown({
      grossNet: 1000,
      adjustments: [
        { label: "DESCUENTO ESPECIAL", kind: ERP_ADJUSTMENT.deduct, percent: 10, amount: 0 },
        { label: "RECARGO", kind: ERP_ADJUSTMENT.add, percent: null, amount: 50 },
      ],
    });
    expect(net).toBe(950);
  });

  it("sin ajustes el neto es el bruto", () => {
    expect(purchaseBreakdown({ grossNet: 500 }).net).toBe(500);
  });
});

describe("purchaseCostLabel", () => {
  it("arma la leyenda con los días", () => {
    expect(purchaseCostLabel({ days: 6 })).toBe("COSTO NETO TOTAL 6 DÍAS");
  });

  it("respeta la leyenda libre", () => {
    expect(purchaseCostLabel({ costLabel: "Costo 3 días en exclusivo y 3 en loop", days: 6 })).toBe(
      "COSTO 3 DÍAS EN EXCLUSIVO Y 3 EN LOOP",
    );
  });

  it("cae al genérico sin días ni leyenda", () => {
    expect(purchaseCostLabel({})).toBe("COSTO NETO TOTAL");
  });
});

describe("adjustmentLabel", () => {
  it("agrega el porcentaje cuando existe", () => {
    expect(adjustmentLabel({ label: "CONFIDENCIAL AGENCIA", kind: 1, percent: 10, amount: 0 })).toBe(
      "CONFIDENCIAL AGENCIA 10%",
    );
  });

  it("deja el concepto solo si es importe fijo", () => {
    expect(adjustmentLabel({ label: "DESCUENTO ESPECIAL", kind: 1, percent: null, amount: 5000 })).toBe(
      "DESCUENTO ESPECIAL",
    );
  });
});
