"use server";

import { auth } from "@/auth";
import { openai } from "@/lib/openai";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

/* ---- Tipos públicos ---- */

export type PlannerBrief = {
  objetivo: string;
  zona: string;
  presupuesto: number;
  fechaInicio: string;
  fechaFin: string;
  audiencia?: string;
};

export type UnitRecommendation = {
  unitId: string;
  score: number;
  justificacion: string;
};

export type PlannerResult =
  | { ok: true; recomendaciones: UnitRecommendation[]; presupuestoEstimado: number; resumen: string }
  | { ok: false; error: string };

/* ---- Esquema zod para parsear la respuesta de OpenAI ---- */

const RecommendationSchema = z.object({
  recomendaciones: z.array(
    z.object({
      unitId: z.string(),
      score: z.number().min(0).max(10),
      justificacion: z.string(),
    }),
  ),
  presupuestoEstimado: z.number(),
  resumen: z.string(),
});

/* ---- Server Action ---- */

export async function getPlannerRecommendations(brief: PlannerBrief): Promise<PlannerResult> {
  const session = await auth();
  if (!session?.user || session.user.role !== "advertiser") {
    return { ok: false, error: "Debés iniciar sesión como anunciante." };
  }

  if (!process.env.OPENAI_API_KEY) {
    return { ok: false, error: "El servicio de IA no está configurado. Agregá OPENAI_API_KEY al entorno." };
  }

  /* Traer unidades disponibles en el rango de fechas */
  const fechaInicio = new Date(`${brief.fechaInicio}T00:00:00.000Z`);
  const fechaFin = new Date(`${brief.fechaFin}T23:59:59.999Z`);

  const units = await prisma.inventoryUnit.findMany({
    where: {
      status: "published",
      basePriceAmount: { lte: brief.presupuesto },
      ...(brief.zona.trim()
        ? {
            OR: [
              { locationLabel: { contains: brief.zona, mode: "insensitive" } },
              { name: { contains: brief.zona, mode: "insensitive" } },
            ],
          }
        : {}),
      NOT: {
        reservations: {
          some: {
            status: { in: ["pending_provider", "accepted", "payment_pending", "confirmed"] },
            startsAt: { lt: fechaFin },
            endsAt: { gt: fechaInicio },
          },
        },
      },
    },
    take: 40,
    orderBy: { basePriceAmount: "asc" },
  });

  if (units.length === 0) {
    return {
      ok: false,
      error: "No hay espacios disponibles con esos criterios. Probá ampliar la zona, las fechas o el presupuesto.",
    };
  }

  const unitsContext = units
    .map(
      (u) =>
        `ID: ${u.id} | Nombre: ${u.name} | Zona: ${u.locationLabel} | Formato: ${u.format} | Precio/ref: $${u.basePriceAmount} ARS`,
    )
    .join("\n");

  const systemPrompt = `Sos un experto en planificación de medios OOH (Out-of-Home) en Argentina.
Tu tarea es seleccionar la mejor combinación de espacios publicitarios para un brief dado.
REGLA CRÍTICA: La suma de los precios de los espacios seleccionados NO debe superar el presupuesto total indicado en el brief.
Respondé ÚNICAMENTE con un JSON válido siguiendo el esquema exacto indicado. Sin markdown, sin explicaciones extra.`;

  const userPrompt = `BRIEF DEL ANUNCIANTE:
- Objetivo: ${brief.objetivo}
- Zona/mercado: ${brief.zona}
- Presupuesto MÁXIMO (no superar): $${brief.presupuesto.toLocaleString("es-AR")} ARS
- Período: ${brief.fechaInicio} al ${brief.fechaFin}
- Audiencia objetivo: ${brief.audiencia ?? "general"}

ESPACIOS DISPONIBLES (máx. ${units.length}):
${unitsContext}

INSTRUCCIONES:
1. Seleccioná entre 2 y 6 espacios que mejor se adapten al brief.
2. La suma total de precios NO debe superar $${brief.presupuesto.toLocaleString("es-AR")} ARS.
3. Priorizá: diversidad de zonas, impacto para la audiencia objetivo, eficiencia de presupuesto (maximizar alcance).
4. Asigná score de 0-10 a cada espacio según ajuste al brief.
5. Justificá brevemente por qué cada espacio fue elegido.

Respondé SOLO con este JSON:
{
  "recomendaciones": [
    { "unitId": "<id>", "score": <0-10>, "justificacion": "<por qué este espacio encaja con el brief>" }
  ],
  "presupuestoEstimado": <suma exacta de precios de referencia seleccionados>,
  "resumen": "<2-3 oraciones resumiendo la estrategia propuesta y el uso del presupuesto>"
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.4,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const parsed = RecommendationSchema.safeParse(JSON.parse(raw));

    if (!parsed.success) {
      return { ok: false, error: "La IA devolvió una respuesta inesperada. Intentá de nuevo." };
    }

    /* Filtrar que los IDs existan en las unidades que le pasamos */
    const validIds = new Set(units.map((u) => u.id));
    const recomendaciones = parsed.data.recomendaciones.filter((r) => validIds.has(r.unitId));

    return {
      ok: true,
      recomendaciones,
      presupuestoEstimado: parsed.data.presupuestoEstimado,
      resumen: parsed.data.resumen,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Error al consultar la IA: ${msg}` };
  }
}
