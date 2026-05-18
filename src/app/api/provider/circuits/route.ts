import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getProviderProfileByUserId } from "@/lib/provider";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const profile = await getProviderProfileByUserId(session.user.id);
  if (!profile) return NextResponse.json({ error: "Sin perfil de proveedor." }, { status: 403 });

  const { name, description, unitIds, isPublished } = await req.json();
  if (!name || !Array.isArray(unitIds) || unitIds.length < 2) {
    return NextResponse.json({ error: "Nombre y al menos 2 espacios requeridos." }, { status: 400 });
  }

  // Verificar que las unidades son del proveedor
  const ownedUnits = await prisma.inventoryUnit.findMany({
    where: { id: { in: unitIds }, providerId: profile.id },
    select: { id: true, basePriceAmount: true },
  });
  if (ownedUnits.length !== unitIds.length) {
    return NextResponse.json({ error: "Algún espacio no te pertenece." }, { status: 403 });
  }

  const totalPrice = ownedUnits.reduce((acc, u) => acc + Number(u.basePriceAmount), 0);

  const circuit = await prisma.circuit.create({
    data: {
      providerId: profile.id,
      name,
      description: description || null,
      isPublished: Boolean(isPublished),
      totalPrice,
      units: {
        create: unitIds.map((id: string, i: number) => ({ unitId: id, order: i })),
      },
    },
  });

  return NextResponse.json({ ok: true, id: circuit.id });
}
