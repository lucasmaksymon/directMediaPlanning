import { auth } from "@/auth";
import { openai } from "@/lib/openai";
import { prisma } from "@/lib/prisma";
import { getNearbyPOIs, estimateWeeklyAudience, estimateCPM } from "@/lib/audience";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const unitId = searchParams.get("unitId");
  if (!unitId) return NextResponse.json({ error: "unitId requerido." }, { status: 400 });

  const unit = await prisma.inventoryUnit.findUnique({
    where: { id: unitId, status: "published" },
    select: {
      id: true,
      latitude: true,
      longitude: true,
      format: true,
      locationLabel: true,
      basePriceAmount: true,
      metadata: true,
    },
  });
  if (!unit) return NextResponse.json({ error: "Unidad no encontrada." }, { status: 404 });
  if (!unit.latitude || !unit.longitude) {
    return NextResponse.json({ error: "La unidad no tiene coordenadas." }, { status: 400 });
  }

  const pois = await getNearbyPOIs(unit.latitude, unit.longitude);
  const weeklyAudience = estimateWeeklyAudience(pois, unit.format);
  const cpm = estimateCPM(Number(unit.basePriceAmount), weeklyAudience);

  const meta =
    unit.metadata && typeof unit.metadata === "object"
      ? (unit.metadata as Record<string, unknown>)
      : {};
  if (!String(meta.impacto ?? "").trim()) {
    const { ensureInventoryImpacto } = await import("@/lib/inventory/estimate-impacto");
    void ensureInventoryImpacto(unit.id);
  }

  // AI insight
  let aiInsight = "";
  if (process.env.OPENAI_API_KEY) {
    try {
      const prompt = `Sos experto en publicidad OOH argentina. Analizá esta ubicación:

Zona: ${unit.locationLabel}
POIs cercanos (400m): ${pois.total} puntos de interés
- Transporte: ${pois.transit}
- Comercios: ${pois.commerce}
- Educación: ${pois.education}
- Salud: ${pois.health}
- Entretenimiento: ${pois.entertainment}
Audiencia semanal estimada: ${weeklyAudience.toLocaleString("es-AR")} personas
CPM referencial: $${cpm}

Describí en 2-3 oraciones el perfil de audiencia y si esta ubicación es buena para marcas masivas, premium o de nicho.`;

      const res = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
        max_tokens: 150,
      });
      aiInsight = res.choices[0]?.message?.content ?? "";
    } catch {}
  }

  return NextResponse.json({ pois, weeklyAudience, cpm, aiInsight });
}
