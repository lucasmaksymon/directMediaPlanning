import { auth } from "@/auth";
import { openai } from "@/lib/openai";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "admin")) {
    return NextResponse.json({ error: "Sin permiso." }, { status: 401 });
  }

  const { locationLabel, format, basePriceAmount } = await req.json();

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "IA no configurada." }, { status: 503 });
  }

  // Obtener precios de unidades similares para contexto
  const similarUnits = await prisma.inventoryUnit.findMany({
    where: { status: "published", format },
    select: { basePriceAmount: true, locationLabel: true },
    take: 20,
    orderBy: { basePriceAmount: "asc" },
  });

  const pricesContext = similarUnits.map((u) => `${u.locationLabel}: $${u.basePriceAmount} ARS`).join("\n");

  const prompt = `Sos un experto en publicidad OOH (Out of Home) argentina.

DATOS DEL NUEVO ESPACIO:
- Ubicación: ${locationLabel}
- Formato: ${format}
- Precio actual del propietario: $${basePriceAmount} ARS

PRECIOS DE REFERENCIA (espacios similares publicados):
${pricesContext || "Sin datos de referencia disponibles."}

Analizá el precio actual y recomendá un precio de lista sugerido. Considerá:
- Zona/ubicación y visibilidad estimada
- Formato y tipo de espacio
- Precios de referencia del mercado
- Estacionalidad (mercado OOH argentino)

Respondé SOLO con este JSON sin markdown:
{
  "suggestedPrice": 150000,
  "confidence": "alta",
  "reasoning": "Breve explicación de 1-2 oraciones",
  "delta": "+15%"
}`;

  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 200,
    });

    const text = res.choices[0]?.message?.content ?? "";
    const parsed = JSON.parse(text);
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: "No se pudo generar sugerencia." }, { status: 500 });
  }
}
