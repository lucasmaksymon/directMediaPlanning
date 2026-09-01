import { z } from "zod";
import { auth } from "@/auth";
import { renderToBuffer } from "@react-pdf/renderer";
import { CLIENT_BRAND } from "@/lib/brand";
import { prisma } from "@/lib/prisma";
import { PresentationDocument } from "@/lib/presentations/presentation-document";
import { buildPresentationPptx } from "@/lib/presentations/pptx";
import { withResolvedImages } from "@/lib/presentations/resolve-image";
import { MAX_PRESENTATION_SLIDES } from "@/lib/presentations/limits";
import { PRESENTATION_FIELD_KEYS } from "@/lib/presentations/types";
import { normalizeVisibleFields } from "@/lib/presentations/slide-data";
import { normalizePresentationTheme } from "@/lib/presentations/theme";
import type { PresentationDeck } from "@/lib/presentations/types";

export const runtime = "nodejs";
export const maxDuration = 120;

let exportBusy = false;

function clipped(max: number) {
  return z.string().transform((s) => s.slice(0, max));
}

const bodySchema = z.object({
  format: z.enum(["pdf", "pptx"]),
  title: z.string().min(1).pipe(clipped(200)),
  titleHighlight: clipped(120).default(""),
  eyebrow: clipped(120).default(""),
  subtitle: clipped(500).default(""),
  theme: z.enum(["light", "dark"]).optional(),
  highlights: z
    .array(
      z.object({
        value: clipped(80),
        label: clipped(80),
        enabled: z.boolean().optional(),
      }),
    )
    .max(3)
    .default([]),
  closingLine: clipped(300).optional(),
  closingLineAccent: clipped(200).optional(),
  closingBadge: clipped(80).optional(),
  contactAddress: clipped(240).optional(),
  contactEmail: clipped(120).optional(),
  contactWeb: clipped(120).optional(),
  visibleFields: z.record(z.enum(PRESENTATION_FIELD_KEYS), z.boolean()).optional(),
  slides: z
    .array(
      z.object({
        unitId: z.string().min(1),
        slideTitle: z.string().min(1).pipe(clipped(120)),
        location: clipped(300),
        zona: clipped(120).optional(),
        medida: clipped(200).optional(),
        visibilidad: clipped(300).optional(),
        caras: clipped(80).optional(),
        impacto: clipped(200).optional(),
        impactoPeriodo: z.enum(["diario", "semanal", "mensual"]).optional(),
        frecuencia: clipped(200).optional(),
        spot: clipped(200).optional(),
        encendido: clipped(200).optional(),
        resolucion: clipped(200).optional(),
        pauta: clipped(120).optional(),
        costoMensual: clipped(120).optional(),
        mapsUrl: clipped(2000).optional(),
        imageFit: z.enum(["cover", "contain"]).optional(),
      }),
    )
    .min(1)
    .max(MAX_PRESENTATION_SLIDES),
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
    const tooMany = parsed.error.issues.some(
      (issue) => issue.path[0] === "slides" && issue.code === "too_big",
    );
    return Response.json(
      {
        error: tooMany
          ? `Máximo ${MAX_PRESENTATION_SLIDES} carteles por presentación.`
          : "Datos inválidos.",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const input = parsed.data;
  if (exportBusy) {
    return Response.json(
      { error: "Ya hay una exportación en curso. Esperá a que termine e intentá de nuevo." },
      { status: 429 },
    );
  }
  exportBusy = true;

  try {
    return await runExport(input, req.signal);
  } finally {
    exportBusy = false;
  }
}

async function runExport(
  input: z.infer<typeof bodySchema>,
  signal: AbortSignal,
) {
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

  let slides;
  try {
    slides = await withResolvedImages(slideInputs, "dataUri", signal);
    if (signal.aborted) {
      return new Response(null, { status: 499 });
    }
  } catch (e) {
    if (signal.aborted || (e instanceof Error && e.name === "AbortError")) {
      return new Response(null, { status: 499 });
    }
    throw e;
  }

  const deck: PresentationDeck = {
    title: input.title.trim(),
    titleHighlight: input.titleHighlight.trim(),
    eyebrow: input.eyebrow.trim() || "Circuitos digitales premium",
    subtitle: input.subtitle.trim(),
    highlights: input.highlights.filter(
      (h) => h.enabled !== false && (h.value.trim() || h.label.trim()),
    ),
    slides,
    visibleFields: normalizeVisibleFields(input.visibleFields),
    closingLine: input.closingLine?.trim() || "Creamos conexiones que",
    closingLineAccent: input.closingLineAccent?.trim() || "generan resultados",
    closingBadge: input.closingBadge?.trim() || "Contacto Comercial",
    contactAddress:
      input.contactAddress?.trim() ||
      "Alicia Moreau de Justo 1150, 4to Of. 410B, CABA",
    contactEmail: input.contactEmail?.trim() || "admin@nextmedia.com.ar",
    contactWeb: input.contactWeb?.trim() || "nextmedia.com.ar",
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

  if (signal.aborted) {
    return new Response(null, { status: 499 });
  }

  if (input.format === "pdf") {
    const buffer = await renderToBuffer(PresentationDocument({ deck }));
    return new Response(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${CLIENT_BRAND.toLowerCase()}-${slug}.pdf"`,
      },
    });
  }

  const pptxBuf = await buildPresentationPptx(deck);
  return new Response(pptxBuf, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename="${CLIENT_BRAND.toLowerCase()}-${slug}.pptx"`,
    },
  });
}
