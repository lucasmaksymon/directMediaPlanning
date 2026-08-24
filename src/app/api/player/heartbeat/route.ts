import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const { deviceKey } = await req.json();
  if (!deviceKey || typeof deviceKey !== "string") {
    return NextResponse.json({ error: "deviceKey requerido" }, { status: 400 });
  }

  const screen = await prisma.screen.updateMany({
    where: { deviceKey },
    data: { lastHeartbeat: new Date(), isOnline: true },
  });

  if (screen.count === 0) {
    return NextResponse.json({ error: "Pantalla no registrada" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
