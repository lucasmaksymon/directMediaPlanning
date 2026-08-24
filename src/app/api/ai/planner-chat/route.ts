import { auth } from "@/auth";
import { openai } from "@/lib/openai";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

type Message = { role: "user" | "assistant"; content: string };

type UnitRow = {
  id: string;
  name: string;
  locationLabel: string;
  format: string;
  basePriceAmount: { toString(): string };
  latitude: number | null;
  longitude: number | null;
  instantBookEnabled: boolean;
  lastMinuteEnabled: boolean;
  lastMinuteDiscountPercent: number;
  provider: { companyName: string };
};

/* ─────────────────────────────────────────────────────────────
   Extrae señales del brief desde los mensajes de la conversación
   ───────────────────────────────────────────────────────────── */
function parseBrief(messages: Message[]) {
  const text = messages.map((m) => m.content).join(" ").toLowerCase();

  // Presupuesto: detecta "5 millones", "500k", "2.000.000", "$800000", etc.
  let presupuesto: number | null = null;
  const budgetRe = /(?:\$\s*)?([\d.,]+)\s*(millon(?:es)?|k\b|mil\b)?/gi;
  let bm: RegExpExecArray | null;
  while ((bm = budgetRe.exec(text)) !== null) {
    const raw = parseFloat(bm[1].replace(/\./g, "").replace(",", "."));
    if (isNaN(raw) || raw <= 0) continue;
    const suffix = (bm[2] ?? "").toLowerCase();
    const n = suffix.startsWith("millon") ? raw * 1_000_000
            : suffix === "k" || suffix.startsWith("mil") ? raw * 1_000
            : raw;
    if (n >= 10_000) { presupuesto = n; break; }
  }

  // Zona: keywords geográficos
  const ZONE_KEYWORDS = [
    "palermo", "belgrano", "recoleta", "microcentro", "san telmo",
    "retiro", "puerto madero", "caballito", "almagro", "villa crespo",
    "flores", "boedo", "núñez", "nuñez", "saavedra", "chacarita",
    "once", "congreso", "liniers", "mataderos", "barracas", "la boca",
    "subte", "línea a", "linea a", "línea b", "linea b",
    "caba", "capital federal", "capital", "ciudad de buenos aires",
    "gba", "zona norte", "zona sur", "zona oeste", "conurbano",
    "san isidro", "vicente lópez", "vicente lopez", "tigre", "pilar",
    "nordelta", "martínez", "martinez", "acassuso",
    "quilmes", "lomas de zamora", "avellaneda", "la plata", "banfield",
    "morón", "moron", "haedo", "san martín gba", "hurlingham",
    "córdoba", "cordoba", "rosario", "mendoza", "mar del plata",
    "tucumán", "tucuman", "salta", "jujuy", "bariloche", "neuquén", "neuquen",
    "santa fe", "paraná", "parana", "corrientes", "posadas",
    "bahía blanca", "bahia blanca", "tandil",
    "nacional", "federal", "interior", "todo el país", "todo el pais",
  ];
  const zonas = ZONE_KEYWORDS.filter((z) => text.includes(z));

  // Audiencia: clasifica en segmentos
  const esABC1 = /abc1|premium|lujo|ejecutiv|alta gama|vip|corporativ/.test(text);
  const esJoven = /jov[e]|millennial|centennial|18.?35|18.?30|25.?35|estudiante/.test(text);
  const esFamiliar = /famil|niño|hijo|hogar/.test(text);
  const esMasivo = /masiv|popular|class[e ]? media|trabaj/.test(text);

  // Objetivo: clasifica la intención
  const esLanzamiento = /lanzamiento|launch|nuevo producto|nueva línea|awareness|reconocimiento/.test(text);
  const esTrafico = /tráfico|trafico|visita|local|restaurant|comercio|tienda/.test(text);
  const esNacional = /nacional|federal|todo el país|todas las ciudades|interior/.test(text);

  return { presupuesto, zonas, esABC1, esJoven, esFamiliar, esMasivo, esLanzamiento, esTrafico, esNacional };
}

/* ─────────────────────────────────────────────────────────────
   Pre-filtra y rankea unidades según el brief
   ───────────────────────────────────────────────────────────── */
