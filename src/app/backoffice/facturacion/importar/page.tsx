import { redirect } from "next/navigation";

export default async function ErpOcrImportPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  const { tipo } = await searchParams;
  if (tipo === "compra") redirect("/backoffice/facturacion/compra");
  if (tipo === "recibos") redirect("/backoffice/facturacion/recibos");
  redirect("/backoffice/facturacion/venta");
}
