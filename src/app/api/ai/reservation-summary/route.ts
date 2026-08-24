import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { openai } from "@/lib/openai";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const reservationId = req.nextUrl.searchParams.get("id");
  if (!reservationId) {
    return NextResponse.json({ error: "Falta el parámetro id." }, { status: 400 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "IA no configurada." }, { status: 503 });
  }

  const resv = await prisma.reservation.findFirst({
    where: {
      id: reservationId,
      inventoryUnit: {
        provider: { userId: session.user.id },
      },
    },
    include: {
      inventoryUnit: { select: { name: true, locationLabel: true, basePriceAmount: true } },
      advertiser: { select: { email: true } },
    },
  });

  if (!resv) {
    return NextResponse.json({ error: "Solicitud no encontrada." }, { status: 404 });
  }

  const prompt = `Resumí en 1-2 oraciones en español esta solicitud de reserva de espacio publicitario. Sé directo y útil para quien toma la decisión de aceptar o rechazar.

Espacio: ${resv.inventoryUnit.name} (${resv.inventoryUnit.locationLabel})
Precio de referencia: $${resv.inventoryUnit.basePriceAmount} ARS
Anunciante: ${resv.advertiser.email}
Período solicitado: ${resv.startsAt.toLocaleDateString("es-AR")} al ${resv.endsAt.toLocaleDateString("es-AR")}
Estado: ${resv.status}`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "Sos un asistente de negocio para medios publicitarios. Respondés en español rioplatense." },
      { role: "user", content: prompt },
    ],
    temperature: 0.3,
    max_tokens: 120,
  });

  const summary = completion.choices[0]?.message?.content?.trim() ?? "";
  return NextResponse.json({ summary });
}
