import { auth } from "@/auth";
import { openai } from "@/lib/openai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  if (session.user.role !== "advertiser" && session.user.role !== "admin") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const { imageUrl, unitFormat, unitName } = await req.json();

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "IA no configurada." }, { status: 503 });
  }

  if (!imageUrl) {
    return NextResponse.json({ error: "Imagen requerida." }, { status: 400 });
  }

  const formatContext: Record<string, string> = {
    digital_ooh: "pantalla LED digital de vía pública (relación típica 16:9 o 9:16, alta luminosidad, texto debe ser legible a 50m de distancia)",
    static_ooh: "valla estática OOH (impresión de gran formato, sin animación, texto debe ser legible a 100m)",
    digital_package: "pantalla digital combinada",
  };

  const prompt = `Sos un experto en diseño y producción de creativos OOH (publicidad exterior). Validá este arte para un ${formatContext[unitFormat] ?? "espacio OOH"} llamado "${unitName}".

Analizá:
1. CONTRASTE: ¿Hay suficiente contraste entre texto y fondo?
2. LEGIBILIDAD: ¿El texto es legible a distancia?
3. SIMPLEZA: ¿Hay demasiada información para una valla?
4. MENSAJE: ¿El mensaje principal se lee en menos de 3 segundos?
5. COLORES: ¿Los colores funcionan bien en exterior (luz solar, noche)?

Respondé SOLO con este JSON sin markdown:
{
  "score": 85,
  "approved": true,
  "issues": ["Lista de problemas detectados, vacía si no hay"],
  "suggestions": ["Lista de sugerencias de mejora"],
  "summary": "Resumen de 1-2 oraciones sobre la calidad del arte"
}`;

  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: imageUrl, detail: "auto" } },
        ],
      }],
      temperature: 0.3,
      max_tokens: 500,
      response_format: { type: "json_object" },
    });

    const text = res.choices[0]?.message?.content ?? "";
    // Extraer JSON aunque venga envuelto en markdown (```json ... ```)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[creative-validation] Respuesta inesperada de OpenAI:", text);
      return NextResponse.json({ error: "La IA devolvió una respuesta inesperada." }, { status: 500 });
    }
    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json(parsed);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[creative-validation] Error:", msg);
    return NextResponse.json({ error: `Error al analizar el creativo: ${msg}` }, { status: 500 });
  }
}