function filterUnits(units: UnitRow[], brief: ReturnType<typeof parseBrief>): UnitRow[] {
  const { presupuesto, zonas, esABC1, esJoven, esNacional } = brief;

  // Máximo precio por unidad: si hay presupuesto, descartamos lo que solo
  // con 1 unidad ya agota más del 70% del presupuesto (salvo campañas ABC1)
  const maxUnitPrice = presupuesto
    ? presupuesto * (esABC1 ? 0.9 : 0.70)
    : Infinity;

  let pool = units.filter((u) => Number(u.basePriceAmount.toString()) <= maxUnitPrice);
  if (pool.length < 5) pool = units; // fallback: no filtrar por precio

  // Si hay zonas específicas, priorizar las que coincidan
  if (zonas.length > 0 && !esNacional) {
    const matching = pool.filter((u) => {
      const hay = (u.locationLabel + " " + u.name).toLowerCase();
      return zonas.some((z) => hay.includes(z));
    });
    if (matching.length >= 5) pool = matching;
  }

  // Ordenar por relevancia: coincidencias de zona primero, luego por precio asc
  pool.sort((a, b) => {
    const scoreA = zonas.filter((z) => (a.locationLabel + a.name).toLowerCase().includes(z)).length;
    const scoreB = zonas.filter((z) => (b.locationLabel + b.name).toLowerCase().includes(z)).length;
    if (scoreB !== scoreA) return scoreB - scoreA;
    return Number(a.basePriceAmount.toString()) - Number(b.basePriceAmount.toString());
  });

  // Limitar a 80 unidades para no saturar el contexto del modelo
  return pool.slice(0, 80);
}

/* ─────────────────────────────────────────────────────────────
   Etiquetas de audiencia para enriquecer el contexto del modelo
   ───────────────────────────────────────────────────────────── */
function audienceTag(u: UnitRow): string {
  const loc = (u.locationLabel + " " + u.name).toLowerCase();
  const tags: string[] = [];

  if (/recoleta|palermo chico|puerto madero|catalinas|alto palermo|ezeiza|aeroparque|unicenter|shopping/.test(loc)) tags.push("ABC1");
  if (/palermo|belgrano|núñez|colegiales|chacarita|villa crespo/.test(loc)) tags.push("jóvenes-profesionales");
  if (/subte|constitución|once|flores|liniers|avellaneda|lanús|quilmes|morón/.test(loc)) tags.push("masivo");
  if (/gba|conurbano|nordelta|pilar|tigre|san isidro/.test(loc)) tags.push("familias-GBA");
  if (/universidad|nueva córdoba|caballito|almagro/.test(loc)) tags.push("estudiantes");
  if (/autopista|panamericana|acceso|ruta/.test(loc)) tags.push("tráfico-vehicular");
  if (/turismo|balneario|casino|rambla|cataratas|bariloche/.test(loc)) tags.push("turismo");

  if (u.instantBookEnabled) tags.push("INSTANT-BOOK");
  if (u.lastMinuteEnabled) tags.push(`LAST-MINUTE-${u.lastMinuteDiscountPercent}%`);

  return tags.length ? `[${tags.join(", ")}]` : "";
}

