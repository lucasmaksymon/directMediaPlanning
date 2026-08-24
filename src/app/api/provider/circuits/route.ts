import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Acceso denegado." }, { status: 403 });
  }

  const { name, description, unitIds, isPublished } = await req.json();
  if (!name || !Array.isArray(unitIds) || unitIds.length < 2) {
    return NextResponse.json({ error: "Nombre y al menos 2 espacios requeridos." }, { status: 400 });
  }

  const ownedUnits = await prisma.inventoryUnit.findMany({
    where: { id: { in: unitIds } },
    select: { id: true, basePriceAmount: true, providerId: true },
  });
  if (ownedUnits.length !== unitIds.length) {
    return NextResponse.json({ error: "Algún espacio no existe." }, { status: 403 });
  }

  const providerIds = new Set(ownedUnits.map((u) => u.providerId));
  if (providerIds.size !== 1) {
    return NextResponse.json({ error: "Todos los espacios deben ser del mismo proveedor interno." }, { status: 400 });
  }
  const providerId = ownedUnits[0]!.providerId;

  const totalPrice = ownedUnits.reduce((acc, u) => acc + Number(u.basePriceAmount), 0);

  const circuit = await prisma.circuit.create({
    data: {
      providerId,
      name,
      description: description || null,
      isPublished: Boolean(isPublished),
      totalPrice,
      units: {
        create: unitIds.map((id: string, i: number) => ({ unitId: id, order: i })),
      },
    },
  });

  return NextResponse.json({ id: circuit.id });
}
