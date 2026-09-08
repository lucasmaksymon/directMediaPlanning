import { describe, expect, it } from "vitest";
import { parseInventoryCsv } from "./inventory-csv";

describe("parseInventoryCsv", () => {
  it("parsea filas válidas", () => {
    const csv = `provider,name,locationLabel,format,priceModel,basePriceAmount,status
NextMedia,LED Obelisco,CABA,digital_ooh,fixed_list,150000,published`;
    const { rows, errors } = parseInventoryCsv(csv);
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.name).toBe("LED Obelisco");
    expect(rows[0]?.basePriceAmount).toBe(150000);
  });

  it("reporta columnas faltantes", () => {
    const { errors } = parseInventoryCsv("name,price\nfoo,1");
    expect(errors[0]?.message).toMatch(/Falta la columna/);
  });
});
