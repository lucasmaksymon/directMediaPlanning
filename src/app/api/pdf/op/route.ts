import { auth } from "@/auth";
import { CLIENT_BRAND, PRODUCT_NAME } from "@/lib/brand";
import { brandLogoColorDataUri } from "@/lib/presentations/brand-logo-server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "No autenticado." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const reservationId = searchParams.get("id");
  if (!reservationId) return Response.json({ error: "ID requerido." }, { status: 400 });

  const reservation = await prisma.reservation.findFirst({
    where: {
      id: reservationId,
      ...(session.user.role === "admin"
        ? {}
        : { advertiserId: session.user.id }),
    },
    include: {
      inventoryUnit: true,
      advertiser: { include: { advertiserProfile: true } },
    },
  });

  if (!reservation) return Response.json({ error: "Reserva no encontrada." }, { status: 404 });

  const formatDate = (d: Date) => d.toLocaleDateString("es-AR");
  const formatArs = (n: unknown) => `$${Number(n).toLocaleString("es-AR")}`;
  const opNumber = `OP-${reservation.id.slice(-8).toUpperCase()}`;
  const generatedAt = new Date().toLocaleDateString("es-AR");
  const logoSrc = brandLogoColorDataUri();

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<title>Orden de Publicidad ${opNumber} — ${PRODUCT_NAME}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; }
  body { font-family: -apple-system, 'Segoe UI', sans-serif; color: #111; margin: 0 auto; padding: 40px; background: #fff; max-width: 800px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 3px solid #111; }
  .logo { height: 36px; width: auto; display: block; }
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
    <img class="logo" src="${logoSrc}" alt="${CLIENT_BRAND}" />
    <div style="font-size:12px;color:#888;margin-top:8px;">Orden de publicidad OOH</div>
  </div>
  <div>
    <div class="op-label">Orden de Publicidad</div>
    <div class="op-number">${opNumber}</div>
    <div style="font-size:12px;color:#888;text-align:right;margin-top:4px;">Fecha: ${generatedAt}</div>
  </div>
</div>

<div class="grid2">
  <div class="section">
    <div class="section-title">Cliente</div>
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
    <div class="section-title">Operador</div>
    <div class="field">
      <div class="field-label">Empresa</div>
      <div class="field-value">${CLIENT_BRAND}</div>
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
  <div class="section-title">Condiciones adicionales</div>
  <p style="font-size:13px;line-height:1.6;">${reservation.providerNote}</p>
</div>` : ""}

<div class="signatures">
  <div>
    <div class="sig-line"></div>
    <div class="sig-label">Firma cliente</div>
  </div>
  <div>
    <div class="sig-line"></div>
    <div class="sig-label">Firma ${CLIENT_BRAND}</div>
  </div>
</div>

<div class="legal">
  Documento generado por ${PRODUCT_NAME} en nombre de ${CLIENT_BRAND}.
  Los precios indicados fueron acordados entre las partes. El pago, la facturación y la entrega de materiales
  se coordinan con el equipo de ${CLIENT_BRAND}.
  Ref. de reserva: ${reservation.id}
</div>

<button class="no-print" onclick="window.print()" style="margin-top:32px;padding:12px 24px;background:#111;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;display:block;">
  Imprimir / Guardar PDF
</button>
</body>
</html>`;
  const cleanHtml = html.replace(/motion\.div/g, "div");

  return new Response(cleanHtml, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `inline; filename="op-${opNumber}.html"`,
    },
  });
}
