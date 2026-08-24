import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** Endpoint RTB simplificado: recibe bid request y responde con oferta si hay deal activo */
export async function POST(req: Request) {
  const body = await req.json();
  const impId = body?.imp?.[0]?.id ?? body?.imp?.[0]?.ext?.dooh?.unitid;
  if (!impId) return NextResponse.json({ nbr: 2 }); // invalid request

  const unitId = String(impId);
  const deal = await prisma.programmaticDeal.findFirst({
    where: { inventoryUnitId: unitId, isActive: true, dealType: "open" },
    include: { inventoryUnit: true },
  });

  if (!deal || deal.inventoryUnit.status !== "published") {
    return NextResponse.json({ nbr: 1 }); // no bid
  }

  const bidPrice = Number(deal.floorPrice) * 1.1;

  return NextResponse.json({
    id: `bid_${Date.now()}`,
    seatbid: [
      {
        bid: [
          {
            id: `bid_${unitId}`,
            impid: impId,
            price: bidPrice,
            adm: deal.inventoryUnit.name,
            crid: unitId,
          },
        ],
      },
    ],
    cur: "ARS",
  });
}
