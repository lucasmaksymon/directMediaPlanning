import { describe, expect, it } from "vitest";
import { nameScore } from "@/lib/erp-ocr-match";

const party = (legalName: string, taxId: string | null = null) => ({ legalName, taxId });

describe("nameScore", () => {
  it("no matchea solo por la palabra publicidad", () => {
    expect(nameScore(party("VEGA PUBLICIDAD S.A."), { name: "FE PUBLICIDAD" })).toBe(0);
    expect(nameScore(party("MARTI PUBLICIDAD SRL"), { name: "FE PUBLICIDAD" })).toBe(0);
  });

  it("matchea por la parte distintiva del nombre", () => {
    expect(nameScore(party("FE PUBLICIDAD S.R.L."), { name: "FE PUBLICIDAD" })).toBeGreaterThan(0.7);
    expect(nameScore(party("REYNA PUBLICIDAD SRL"), { name: "RED DIRECTA / REYNA PUBLICIDAD" })).toBeGreaterThan(0.7);
  });

  it("CUIT distinto descarta aunque el nombre se parezca", () => {
    expect(nameScore(party("VEGA PUBLICIDAD", "30-11111111-1"), { name: "VEGA PUBLICIDAD", taxId: "20234637585" })).toBe(0);
    expect(nameScore(party("OTRO NOMBRE", "20-23463758-5"), { name: "VEGA PUBLICIDAD", taxId: "20234637585" })).toBe(1);
  });
});
