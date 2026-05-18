import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const ids = searchParams.get("ids")?.split(",").filter(Boolean) ?? [];
  if (ids.length === 0) return NextResponse.json({ error: "Sin IDs de reservas." }, { status: 400 });

  const reservations = await prisma.reservation.findMany({
    where: {
      id: { in: ids },
      advertiserId: session.user.role === "admin" ? undefined : session.user.id,
    },
    include: {
      inventoryUnit: {
        select: {
          name: true, locationLabel: true, format: true, basePriceAmount: true, currency: true,
          latitude: true, longitude: true, imageUrls: true,
          provider: { select: { companyName: true } },
        },
      },
      advertiser: { select: { email: true, advertiserProfile: { select: { legalName: true } } } },
    },
    orderBy: { startsAt: "asc" },
  });

  if (reservations.length === 0) return NextResponse.json({ error: "Sin reservas." }, { status: 404 });

  const formatDate = (d: Date) => d.toLocaleDateString("es-AR");
  const formatArs = (n: unknown) => `$${Number(n).toLocaleString("es-AR")}`;
  const total = reservations.reduce((acc, r) => acc + Number(r.agreedAmount ?? r.inventoryUnit.basePriceAmount), 0);

  const advertiserName = reservations[0]?.advertiser.advertiserProfile?.legalName ?? reservations[0]?.advertiser.email ?? "";
  const generatedAt = new Date().toLocaleDateString("es-AR");

  const rows = reservations.map((r) => [
    r.inventoryUnit.name,
    r.inventoryUnit.provider.companyName,
    r.inventoryUnit.locationLabel,
    `${formatDate(r.startsAt)} — ${formatDate(r.endsAt)}`,
    formatArs(r.agreedAmount ?? r.inventoryUnit.basePriceAmount),
  ]);

  // Generate PDF as HTML (sent as downloadable HTML mimicking a print-ready media plan)
  // Using HTML because @react-pdf/renderer requires special bundling in Next.js App Router
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<title>Media Plan — Direct Planning</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; }
  body { font-family: Inter, -apple-system, sans-serif; color: #111; margin: 0; padding: 40px; background: #fff; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #111; }
  .logo { font-size: 22px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; }
  .logo span { color: #00cc6a; }
  .meta { text-align: right; font-size: 13px; color: #666; }
  h1 { font-size: 28px; font-weight: 700; margin: 0 0 8px; }
  h2 { font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #666; margin: 32px 0 12px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 32px; }
  .info-box { background: #f6f6f6; border-radius: 8px; padding: 16px; }
  .info-label { font-size: 12px; color: #888; margin-bottom: 4px; }
  .info-value { font-size: 15px; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #888; font-weight: 600; padding: 8px 12px; border-bottom: 1px solid #ddd; }
  td { padding: 12px; border-bottom: 1px solid #eee; vertical-align: top; }
  tr:last-child td { border-bottom: none; }
  .total-row td { font-weight: 700; font-size: 15px; border-top: 2px solid #111; border-bottom: none; padding-top: 16px; }
  .footer { margin-top: 48px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 11px; color: #aaa; display: flex; justify-content: space-between; }
  @media print {
    body { padding: 20px; }
    .no-print { display: none; }
  }
</style>
</head>
<body>
<div class="header">
  <div>
    <div class="logo">Direct <span>Planning</span></div>
    <div style="font-size:12px;color:#888;margin-top:4px;">Marketplace OOH Argentina</div>
  </div>
  <div class="meta">
    <div style="font-size:11px;">Generado el ${generatedAt}</div>
    <div style="font-size:11px;margin-top:4px;">Documento de uso interno</div>
  </div>
</div>

<h1>Media Plan</h1>

<div class="info-grid">
  <div class="info-box">
    <div class="info-label">Anunciante</div>
    <div class="info-value">${advertiserName}</div>
  </div>
  <div class="info-box">
    <div class="info-label">Total de espacios</div>
    <div class="info-value">${reservations.length} ${reservations.length === 1 ? "espacio" : "espacios"}</div>
  </div>
</div>

<h2>Espacios publicitarios</h2>
<table>
  <thead>
    <tr>
      <th>Espacio</th>
      <th>Medio</th>
      <th>Zona</th>
      <th>Período</th>
      <th>Precio ref. (ARS)</th>
    </tr>
  </thead>
  <tbody>
    ${rows.map(([name, medio, zona, periodo, precio]) => `
    <tr>
      <td><strong>${name}</strong></td>
      <td>${medio}</td>
      <td>${zona}</td>
      <td>${periodo}</td>
      <td>${precio}</td>
    </tr>`).join("")}
    <tr class="total-row">
      <td colspan="4">Total inversión estimada</td>
      <td>${formatArs(total)}</td>
    </tr>
  </tbody>
</table>

<div class="footer">
  <span>Direct Planning · directplanning.ar · Los precios son de referencia y están sujetos a confirmación del medio.</span>
  <span>Página 1 de 1</span>
</div>

<button class="no-print" onclick="window.print()" style="margin-top:32px;padding:12px 24px;background:#111;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;">
  Imprimir / Guardar PDF
</button>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `inline; filename="media-plan-${Date.now()}.html"`,
    },
  });
}
