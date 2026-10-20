import { describe, expect, it } from "vitest";
import { amountReview, fitScore, pickSure, scoreSaleOrder, textScore, vatForNet } from "./erp-ocr-score";

const base = {
  number: "08.2026.0026 C",
  product: "PAQUETE MUPIS AGOSTO",
  elements: [] as string[],
  month: 8,
  year: 2026,
  remaining: 5_000_000,
  full: 16_516_500,
};

describe("pickSure", () => {
  it("elige solo con puntaje alto y margen sobre el segundo", () => {
    expect(pickSure([{ score: 0.9 }, { score: 0.6 }])).toEqual({ score: 0.9 });
    expect(pickSure([{ score: 0.9 }, { score: 0.8 }])).toBeNull();
    expect(pickSure([{ score: 0.7 }])).toBeNull();
    expect(pickSure([{ score: 0.8 }])).toEqual({ score: 0.8 });
  });
});

describe("fitScore", () => {
  it("una factura parcial que entra en el saldo puntúa bien", () => {
    expect(fitScore(968_000, 5_000_000, 16_516_500)).toBe(0.5);
    expect(fitScore(5_000_000, 5_000_000, 16_516_500)).toBe(1);
    expect(fitScore(16_516_500, 0, 16_516_500)).toBe(1);
    expect(fitScore(6_000_000, 5_000_000, 16_516_500)).toBe(0);
  });
});

describe("textScore", () => {
  it("ignora palabras de relleno y encuentra el mes o el producto", () => {
    expect(textScore("PAUTA VÍA PÚBLICA ESPECTÁCULOS", ["PAQUETE MUPIS AGOSTO"]).score).toBe(0);
    expect(textScore("PPL LED - Septiembre - Jamiroquai", ["PAQUETE MUPIS SEPTIEMBRE", "septiembre"]).hits).toEqual([
      "septiembre",
    ]);
  });
});

describe("scoreSaleOrder", () => {
  it("prefiere la orden del mes y del producto que menciona el detalle", () => {
    const input = {
      sameClient: true,
      detail: "PPL LED - Septiembre - Jamiroquai",
      total: 914_299.01,
      issuedAt: "2026-09-20",
    };
    const sept = scoreSaleOrder({ ...input, order: { ...base, number: "09.2026.0026 C", product: "PAQUETE MUPIS SEPTIEMBRE", month: 9 } });
    const aug = scoreSaleOrder({ ...input, order: base });
    expect(sept.score).toBeGreaterThan(aug.score);
    expect(sept.reason).toContain("SEPTIEMBRE");
  });

  it("dos órdenes iguales del mismo cliente no se distinguen: hay que preguntar", () => {
    const input = { sameClient: true, detail: "PAUTA VÍA PÚBLICA", total: 1_210_000, issuedAt: "2026-08-10" };
    const a = scoreSaleOrder({ ...input, order: base });
    const b = scoreSaleOrder({ ...input, order: { ...base, number: "08.2026.0033 C", product: null } });
    expect(pickSure([a, b].sort((x, y) => y.score - x.score))).toBeNull();
  });
});

describe("amountReview", () => {
  it("marca neto + IVA distinto del total y tasas raras", () => {
    expect(amountReview({ docType: "A", amount: 100, vat: 21, total: 121 })).toEqual([]);
    expect(amountReview({ docType: "A", amount: 100, vat: 21, total: 150 })[0]).toContain("no da el total");
    expect(amountReview({ docType: "A", amount: 100, vat: 15, total: 115 })[0]).toContain("15.00%");
    expect(amountReview({ docType: "A", amount: 100, vat: 0, total: 100 })[0]).toContain("sin IVA");
    expect(amountReview({ docType: "A", amount: 100, vat: 21, total: 121, confidence: { amount: 0.5 } })[0]).toContain(
      "no está seguro",
    );
  });
});

describe("vatForNet", () => {
  it("calcula 21% por defecto", () => {
    expect(vatForNet(1_000_000)).toBe(210_000);
    expect(vatForNet(1_000_000, 0.105)).toBe(105_000);
  });
});
