import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** SSP: inventario DOOH en formato simplificado OpenRTB 2.x */
export async function GET() {
  const deals = await prisma.programmaticDeal.findMany({
    where: { isActive: true },
    include: {
      inventoryUnit: {
        select: {
          id: true,
          name: true,
          locationLabel: true,
          latitude: true,
          longitude: true,
          format: true,
          status: true,
          basePriceAmount: true,
          currency: true,
        },
      },
    },
  });

  const imp = deals
    .filter((d) => d.inventoryUnit.status === "published")
    .map((d) => ({
      id: d.openRtbUnitId ?? d.inventoryUnit.id,
      banner: { w: 1920, h: 1080 },
      bidfloor: Number(d.floorPrice),
      bidfloorcur: d.currency,
      ext: {
        dooh: {
          unitid: d.inventoryUnit.id,
          name: d.inventoryUnit.name,
          location: d.inventoryUnit.locationLabel,
          lat: d.inventoryUnit.latitude,
          lon: d.inventoryUnit.longitude,
          dealtype: d.dealType,
        },
      },
    }));

  return NextResponse.json({
    id: "nextplanning-ssp",
    imp,
    cur: ["ARS"],
  });
}
