import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ReservationStatus } from "@prisma/client";
import { sendEmail } from "@/lib/email";

export async function POST(req: Request) {
  const body = await req.text();
  const params = new URLSearchParams(body);

  const from = params.get("From") ?? "";
  const messageBody = params.get("Body")?.trim().toUpperCase() ?? "";

  // Parsear comandos: ACEPTAR XXXXXX o RECHAZAR XXXXXX
  const acceptMatch = messageBody.match(/^ACEPTAR\s+([A-Z0-9]+)/);
  const rejectMatch = messageBody.match(/^RECHAZAR\s+([A-Z0-9]+)/);

  const shortId = acceptMatch?.[1] ?? rejectMatch?.[1];
  const action = acceptMatch ? "accept" : rejectMatch ? "reject" : null;

  if (!shortId || !action) {
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Comando no reconocido. Usá ACEPTAR XXXXXX o RECHAZAR XXXXXX.</Message></Response>`,
      { headers: { "Content-Type": "text/xml" } },
    );
  }

  const phoneNormalized = from.replace("whatsapp:", "");

  // Buscar reserva por los últimos 6 caracteres del ID
  const reservations = await prisma.reservation.findMany({
    where: { status: ReservationStatus.pending_provider },
    include: {
      inventoryUnit: {
        include: {
          provider: {
            include: { user: { select: { email: true } } },
          },
        },
      },
      advertiser: { select: { email: true } },
    },
  });

  const reservation = reservations.find((r) => r.id.slice(-6).toUpperCase() === shortId);

  if (!reservation) {
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Message>No encontré la solicitud ${shortId}. Verificá el código.</Message></Response>`,
      { headers: { "Content-Type": "text/xml" } },
    );
  }

  const newStatus = action === "accept" ? ReservationStatus.accepted : ReservationStatus.rejected;
  await prisma.reservation.update({ where: { id: reservation.id }, data: { status: newStatus } });

  // Notificar al anunciante
  sendEmail({
    type: action === "accept" ? "reservation_accepted" : "reservation_rejected",
    to: reservation.advertiser.email,
    unitName: reservation.inventoryUnit.name,
    providerName: "NextMedia",
    ...(action === "accept" ? { startsAt: reservation.startsAt, endsAt: reservation.endsAt } : {}),
  } as Parameters<typeof sendEmail>[0]).catch(() => {});

  const confirmText = action === "accept"
    ? `Reserva ${shortId} ACEPTADA. El anunciante fue notificado.`
    : `Reserva ${shortId} RECHAZADA. El anunciante fue notificado.`;

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${confirmText}</Message></Response>`,
    { headers: { "Content-Type": "text/xml" } },
  );
}
