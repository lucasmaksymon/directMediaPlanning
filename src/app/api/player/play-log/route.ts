import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const body = await req.json();
  const { deviceKey, creativeUrl, playlistItemId, durationSec } = body;

  if (!deviceKey || !creativeUrl) {
    return NextResponse.json({ error: "deviceKey y creativeUrl requeridos" }, { status: 400 });
  }

  const screen = await prisma.screen.findUnique({ where: { deviceKey } });
  if (!screen) return NextResponse.json({ error: "Pantalla no encontrada" }, { status: 404 });

  await prisma.playLog.create({
    data: {
      screenId: screen.id,
      creativeUrl,
      playlistItemId: playlistItemId ?? null,
      durationSec: durationSec ?? null,
    },
  });

  // Auto PoP: si hay reserva confirmada activa para la unidad vinculada
  if (screen.inventoryUnitId) {
    const now = new Date();
    const activeResv = await prisma.reservation.findFirst({
      where: {
        inventoryUnitId: screen.inventoryUnitId,
        status: "confirmed",
        startsAt: { lte: now },
        endsAt: { gte: now },
      },
    });
    if (activeResv) {
      await prisma.proofOfPlay.upsert({
        where: { reservationId: activeResv.id },
        create: {
          reservationId: activeResv.id,
          status: "submitted",
          notes: `Play log automático: ${creativeUrl}`,
          submittedAt: new Date(),
        },
        update: {
          status: "submitted",
          submittedAt: new Date(),
        },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
