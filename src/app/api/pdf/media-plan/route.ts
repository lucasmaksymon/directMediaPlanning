import { auth } from "@/auth";
import { renderToBuffer } from "@react-pdf/renderer";
import { MediaPlanDocument } from "@/lib/pdf/media-plan-document";
import { CLIENT_BRAND, PRODUCT_NAME } from "@/lib/brand";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "No autenticado." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format");
  const ids = searchParams.get("ids")?.split(",").filter(Boolean) ?? [];
  if (ids.length === 0) return Response.json({ error: "Sin IDs de reservas." }, { status: 400 });

  const reservations = await prisma.reservation.findMany({
    where: {
      id: { in: ids },
      advertiserId: session.user.role === "admin" ? undefined : session.user.id,
    },
    include: {
      inventoryUnit: {
        select: { name: true, locationLabel: true, basePriceAmount: true },
      },
      advertiser: { select: { email: true, advertiserProfile: { select: { legalName: true } } } },
    },
    orderBy: { startsAt: "asc" },
  });

  if (reservations.length === 0) return Response.json({ error: "Sin reservas." }, { status: 404 });

  const formatDate = (d: Date) => d.toLocaleDateString("es-AR");
  const formatArs = (n: unknown) => `$${Number(n).toLocaleString("es-AR")}`;
  const total = reservations.reduce(
    (acc, r) => acc + Number(r.agreedAmount ?? r.inventoryUnit.basePriceAmount),
    0,
  );

  const advertiserName =
    reservations[0]?.advertiser.advertiserProfile?.legalName ??
    reservations[0]?.advertiser.email ??
    "";

  const rows = reservations.map((r) => ({
    unitName: r.inventoryUnit.name,
    location: r.inventoryUnit.locationLabel,
    dates: `${formatDate(r.startsAt)} — ${formatDate(r.endsAt)}`,
    amount: formatArs(r.agreedAmount ?? r.inventoryUnit.basePriceAmount),
  }));

  if (format === "pdf") {
    const buffer = await renderToBuffer(
      MediaPlanDocument({
        productName: PRODUCT_NAME,
        advertiserName,
        generatedAt: new Date().toLocaleDateString("es-AR"),
        rows,
        total: formatArs(total),
      }),
    );

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="media-plan-${Date.now()}.pdf"`,
      },
    });
  }

  // Fallback HTML para impresión
  const htmlRows = rows
    .map(
      (r) =>
        `<tr><td>${r.unitName}</td><td>${CLIENT_BRAND}</td><td>${r.location}</td><td>${r.dates}</td><td>${r.amount}</td></tr>`,
    )
    .join("");

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/><title>Media Plan</title>
<style>body{font-family:system-ui;padding:40px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #ddd;padding:8px}</style></head>
<body><h1>${PRODUCT_NAME} — Media Plan</h1><p>${advertiserName}</p>
<table><thead><tr><th>Espacio</th><th>Medio</th><th>Ubicación</th><th>Fechas</th><th>Monto</th></tr></thead><tbody>${htmlRows}</tbody></table>
<p><strong>Total: ${formatArs(total)}</strong></p></body></html>`;

  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
