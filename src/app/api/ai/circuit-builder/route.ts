import { auth } from "@/auth";
import { openai } from "@/lib/openai";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "provider" && session.user.role !== "admin")) {
    return NextResponse.json({ error: "Sin permiso." }, { status: 401 });
  }

  const { unitIds } = await req.json();
  if (!Array.isArray(unitIds) || unitIds.length < 2) {
    return NextResponse.json({ error: "Necesitás al menos 2 espacios." }, { status: 400 });
  }

  const units = await prisma.inventoryUnit.findMany({
    where: { id: { in: unitIds } },
    select: { name: true, locationLabel: true, format: true, latitude: true, longitude: true },
  });

  const unitsText = units.map((u) => `- ${u.name} (${u.locationLabel}, ${u.format})`).join("\n");

  const prompt = `Sos un experto en publicidad OOH argentina. Creás circuitos de venta de espacios publicitarios.

ESPACIOS DEL CIRCUITO:
${unitsText}

Generá un nombre comercial atractivo y una descripción comercial para vender este circuito como un producto único.

Respondé SOLO con este JSON sin markdown:
{
  "name": "Circuito XYZ",
  "description": "Descripción de 2-3 oraciones que explique la cobertura, zonas, perfil de audiencia y por qué es valioso.",
  "coverage": "Resumen geográfico breve (ej: 'Centro y norte de Buenos Aires')"
}`;

  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.6,
    });

    const text = res.choices[0]?.message?.content ?? "";
    const parsed = JSON.parse(text);
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: "Error al generar descripción." }, { status: 500 });
  }
}
