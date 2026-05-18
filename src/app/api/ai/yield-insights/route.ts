import { auth } from "@/auth";
import { openai } from "@/lib/openai";
import { prisma } from "@/lib/prisma";
import { getProviderProfileByUserId } from "@/lib/provider";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const profile = await getProviderProfileByUserId(session.user.id);
  if (!profile && session.user.role !== "admin") return NextResponse.json({ error: "Sin perfil." }, { status: 403 });

  if (!profile) return NextResponse.json({ insights: [] });

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ insights: ["Configurá OPENAI_API_KEY para habilitar el análisis IA."] });
  }

  const units = await prisma.inventoryUnit.findMany({
    where: { providerId: profile.id },
    select: {
      name: true,
      basePriceAmount: true,
      status: true,
      reservations: {
        select: { status: true, startsAt: true, endsAt: true, agreedAmount: true },
      },
    },
  });

  const now = new Date();
  const ninety = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  const summary = units.map((u) => {
    const activeReservations = u.reservations.filter((r) =>
      ["accepted", "payment_pending", "confirmed"].includes(r.status) &&
      new Date(r.startsAt) >= ninety,
    );
    const totalDays = 90;
    const occupiedDays = activeReservations.reduce((acc, r) => {
      const start = Math.max(new Date(r.startsAt).getTime(), ninety.getTime());
      const end = Math.min(new Date(r.endsAt).getTime(), now.getTime());
      if (end <= start) return acc;
      return acc + Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    }, 0);
    const fillRate = Math.min(100, Math.round((occupiedDays / totalDays) * 100));
    const revenue = activeReservations.reduce((acc, r) => acc + Number(r.agreedAmount ?? u.basePriceAmount), 0);
    return { name: u.name, fillRate, revenue, status: u.status, totalReservations: u.reservations.length };
  });

  const context = summary.map((u) => `- ${u.name}: fill rate ${u.fillRate}%, ingresos $${u.revenue.toLocaleString("es-AR")} (90d), ${u.totalReservations} reservas`).join("\n");

  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: `Sos un experto en yield management de publicidad OOH argentina. Analizá el rendimiento de estos espacios:

${context}

Generá exactamente 4 recomendaciones accionables y específicas para mejorar la ocupación e ingresos. Sé directo y concreto.

Respondé SOLO con un JSON array de strings:
["Recomendación 1", "Recomendación 2", "Recomendación 3", "Recomendación 4"]`,
      }],
      temperature: 0.5,
    });
    const text = res.choices[0]?.message?.content ?? "[]";
    const insights = JSON.parse(text);
    return NextResponse.json({ insights, summary });
  } catch {
    return NextResponse.json({ insights: ["No se pudieron generar insights en este momento."], summary });
  }
}
