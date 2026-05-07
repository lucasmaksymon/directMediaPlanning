export function formatArs(amount: number | bigint | { toString(): string }) {
  const n = typeof amount === "number" ? amount : Number(amount.toString());
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString("es-AR", { style: "currency", currency: "ARS" });
}
