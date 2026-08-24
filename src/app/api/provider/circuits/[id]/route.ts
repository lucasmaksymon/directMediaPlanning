import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

async function resolveCircuitUnits(unitIds: string[]) {
  const ownedUnits = await prisma.inventoryUnit.findMany({
    where: { id: { in: unitIds } },
    select: { id: true, basePriceAmount: true, providerId: true },
  });
  if (ownedUnits.length !== unitIds.length) {
    return { error: "Algún espacio no existe.", status: 403 as const };
  }

  const providerIds = new Set(ownedUnits.map((u) => u.providerId));
  if (providerIds.size !== 1) {
    return {
      error: "Todos los espacios deben ser del mismo proveedor interno.",
      status: 400 as const,
    };
  }

  const totalPrice = ownedUnits.reduce((acc, u) => acc + Number(u.basePriceAmount), 0);
  return {
    providerId: ownedUnits[0]!.providerId,
    totalPrice,
  };
}

export async function PATCH(req: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Acceso denegado." }, { status: 403 });
  }

  const { id } = await context.params;
  const existing = await prisma.circuit.findUnique({ where: { id }, select: { id: true } });
  if (!existing) {
    return NextResponse.json({ error: "Circuito no encontrado." }, { status: 404 });
  }

  const { name, description, unitIds, isPublished } = await req.json();
  if (!name?.trim() || !Array.isArray(unitIds) || unitIds.length < 2) {
    return NextResponse.json({ error: "Nombre y al menos 2 espacios requeridos." }, { status: 400 });
  }

  const unitsResult = await resolveCircuitUnits(unitIds);
  if ("error" in unitsResult) {
    return NextResponse.json({ error: unitsResult.error }, { status: unitsResult.status });
  }

  await prisma.$transaction([
    prisma.circuitUnit.deleteMany({ where: { circuitId: id } }),
    prisma.circuit.update({
      where: { id },
      data: {
        providerId: unitsResult.providerId,
        name: name.trim(),
        description: description || null,
        isPublished: Boolean(isPublished),
        totalPrice: unitsResult.totalPrice,
        units: {
          create: unitIds.map((unitId: string, order: number) => ({ unitId, order })),
        },
      },
    }),
  ]);

  return NextResponse.json({ id });
}
