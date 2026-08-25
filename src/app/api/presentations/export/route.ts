import { z } from "zod";
import { auth } from "@/auth";
import { renderToBuffer } from "@react-pdf/renderer";
import { CLIENT_BRAND } from "@/lib/brand";
import { prisma } from "@/lib/prisma";
import { PresentationDocument } from "@/lib/presentations/presentation-document";
import { buildPresentationPptx } from "@/lib/presentations/pptx";
import { withResolvedImages } from "@/lib/presentations/resolve-image";
import { normalizePresentationTheme } from "@/lib/presentations/theme";
import type { PresentationDeck } from "@/lib/presentations/types";

export const runtime = "nodejs";

const bodySchema = z.object({
  format: z.enum(["pdf", "pptx"]),
  title: z.string().min(1).max(200),
  subtitle: z.string().max(500).default(""),
  theme: z.enum(["light", "dark"]).optional(),
  highlights: z
    .array(
      z.object({
        value: z.string().max(80),
        label: z.string().max(80),
      }),
    )
    .max(3)
    .default([]),
  closingLine: z.string().max(300).optional(),
  contactLines: z.array(z.string().max(200)).max(6).optional(),
  slides: z
    .array(
      z.object({
        unitId: z.string().min(1),
        slideTitle: z.string().min(1).max(120),
        location: z.string().max(300),
        medida: z.string().max(200).optional(),
        encendido: z.string().max(200).optional(),
        exposicion: z.string().max(200).optional(),
        resolucion: z.string().max(200).optional(),
      }),
    )
    .min(1)
    .max(80),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "No autenticado." }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return Response.json({ error: "Sin permiso." }, { status: 403 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json(
      { error: "Datos inválidos.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const unitIds = input.slides.map((s) => s.unitId);
  const units = await prisma.inventoryUnit.findMany({
    where: { id: { in: unitIds } },
    select: {
      id: true,
      name: true,
      imageUrls: true,
      provider: { select: { companyName: true } },
    },
  });
  const byId = new Map(units.map((u) => [u.id, u]));

  const missing = unitIds.filter((id) => !byId.has(id));
  if (missing.length > 0) {
    return Response.json(
      { error: `Unidades no encontradas: ${missing.slice(0, 5).join(", ")}` },
      { status: 404 },
    );
  }

  const slideInputs = input.slides.map((s) => {
    const unit = byId.get(s.unitId)!;
    return {
      ...s,
      imageUrl: unit.imageUrls[0] ?? null,
      providerName: unit.provider.companyName,
      unitName: unit.name,
    };
  });

  // Siempre data URI + dimensiones naturales:
  // - PDF: en Windows las rutas locales no se embeden
  // - PPTX: sizing:cover necesita el aspect ratio real (si no, deforma)
  const slides = await withResolvedImages(slideInputs, "dataUri");

  const deck: PresentationDeck = {
    title: input.title.trim(),
    subtitle: input.subtitle.trim(),
    highlights: input.highlights.filter((h) => h.value.trim() || h.label.trim()),
    slides,
    closingLine:
      input.closingLine?.trim() ||
      "Creamos conexiones que generan resultados",
    contactLines:
      input.contactLines?.filter((l) => l.trim()) ?? [
        "admin@nextmedia.com.ar",
        "nextmedia.com.ar",
      ],
    generatedAt: new Date().toLocaleDateString("es-AR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    theme: normalizePresentationTheme(input.theme),
  };

  const slug = deck.title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "presentacion";

  if (input.format === "pdf") {
    const buffer = await renderToBuffer(PresentationDocument({ deck }));
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${CLIENT_BRAND.toLowerCase()}-${slug}.pdf"`,
      },
    });
  }

  const pptxBuf = await buildPresentationPptx(deck);
  return new Response(new Uint8Array(pptxBuf), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename="${CLIENT_BRAND.toLowerCase()}-${slug}.pptx"`,
    },
  });
}
