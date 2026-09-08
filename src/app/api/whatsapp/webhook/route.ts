import { NextResponse } from "next/server";
import { decideReservationById } from "@/app/actions/reservation";
import { prisma } from "@/lib/prisma";
import { APP_URL } from "@/lib/email";
import { logger } from "@/lib/logger";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { normalizeReservationShortCode } from "@/lib/reservation-code";
import { verifyTwilioSignature } from "@/lib/webhook-verify";

export async function POST(req: Request) {
  const limited = rateLimit(clientKey(req, "wa-webhook"), 40, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    logger.error("whatsapp_webhook_missing_token");
    return NextResponse.json({ error: "webhook_not_configured" }, { status: 503 });
  }

  const body = await req.text();
  const params = new URLSearchParams(body);
  const parsed: Record<string, string> = {};
  params.forEach((v, k) => {
    parsed[k] = v;
  });

  const url = `${APP_URL}/api/whatsapp/webhook`;
  const signed = verifyTwilioSignature({
    authToken,
    signature: req.headers.get("x-twilio-signature"),
    url,
    body: parsed,
  });
  if (!signed) {
    logger.warn("whatsapp_webhook_invalid_signature");
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  const messageBody = (params.get("Body") ?? "").trim().toUpperCase();
  const acceptMatch = messageBody.match(/^ACEPTAR\s+([A-Z0-9]+)/);
  const rejectMatch = messageBody.match(/^RECHAZAR\s+([A-Z0-9]+)/);
  const shortId = normalizeReservationShortCode(acceptMatch?.[1] ?? rejectMatch?.[1] ?? "");
  const action = acceptMatch ? "accept" : rejectMatch ? "reject" : null;

  if (!shortId || !action) {
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Comando no reconocido. Usá ACEPTAR XXXXXX o RECHAZAR XXXXXX.</Message></Response>`,
      { headers: { "Content-Type": "text/xml" } },
    );
  }

  const reservation = await prisma.reservation.findFirst({
    where: { shortCode: shortId, status: "pending_provider" },
    select: { id: true },
  });

  if (!reservation) {
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Message>No encontré la solicitud ${shortId}. Verificá el código.</Message></Response>`,
      { headers: { "Content-Type": "text/xml" } },
    );
  }

  await decideReservationById(reservation.id, action, {
    skipAuth: true,
    providerNote: `whatsapp:${params.get("From") ?? ""}`,
  });

  const confirmText =
    action === "accept"
      ? `Reserva ${shortId} ACEPTADA. El anunciante fue notificado.`
      : `Reserva ${shortId} RECHAZADA. El anunciante fue notificado.`;

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${confirmText}</Message></Response>`,
    { headers: { "Content-Type": "text/xml" } },
  );
}
