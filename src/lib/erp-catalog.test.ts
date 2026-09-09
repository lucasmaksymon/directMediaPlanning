import { describe, expect, it } from "vitest";
import { canonicalizeErpElement, parsePlazaInput } from "./erp-catalog";

describe("canonicalizeErpElement", () => {
  it("normaliza aliases conocidos", () => {
    expect(canonicalizeErpElement("cpm")).toBe("CPM");
    expect(canonicalizeErpElement("  pantalla led ")).toBe("Pantalla LED");
  });

  it("deja el texto original si no hay alias", () => {
    expect(canonicalizeErpElement("LED 3D")).toBe("LED 3D");
  });
});

describe("parsePlazaInput", () => {
  it("resuelve alias de GESTIÓN", () => {
    expect(parsePlazaInput("CABA")).toEqual({ province: "CABA", city: "CABA", explicitProvince: true });
    expect(parsePlazaInput("vl")).toEqual({
      province: "Buenos Aires",
      city: "Vicente López",
      explicitProvince: true,
    });
  });

  it("acepta Localidad (Provincia)", () => {
    expect(parsePlazaInput("Pilar (Buenos Aires)")).toEqual({
      province: "Buenos Aires",
      city: "Pilar",
      explicitProvince: true,
    });
  });

  it("asume Buenos Aires si solo hay localidad", () => {
    expect(parsePlazaInput("Pilar")).toEqual({
      province: "Buenos Aires",
      city: "Pilar",
      explicitProvince: false,
    });
  });

  it("devuelve null si está vacío", () => {
    expect(parsePlazaInput("   ")).toBeNull();
  });
});
