import { describe, expect, it } from "vitest";
import {
  checkModeFor,
  checkOrderFor,
  matchChequesByAmount,
  parseBankCheques,
  salePayDefaults,
} from "./erp-cheque-excel";

const utc = (y: number, m: number, d: number, h = 0) => new Date(Date.UTC(y, m - 1, d, h));

const sheet: unknown[][] = [
  ["Datos del cheque", null, null, null, null, null, null, "CBU Deposito"],
  [
    "N° de cheque",
    "Cláusula",
    "Recibido de",
    "CUIT/CUIL/CDI",
    "Fecha de pago",
    "Fecha de emisión",
    "Importe",
    "Estado",
    "CUIT/CUIL/CDI",
  ],
  ["00000876", "A la orden", "VESTIDITOS SA", "30593229064", utc(2026, 10, 21), utc(2026, 10, 20, 15), 13552.62, "Disponible", "1"],
  ["69358370", "a la orden", "VESTIDITOS SA", "30593229064", utc(2026, 10, 12), utc(2026, 8, 27, 19), 500000, "Disponible", "1"],
  ["00002267", "a la orden", "VESTIDITOS SA", "30593229064", utc(2026, 10, 12), utc(2026, 8, 27), 7500000, "Disponible", "1"],
  ["69357185", "a la orden", "VESTIDITOS SA", "30593229064", utc(2026, 10, 12), utc(2026, 8, 27), 7500000, "Disponible", "1"],
  ["00001111", "Cruzado", "OTRO SA", "30-11111111-1", utc(2026, 10, 1), utc(2026, 10, 1), 1000, "Disponible", "1"],
  [null, null, null, null, null, null, null, null, null],
];

describe("parseBankCheques", () => {
  it("lee las filas debajo del encabezado real", () => {
    const rows = parseBankCheques(sheet);
    expect(rows).toHaveLength(5);
    expect(rows[0]).toEqual({
      number: "00000876",
      clause: "A la orden",
      cuit: "30593229064",
      issuedAt: "2026-10-20",
      paidAt: "2026-10-21",
      amount: 13552.62,
    });
    expect(rows[4].cuit).toBe("30111111111");
  });

  it("falla si no es el listado del banco", () => {
    expect(() => parseBankCheques([["a", "b"]])).toThrow();
  });
});

describe("reglas de cheque", () => {
  it("al día si coinciden las fechas, diferido si no", () => {
    expect(checkOrderFor("2026-10-01", "2026-10-01")).toBe(1);
    expect(checkOrderFor("2026-08-27", "2026-10-12")).toBe(2);
    expect(checkOrderFor("", "2026-10-12")).toBe(0);
  });

  it("cláusula", () => {
    expect(checkModeFor("A la Orden")).toBe(1);
    expect(checkModeFor("Cruzado")).toBe(2);
    expect(checkModeFor("No a la orden")).toBe(0);
  });

  it("defaults: cheque pendiente E-cheq, resto cobrado", () => {
    expect(salePayDefaults({ paymentKind: 1, issuedAt: "2026-10-01", paidAt: "2026-10-05" })).toMatchObject({
      estado: 0,
      checkType: 2,
      checkOrder: 2,
    });
    expect(salePayDefaults({ paymentKind: 0 })).toMatchObject({ estado: 1, checkType: 0 });
  });
});

describe("matchChequesByAmount", () => {
  const cheques = parseBankCheques(sheet);

  it("asigna por importe y reparte importes repetidos", () => {
    const res = matchChequesByAmount(
      [
        { paymentKind: "1", amount: "7500000", estado: "1" },
        { paymentKind: "0", amount: "500000", estado: "1" },
        { paymentKind: "1", amount: "7500000.00", estado: "1" },
        { paymentKind: "1", amount: "500000", estado: "1" },
        { paymentKind: "1", amount: "999", estado: "1" },
      ],
      cheques,
    );
    expect(res.filled).toBe(3);
    expect(res.unmatched).toEqual(["999"]);
    expect(res.unusedRows).toBe(2);
    expect(res.lines[0]).toMatchObject({ number: "00002267", checkOrder: "2", checkType: "2", checkMode: "1", estado: "0" });
    expect(res.lines[1]).toEqual({ paymentKind: "0", amount: "500000", estado: "1" });
    expect(res.lines[2].number).toBe("69357185");
    expect(res.lines[3]).toMatchObject({ number: "69358370", issuedAt: "2026-08-27", paidAt: "2026-10-12" });
    expect(res.lines[3].amount).toBe("500000");
  });
});
