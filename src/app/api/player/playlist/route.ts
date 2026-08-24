import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const deviceKey = searchParams.get("deviceKey");
  if (!deviceKey) return NextResponse.json({ error: "deviceKey requerido" }, { status: 400 });

  const screen = await prisma.screen.findUnique({
    where: { deviceKey },
    include: {
      playlists: {
        where: { publishedAt: { not: null } },
        orderBy: { publishedAt: "desc" },
        take: 1,
        include: { items: { orderBy: { order: "asc" } } },
      },
    },
  });

  if (!screen) return NextResponse.json({ error: "Pantalla no encontrada" }, { status: 404 });

  const playlist = screen.playlists[0];
  if (!playlist) {
    return NextResponse.json({ version: 0, items: [] });
  }

  return NextResponse.json({
    screenId: screen.id,
    playlistId: playlist.id,
    version: playlist.version,
    items: playlist.items.map((i) => ({
      id: i.id,
      url: i.creativeUrl,
      durationSec: i.durationSec,
      order: i.order,
    })),
  });
}
