import { describe, expect, it } from "vitest";
import { filterAutocompleteOptions } from "./autocomplete-filter";

const plazas = [
  { value: "Bariloche", label: "Bariloche" },
  { value: "Bahía Blanca", label: "Bahía Blanca (Buenos Aires)" },
  { value: "Chaco", label: "Chaco (Buenos Aires)" },
  { value: "Córdoba", label: "Cordoba (Buenos Aires)" },
  { value: "Liniers", label: "Liniers (Buenos Aires)" },
];

describe("filterAutocompleteOptions", () => {
  it("filtra por prefijo ignorando acentos", () => {
    expect(filterAutocompleteOptions(plazas, "Barilo").map((o) => o.value)).toEqual(["Bariloche"]);
  });

  it("no devuelve el catálogo entero si no hay match", () => {
    expect(filterAutocompleteOptions(plazas, "Barilo")).toHaveLength(1);
  });

  it("encuentra por palabra interna", () => {
    expect(filterAutocompleteOptions(plazas, "blanca").map((o) => o.value)).toEqual(["Bahía Blanca"]);
  });

  it("sin query devuelve todas", () => {
    expect(filterAutocompleteOptions(plazas, "   ")).toHaveLength(plazas.length);
  });
});
