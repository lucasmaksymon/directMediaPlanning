import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const from = process.env.TWILIO_WHATSAPP_FROM ?? "whatsapp:+14155238886";

export async function sendWhatsApp(to: string, body: string): Promise<void> {
  if (!accountSid || !authToken) {
    console.warn("[whatsapp] Twilio no configurado. Mensaje no enviado.");
    return;
  }

  const toFormatted = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;

  try {
    const client = twilio(accountSid, authToken);
    await client.messages.create({ from, to: toFormatted, body });
  } catch (err) {
    console.error("[whatsapp] Error enviando mensaje:", err);
  }
}

export function buildNewReservationWhatsApp(
  unitName: string,
  advertiserEmail: string,
  startsAt: Date,
  endsAt: Date,
  reservationId: string,
): string {
  const start = startsAt.toLocaleDateString("es-AR");
  const end = endsAt.toLocaleDateString("es-AR");
  return `*Direct Planning* — Nueva solicitud de reserva\n\n*Espacio:* ${unitName}\n*Anunciante:* ${advertiserEmail}\n*Período:* ${start} al ${end}\n\nPara responder ingresá a: ${process.env.NEXT_PUBLIC_APP_URL ?? process.env.AUTH_URL ?? "http://localhost:3000"}/provider/reservations\n\n_Respondé ACEPTAR ${reservationId.slice(-6)} o RECHAZAR ${reservationId.slice(-6)} a este mensaje para gestionar la solicitud._`;
}