/* ─────────────────────────────────────────────────────────────
   Handler principal
   ───────────────────────────────────────────────────────────── */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "advertiser") {
    return NextResponse.json({ error: "Solo anunciantes." }, { status: 401 });
  }
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "IA no configurada." }, { status: 503 });
  }

  const { messages }: { messages: Message[] } = await req.json();

  const allUnits = await prisma.inventoryUnit.findMany({
    where: { status: "published" },
    select: {
      id: true, name: true, locationLabel: true, format: true,
      basePriceAmount: true, latitude: true, longitude: true,
      instantBookEnabled: true, lastMinuteEnabled: true, lastMinuteDiscountPercent: true,
      provider: { select: { companyName: true } },
    },
    orderBy: { basePriceAmount: "asc" },
  }) as UnitRow[];

  const brief = parseBrief(messages);
  const filtered = filterUnits(allUnits, brief);

  const catalogContext = filtered.map((u) => {
    const price = Number(u.basePriceAmount.toString());
    const priceStr = price >= 1_000_000
      ? `$${(price / 1_000_000).toFixed(1)}M`
      : `$${Math.round(price / 1000)}k`;
    const tag = audienceTag(u);
    return `ID:${u.id} | ${u.name} | ${u.locationLabel} | ${u.format} | ${priceStr} ARS/sem | ${u.provider.companyName} ${tag}`.trim();
  }).join("\n");

  const presupuestoHint = brief.presupuesto
    ? `El anunciante indicó un presupuesto de $${brief.presupuesto.toLocaleString("es-AR")} ARS.`
    : "No se mencionó presupuesto aún — preguntalo si no lo sabés.";

  const systemPrompt = `Sos el planificador de campañas OOH de NextPlanning operado por NextMedia en Argentina. Tu rol es diseñar planes de medios inteligentes y personalizados con inventario NextMedia.

${presupuestoHint}

═══ CÓMO RAZONAR PARA HACER RECOMENDACIONES ═══

1. OBJETIVO → FORMATO
   - Awareness / lanzamiento → priorizar pantallas LED de alto tráfico (autopistas, Obelisco, Retiro, subte) + al menos 1 digital en zona
   - Tráfico local / pyme → máximo 3-4 espacios en el radio exacto del negocio
   - Campaña nacional → mezclar CABA + 2-3 ciudades del interior relevantes
   - Branding premium → solo zonas ABC1 (Recoleta, Puerto Madero, shoppings premium, aeropuertos)

2. AUDIENCIA → UBICACIÓN
   - ABC1 / premium → Recoleta, Puerto Madero, Belgrano R, Alto Palermo, Unicenter, Aeroparque
   - Jóvenes 18-35 → Palermo Soho/Hollywood, Villa Crespo, Chacarita, subte línea D/H
   - Masivo / consumo popular → Once, Flores, Constitución, subte A/B, GBA centro
   - Familias GBA → Nordelta, Pilar, San Isidro, Quilmes, Morón, shoppings GBA
   - Tráfico vehicular → Panamericana, Acceso Oeste, Autopista 25 de Mayo, General Paz

3. PRESUPUESTO → CANTIDAD DE ESPACIOS
   - Menos de $500k → 2-3 espacios concentrados en zona específica
   - $500k–$1.5M → 3-5 espacios mixtos (1-2 zonas)
   - $1.5M–$4M → 5-8 espacios con cobertura más amplia
   - Más de $4M → 8+ espacios, campaña nacional o multi-formato posible

4. MIX DE FORMATOS
   - Nunca recomendes solo un tipo: combiná digital_ooh (impacto visual) + static_ooh (recordación) cuando el presupuesto lo permite
   - Si el presupuesto alcanza, incluir al menos 1 unidad de subte para contacto de frecuencia
   - Los digital_package son para cuando querés cobertura geográfica eficiente con una sola compra

5. DIVERSIDAD DE UBICACIONES
   - No concentres más de 3 espacios en el mismo barrio o zona
   - Buscá complementariedad: espacios que lleguen al consumidor en distintos momentos del día y del trayecto

6. CÓMO PRESENTAR LA RECOMENDACIÓN
   - Para cada espacio mostrá: número, nombre, ubicación, formato, precio/sem y 1 frase de motivo
   - NO incluyas el ID en el texto visible de cada ítem
   - Calculá el presupuesto total estimado y cuánto queda de margen
   - Al final de toda la respuesta, en la última línea, poné TODOS los IDs juntos en un único bloque: [[id1,id2,id3,...]]
   - Si hay unidades con INSTANT-BOOK o LAST-MINUTE, mencionalo como ventaja en el ítem correspondiente

═══ CATÁLOGO DISPONIBLE (pre-filtrado por zona/presupuesto) ═══
${catalogContext}

═══ COMPRA PROGRAMÁTICA (DSP) ═══
- Si el usuario pide compra programática, RTB o inventario vía SSP, explicá que NextPlanning también ofrece inventario en /api/programmatic/openrtb/v2/inventory con deals open/PMP/PG, pero la reserva directa del catálogo sigue siendo la vía principal para cerrar campañas en Argentina.

═══ INSTRUCCIONES GENERALES ═══
- Hacé preguntas solo si te falta información clave (objetivo, zona, presupuesto o fechas)
- Si ya tenés todo, pasá directo a la recomendación
- Sé conciso y profesional, con lenguaje argentino informal-profesional
- Respondé siempre en español`;

  const stream = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      ...messages,
    ],
    temperature: 0.4,
    stream: true,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content ?? "";
          if (text) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
