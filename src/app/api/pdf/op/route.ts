import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const reservationId = searchParams.get("id");
  if (!reservationId) return NextResponse.json({ error: "ID requerido." }, { status: 400 });

  const reservation = await prisma.reservation.findFirst({
    where: {
      id: reservationId,
      ...(session.user.role === "admin" ? {} : {
        OR: [
          { advertiserId: session.user.id },
          { inventoryUnit: { provider: { userId: session.user.id } } },
        ],
      }),
    },
    include: {
      inventoryUnit: {
        include: { provider: { include: { user: { select: { email: true } } } } },
      },
      advertiser: { include: { advertiserProfile: true } },
    },
  });

  if (!reservation) return NextResponse.json({ error: "Reserva no encontrada." }, { status: 404 });

  const formatDate = (d: Date) => d.toLocaleDateString("es-AR");
  const formatArs = (n: unknown) => `$${Number(n).toLocaleString("es-AR")}`;
  const opNumber = `OP-${reservation.id.slice(-8).toUpperCase()}`;
  const generatedAt = new Date().toLocaleDateString("es-AR");

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<title>Orden de Publicidad ${opNumber} — Direct Planning</title>
<style>
  *, *::before, *::after { box-sizing: border-box; }
  body { font-family: -apple-system, 'Segoe UI', sans-serif; color: #111; margin: 0; padding: 40px; background: #fff; max-width: 800px; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 3px solid #111; }
  .logo { font-size: 20px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; }
  .logo span { color: #00cc6a; }
  .op-number { font-size: 22px; font-weight: 800; text-align: right; }
  .op-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #888; margin-bottom: 4px; }
  .section { margin-bottom: 28px; }
  .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #888; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1px solid #e5e5e5; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .field { margin-bottom: 12px; }
  .field-label { font-size: 11px; color: #888; margin-bottom: 3px; }
  .field-value { font-size: 14px; font-weight: 500; }
  .total-box { background: #f6f6f6; border-radius: 8px; padding: 20px; display: flex; justify-content: space-between; align-items: center; margin: 24px 0; }
  .total-label { font-size: 14px; font-weight: 600; }
  .total-value { font-size: 24px; font-weight: 800; }
  .legal { font-size: 11px; color: #888; line-height: 1.6; margin-top: 32px; padding-top: 20px; border-top: 1px solid #ddd; }
  .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 48px; }
  .sig-line { border-bottom: 1px solid #111; margin-bottom: 8px; height: 48px; }
  .sig-label { font-size: 11px; color: #888; text-align: center; }
  @media print { .no-print { display: none; } }
</style>
</head>
<body>

<div class="header">
  <div>
    <div class="logo">Direct <span>Planning</span></div>
    <div style="font-size:12px;color:#888;margin-top:4px;">Marketplace OOH Argentina</div>
  </div>
  <div>
    <div class="op-label">Orden de Publicidad</div>
    <div class="op-number">${opNumber}</div>
    <div style="font-size:12px;color:#888;text-align:right;margin-top:4px;">Fecha: ${generatedAt}</div>
  </div>
</div>

<div class="grid2">
  <div class="section">
    <div class="section-title">Anunciante</div>
    <div class="field">
      <div class="field-label">Razón social / Nombre</div>
      <div class="field-value">${reservation.advertiser.advertiserProfile?.legalName ?? reservation.advertiser.email}</div>
    </div>
    <div class="field">
      <div class="field-label">Email</div>
      <div class="field-value">${reservation.advertiser.email}</div>
    </div>
    ${reservation.advertiser.advertiserProfile?.taxId ? `
    <div class="field">
      <div class="field-label">CUIT</div>
      <div class="field-value">${reservation.advertiser.advertiserProfile.taxId}</div>
    </div>` : ""}
  </div>

  <div class="section">
    <div class="section-title">Medio / Proveedor</div>
    <div class="field">
      <div class="field-label">Empresa</div>
      <div class="field-value">${reservation.inventoryUnit.provider.companyName}</div>
    </div>
    <div class="field">
      <div class="field-label">Email</div>
      <div class="field-value">${reservation.inventoryUnit.provider.user.email}</div>
    </div>
  </div>
</div>

<div class="section">
  <div class="section-title">Espacio publicitario</div>
  <div class="grid2">
    <div class="field">
      <div class="field-label">Nombre del espacio</div>
      <div class="field-value">${reservation.inventoryUnit.name}</div>
    </div>
    <div class="field">
      <div class="field-label">Ubicación</div>
      <div class="field-value">${reservation.inventoryUnit.locationLabel}</div>
    </div>
    <div class="field">
      <div class="field-label">Fecha de inicio</div>
      <div class="field-value">${formatDate(reservation.startsAt)}</div>
    </div>
    <div class="field">
      <div class="field-label">Fecha de fin</div>
      <div class="field-value">${formatDate(reservation.endsAt)}</div>
    </div>
  </div>
</div>

<div class="total-box">
  <div class="total-label">Inversión acordada (ARS)</div>
  <div class="total-value">${formatArs(reservation.agreedAmount ?? reservation.inventoryUnit.basePriceAmount)}</div>
</div>

${reservation.providerNote ? `
<div class="section">
  <div class="section-title">Condiciones adicionales del medio</div>
  <p style="font-size:13px;line-height:1.6;">${reservation.providerNote}</p>
</div>` : ""}

<div class="signatures">
  <div>
    <div class="sig-line"></div>
    <div class="sig-label">Firma anunciante</div>
  </div>
  <div>
    <div class="sig-line"></div>
    <div class="sig-label">Firma medio / proveedor</div>
  </div>
</div>

<div class="legal">
  Este documento es una Orden de Publicidad generada a través de Direct Planning. Los precios indicados fueron acordados entre las partes. 
  El pago, la facturación y la entrega de materiales se coordinan directamente entre anunciante y medio según los términos acordados.
  Direct Planning actúa como plataforma de conexión (Modelo C) y no es parte de la transacción comercial.
  Ref. de reserva: ${reservation.id}
</div>

<button class="no-print" onclick="window.print()" style="margin-top:32px;padding:12px 24px;background:#111;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;display:block;">
  Imprimir / Guardar PDF
</button>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `inline; filename="OP-${opNumber}.html"`,
    },
  });
}
