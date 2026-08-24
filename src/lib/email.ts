import { Resend } from "resend";
import { CLIENT_BRAND, PRODUCT_NAME } from "@/lib/brand";

export const EMAIL_FROM = process.env.EMAIL_FROM ?? `${PRODUCT_NAME} <noreply@nextmedia.ar>`;
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? process.env.AUTH_URL ?? "http://localhost:3000";

let _resend: Resend | null = null;
function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

export type EmailPayload =
  | { type: "welcome"; to: string; role: "advertiser" | "provider" | "agency"; name?: string }
  | { type: "new_reservation"; to: string; providerName: string; unitName: string; advertiserEmail: string; startsAt: Date; endsAt: Date; reservationId: string }
  | { type: "new_reservation_provider"; to: string; unitName: string; advertiserName: string; agencyName?: string; startsAt: Date; endsAt: Date; providerPanelUrl: string }
  | { type: "reservation_accepted"; to: string; unitName: string; providerName: string; startsAt: Date; endsAt: Date; note?: string | null }
  | { type: "reservation_rejected"; to: string; unitName: string; providerName: string; note?: string | null }
  | { type: "last_minute_alert"; to: string; unitName: string; locationLabel: string; discountPct: number; unitUrl: string };

export async function sendEmail(payload: EmailPayload): Promise<void> {
  const resend = getResend();
  if (!resend) return;

  try {
    switch (payload.type) {
      case "welcome":
        await resend.emails.send({
          from: EMAIL_FROM,
          to: payload.to,
          subject: `Bienvenido a ${PRODUCT_NAME}`,
          html: welcomeHtml(payload),
        });
        break;
      case "new_reservation":
        await resend.emails.send({
          from: EMAIL_FROM,
          to: payload.to,
          subject: `Nueva solicitud de reserva — ${payload.unitName}`,
          html: newReservationHtml(payload),
        });
        break;
      case "reservation_accepted":
        await resend.emails.send({
          from: EMAIL_FROM,
          to: payload.to,
          subject: `Tu solicitud fue aceptada — ${payload.unitName}`,
          html: reservationAcceptedHtml(payload),
        });
        break;
      case "reservation_rejected":
        await resend.emails.send({
          from: EMAIL_FROM,
          to: payload.to,
          subject: `Actualización sobre tu solicitud — ${payload.unitName}`,
          html: reservationRejectedHtml(payload),
        });
        break;
      case "new_reservation_provider":
        await resend.emails.send({
          from: EMAIL_FROM,
          to: payload.to,
          subject: `Nueva solicitud para "${payload.unitName}"`,
          html: newReservationProviderHtml(payload),
        });
        break;
      case "last_minute_alert":
        await resend.emails.send({
          from: EMAIL_FROM,
          to: payload.to,
          subject: `Oportunidad Last Minute — ${payload.unitName} ${payload.discountPct}% OFF`,
          html: lastMinuteAlertHtml(payload),
        });
        break;
    }
  } catch (err) {
    console.error("[email] Error enviando email:", err);
  }
}

function formatDate(d: Date) {
  return d.toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
}

