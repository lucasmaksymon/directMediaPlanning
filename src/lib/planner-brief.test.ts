import { describe, expect, it } from "vitest";
import { parsePlannerBrief } from "./planner-brief";

describe("parsePlannerBrief", () => {
  it("detecta presupuesto y zona", () => {
    const brief = parsePlannerBrief([
      { role: "user", content: "Campaña ABC1 en Palermo con 2 millones de presupuesto" },
    ]);
    expect(brief.presupuesto).toBe(2_000_000);
    expect(brief.zonas).toContain("palermo");
    expect(brief.esABC1).toBe(true);
  });
});
