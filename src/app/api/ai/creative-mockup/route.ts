import { openai } from "@/lib/openai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { locationLabel, unitName, unitFormat, description } = await req.json();

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "IA no configurada." }, { status: 503 });
  }

  const formatContext: Record<string, string> = {
    digital_ooh: "pantalla LED digital",
    static_ooh: "valla publicitaria estática",
    digital_package: "pantalla digital",
  };

  const prompt = `Genera un mockup fotorrealista de una ${formatContext[unitFormat] ?? "valla"} publicitaria ubicada en ${locationLabel}, Argentina. 
El espacio se llama "${unitName}". ${description ? `Contexto: ${description}.` : ""}
La valla debe mostrarse en su entorno urbano real, con tráfico o peatones de fondo. 
La pantalla/valla debe estar en blanco o con un diseño genérico de "TU MARCA AQUÍ" para ilustrar el espacio.
Estilo fotorrealista, hora del día natural, buena iluminación.`;

  try {
    const res = await openai.images.generate({
      model: "dall-e-3",
      prompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
    });

    const imageUrl = res.data?.[0]?.url;
    if (!imageUrl) throw new Error("No image generated");

    return NextResponse.json({ imageUrl });
  } catch (err) {
    return NextResponse.json({ error: "No se pudo generar el mockup. Intentá de nuevo." }, { status: 500 });
  }
}