function baseHtml(title: string, body: string) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; background: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111; }
    .container { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e5e5; }
    .header { background: #050f11; padding: 28px 36px; }
    .logo { color: #00ff88; font-size: 18px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; }
    .body { padding: 36px; }
    h2 { margin: 0 0 16px; font-size: 20px; font-weight: 700; color: #111; }
    p { margin: 0 0 14px; font-size: 15px; line-height: 1.6; color: #444; }
    .data-box { background: #f8f8f8; border-radius: 8px; padding: 16px 20px; margin: 20px 0; border-left: 3px solid #00ff88; }
    .data-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
    .data-row:last-child { margin-bottom: 0; }
    .data-label { color: #888; }
    .data-value { font-weight: 600; color: #111; }
    .btn { display: inline-block; background: #00ff88; color: #050f11; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 24px; border-radius: 8px; margin-top: 8px; text-transform: uppercase; letter-spacing: 0.05em; }
    .footer { padding: 20px 36px; border-top: 1px solid #eee; font-size: 12px; color: #aaa; text-align: center; }
    .note-box { background: #fffbe6; border-radius: 8px; padding: 12px 16px; margin: 16px 0; border-left: 3px solid #f59e0b; font-size: 14px; color: #78350f; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">${PRODUCT_NAME}</div>
    </div>
    <div class="body">
      ${body}
    </div>
    <div class="footer">
      ${PRODUCT_NAME} · ${CLIENT_BRAND}<br/>
      Este es un email automático, no respondas a este mensaje.
    </div>
  </div>
</body>
</html>`;
}

function welcomeHtml(p: Extract<EmailPayload, { type: "welcome" }>) {
  const roleLabels: Record<string, string> = {
    advertiser: "anunciante",
    provider: "medio / proveedor OOH",
    agency: "agencia",
  };
  const dashboardUrls: Record<string, string> = {
    advertiser: `${APP_URL}/advertiser`,
    provider: `${APP_URL}/provider`,
    agency: `${APP_URL}/agency`,
  };
  const roleLabel = roleLabels[p.role] ?? "usuario";
  const dashboardUrl = dashboardUrls[p.role] ?? `${APP_URL}/inicio`;

  const roleMessages: Record<string, string> = {
    advertiser: "Ya podés explorar el catálogo OOH, planificar campañas con IA y reservar espacios.",
    provider: "Ya podés cargar tus espacios publicitarios, gestionar disponibilidad y recibir solicitudes de anunciantes.",
    agency: "Ya podés gestionar tus clientes anunciantes, acceder a precios preferenciales y cobrar comisiones por cada campaña.",
  };

  return baseHtml(`Bienvenido a ${PRODUCT_NAME}`, `
    <h2>Bienvenido a ${PRODUCT_NAME}</h2>
    <p>Tu cuenta como <strong>${roleLabel}</strong> de ${CLIENT_BRAND} fue creada exitosamente${p.name ? ` para <strong>${p.name}</strong>` : ""}.</p>
    <p>${roleMessages[p.role] ?? ""}</p>
    <a class="btn" href="${dashboardUrl}">Ir al panel →</a>
    <p style="margin-top: 20px; font-size: 13px; color: #888;">Si no creaste esta cuenta, ignorá este mensaje.</p>
  `);
}

function newReservationHtml(p: Extract<EmailPayload, { type: "new_reservation" }>) {
  const url = `${APP_URL}/admin/reservas`;
  return baseHtml(`Nueva solicitud — ${p.unitName}`, `
    <h2>Nueva solicitud de reserva</h2>
    <p>Recibiste una solicitud de disponibilidad en ${CLIENT_BRAND}.</p>
    <div class="data-box">
      <div class="data-row"><span class="data-label">Espacio</span><span class="data-value">${p.unitName}</span></div>
      <div class="data-row"><span class="data-label">Anunciante</span><span class="data-value">${p.advertiserEmail}</span></div>
      <div class="data-row"><span class="data-label">Desde</span><span class="data-value">${formatDate(p.startsAt)}</span></div>
      <div class="data-row"><span class="data-label">Hasta</span><span class="data-value">${formatDate(p.endsAt)}</span></div>
    </div>
    <p>Revisá la solicitud y respondé a la brevedad. El anunciante está esperando tu respuesta.</p>
    <a class="btn" href="${url}">Ver solicitud →</a>
  `);
}

function reservationAcceptedHtml(p: Extract<EmailPayload, { type: "reservation_accepted" }>) {
  const url = `${APP_URL}/advertiser`;
  return baseHtml(`Solicitud aceptada — ${p.unitName}`, `
    <h2>Tu solicitud fue aceptada</h2>
    <p>El espacio está confirmado para tu campaña.</p>
    <div class="data-box">
      <div class="data-row"><span class="data-label">Espacio</span><span class="data-value">${p.unitName}</span></div>
      <div class="data-row"><span class="data-label">Operador</span><span class="data-value">${p.providerName}</span></div>
      <div class="data-row"><span class="data-label">Desde</span><span class="data-value">${formatDate(p.startsAt)}</span></div>
      <div class="data-row"><span class="data-label">Hasta</span><span class="data-value">${formatDate(p.endsAt)}</span></div>
    </div>
    ${p.note ? `<div class="note-box"><strong>Nota del medio:</strong> ${p.note}</div>` : ""}
    <p>Coordiná con el medio los próximos pasos: entrega de material, instrucción de pago y confirmación final.</p>
    <a class="btn" href="${url}">Ver mis solicitudes →</a>
  `);
}

function reservationRejectedHtml(p: Extract<EmailPayload, { type: "reservation_rejected" }>) {
  const url = `${APP_URL}/explorar`;
  return baseHtml(`Solicitud no disponible — ${p.unitName}`, `
    <h2>El espacio no está disponible</h2>
    <p>El medio revisó tu solicitud y no puede confirmar la disponibilidad para las fechas pedidas.</p>
    <div class="data-box">
      <div class="data-row"><span class="data-label">Espacio</span><span class="data-value">${p.unitName}</span></div>
      <div class="data-row"><span class="data-label">Operador</span><span class="data-value">${p.providerName}</span></div>
    </div>
    ${p.note ? `<div class="note-box"><strong>Motivo del medio:</strong> ${p.note}</div>` : ""}
    <p>Podés explorar el catálogo y encontrar otras opciones disponibles para tu campaña.</p>
    <a class="btn" href="${url}">Explorar catálogo →</a>
  `);
}

function newReservationProviderHtml(p: Extract<EmailPayload, { type: "new_reservation_provider" }>) {
  return baseHtml(`Nueva solicitud — ${p.unitName}`, `
    <h2>Tenés una nueva solicitud</h2>
    <p>Un anunciante solicitó disponibilidad para tu espacio <strong>${p.unitName}</strong>.</p>
    <div class="data-box">
      <div class="data-row"><span class="data-label">Espacio</span><span class="data-value">${p.unitName}</span></div>
      <div class="data-row"><span class="data-label">Anunciante</span><span class="data-value">${p.advertiserName}</span></div>
      ${p.agencyName ? `<div class="data-row"><span class="data-label">Vía agencia</span><span class="data-value">${p.agencyName}</span></div>` : ""}
      <div class="data-row"><span class="data-label">Desde</span><span class="data-value">${formatDate(p.startsAt)}</span></div>
      <div class="data-row"><span class="data-label">Hasta</span><span class="data-value">${formatDate(p.endsAt)}</span></div>
    </div>
    <p>Ingresá a tu panel para revisar y responder la solicitud.</p>
    <a class="btn" href="${p.providerPanelUrl}">Ver solicitudes →</a>
  `);
}

function lastMinuteAlertHtml(p: Extract<EmailPayload, { type: "last_minute_alert" }>) {
  return baseHtml(`Last Minute — ${p.unitName}`, `
    <h2>¡Oportunidad Last Minute disponible!</h2>
    <p>Hay un espacio con descuento especial para fechas próximas en ${CLIENT_BRAND}.</p>
    <div class="data-box">
      <div class="data-row"><span class="data-label">Espacio</span><span class="data-value">${p.unitName}</span></div>
      <div class="data-row"><span class="data-label">Ubicación</span><span class="data-value">${p.locationLabel}</span></div>
      <div class="data-row"><span class="data-label">Descuento</span><span class="data-value" style="color:#00ff88">${p.discountPct}% OFF</span></div>
    </div>
    <p>Esta oportunidad es por tiempo limitado. ¡Reservá antes de que alguien más lo tome!</p>
    <a class="btn" href="${p.unitUrl}">Ver espacio →</a>
  `);
}
