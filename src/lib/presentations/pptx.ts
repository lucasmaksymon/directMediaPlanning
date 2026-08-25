import PptxGenJS from "pptxgenjs";
import { CLIENT_BRAND } from "@/lib/brand";
import { imageForPptx } from "@/lib/presentations/image-for-pptx";
import { normalizeImageFit } from "@/lib/presentations/image-layout";
import { slideSpecRows } from "@/lib/presentations/slide-data";
import { getPresentationPptxPalette } from "@/lib/presentations/theme";
import type { PresentationDeck } from "@/lib/presentations/types";

const IMG_W = 7.33;
const IMG_X = 13.333 - IMG_W; // foto a la derecha
const SLIDE_H = 7.5;
const SPEC_X = 0.55;
const SPEC_W = IMG_X - SPEC_X - 0.35;

/** pptxgenjs sizing:cover usa options.w/h como “tamaño natural”; hay que pasar el aspect real. */
function naturalSizeForCover(width?: number | null, height?: number | null) {
  if (width && height && width > 0 && height > 0) {
    const scale = 10 / Math.max(width, height);
    return { w: width * scale, h: height * scale };
  }
  // Fallback 4:3 para no estirar a ciegas al tamaño del box
  return { w: 4, h: 3 };
}

export async function buildPresentationPptx(deck: PresentationDeck): Promise<Buffer> {
  const c = getPresentationPptxPalette(deck.theme);
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "WIDE", width: 13.333, height: SLIDE_H });
  pptx.layout = "WIDE";
  pptx.author = CLIENT_BRAND;
  pptx.title = deck.title;

  {
    // Portada — siempre ocean (mock comercial), independiente del tema de fichas
    const s = pptx.addSlide();
    s.background = { color: c.ocean };

    if (deck.eyebrow) {
      const pillW = Math.min(5.8, Math.max(3.2, deck.eyebrow.length * 0.16 + 1.2));
      s.addShape(pptx.ShapeType.roundRect, {
        x: 0.7,
        y: 0.55,
        w: pillW,
        h: 0.38,
        fill: { color: c.ocean },
        line: { color: c.led, width: 1.25 },
        rectRadius: 0.19,
      });
      s.addText(deck.eyebrow.toUpperCase(), {
        x: 0.7,
        y: 0.58,
        w: pillW,
        h: 0.32,
        fontSize: 10,
        color: c.led,
        bold: true,
        charSpacing: 2,
        align: "center",
        fontFace: "Arial",
      });
    }
    s.addText(CLIENT_BRAND, {
      x: 9.2,
      y: 0.55,
      w: 3.4,
      h: 0.35,
      fontSize: 14,
      color: c.onDark,
      bold: true,
      align: "right",
      fontFace: "Arial",
    });

    s.addText(deck.title, {
      x: 0.7,
      y: 1.85,
      w: 10.5,
      h: 0.7,
      fontSize: 36,
      color: c.onDark,
      bold: true,
      fontFace: "Arial",
    });
    if (deck.titleHighlight) {
      s.addText(deck.titleHighlight, {
        x: 0.7,
        y: 2.5,
        w: 10.5,
        h: 0.7,
        fontSize: 36,
        color: c.led,
        bold: true,
        fontFace: "Arial",
      });
    }
    if (deck.subtitle) {
      s.addText(deck.subtitle, {
        x: 0.7,
        y: 3.35,
        w: 9.5,
        h: 0.7,
        fontSize: 14,
        color: c.onDarkMuted,
        fontFace: "Arial",
      });
    }

    const coverHighlights = deck.highlights
      .filter((h) => h.enabled !== false && (h.value.trim() || h.label.trim()))
      .slice(0, 3);
    const kpiY = 4.35;
    const kpiW = coverHighlights.length === 1 ? 3.2 : coverHighlights.length === 2 ? 3.4 : 3.2;
    const kpiGap = coverHighlights.length === 2 ? 0.45 : 0.3;
    const kpiTotal = coverHighlights.length * kpiW + Math.max(0, coverHighlights.length - 1) * kpiGap;
    const kpiStartX = Math.max(0.7, (13.333 - kpiTotal) / 2);

    coverHighlights.forEach((h, i) => {
      const x = kpiStartX + i * (kpiW + kpiGap);
      s.addShape(pptx.ShapeType.roundRect, {
        x,
        y: kpiY,
        w: kpiW,
        h: 1.25,
        fill: { color: c.ocean },
        line: { color: c.led, width: 1.25 },
        rectRadius: 0.12,
      });
      s.addText(h.value || "—", {
        x: x + 0.15,
        y: kpiY + 0.2,
        w: kpiW - 0.3,
        h: 0.48,
        fontSize: 24,
        color: c.led,
        bold: true,
        align: "center",
        fontFace: "Arial",
      });
      s.addText(h.label, {
        x: x + 0.15,
        y: kpiY + 0.72,
        w: kpiW - 0.3,
        h: 0.35,
        fontSize: 12,
        color: c.onDark,
        align: "center",
        fontFace: "Arial",
      });
    });
  }

  for (let index = 0; index < deck.slides.length; index++) {
    const slide = deck.slides[index]!;
    const s = pptx.addSlide();
    s.background = { color: c.canvas };

    s.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: IMG_X,
      h: SLIDE_H,
      fill: { color: c.card },
    });

    const img = await imageForPptx(slide.imageSrc);
    // Mismo fondo que el panel de specs (izquierda)
    s.addShape(pptx.ShapeType.rect, {
      x: IMG_X,
      y: 0,
      w: IMG_W,
      h: SLIDE_H,
      fill: { color: c.card },
    });
    if (img) {
      try {
        const natural = naturalSizeForCover(slide.imageWidth, slide.imageHeight);
        const fit = normalizeImageFit(slide.imageFit);
        s.addImage({
          ...img,
          x: IMG_X,
          y: 0,
          w: natural.w,
          h: natural.h,
          sizing: { type: fit, w: IMG_W, h: SLIDE_H },
        });
      } catch {
        s.addText("Sin imagen", {
          x: IMG_X,
          y: 3.4,
          w: IMG_W,
          h: 0.4,
          color: c.muted,
          align: "center",
        });
      }
    } else {
      s.addText("Sin imagen", {
        x: IMG_X,
        y: 3.4,
        w: IMG_W,
        h: 0.4,
        color: c.muted,
        align: "center",
      });
    }

    let y = 0.85;
    if (slide.zona || slide.providerName) {
      s.addText(slide.zona || slide.providerName, {
        x: SPEC_X,
        y,
        w: SPEC_W,
        h: 0.28,
        fontSize: 11,
        color: c.led,
        bold: true,
        fontFace: "Arial",
      });
      y += 0.32;
    }
    s.addText(slide.slideTitle, {
      x: SPEC_X,
      y,
      w: SPEC_W,
      h: 0.55,
      fontSize: 16,
      color: c.foreground,
      bold: true,
      fontFace: "Arial",
    });
    y += 0.65;

    const rows = slideSpecRows(slide).map((r) =>
      r.label === "Mapa"
        ? { ...r, value: "Ver en Google Maps", href: r.value }
        : { ...r, href: undefined as string | undefined },
    );
    rows.forEach((row) => {
      s.addText(row.label, {
        x: SPEC_X,
        y,
        w: 1.35,
        h: 0.38,
        fontSize: 10,
        color: c.led,
        bold: true,
        fontFace: "Arial",
        valign: "middle",
      });
      s.addText(row.value, {
        x: SPEC_X + 1.4,
        y,
        w: SPEC_W - 1.4,
        h: 0.38,
        fontSize: 11,
        color: c.foreground,
        fontFace: "Arial",
        valign: "middle",
        ...(row.href
          ? { hyperlink: { url: row.href, tooltip: "Abrir en Google Maps" } }
          : {}),
      });
      y += 0.48;
    });

    s.addText(CLIENT_BRAND, {
      x: SPEC_X,
      y: 6.95,
      w: 2.5,
      h: 0.25,
      fontSize: 10,
      color: c.muted,
      fontFace: "Arial",
    });
    s.addText(`${index + 1} / ${deck.slides.length}`, {
      x: IMG_X - 2.2,
      y: 6.95,
      w: 1.8,
      h: 0.25,
      fontSize: 10,
      color: c.muted,
      align: "right",
      fontFace: "Arial",
    });
  }

  {
    const s = pptx.addSlide();
    s.background = { color: c.ocean };

    if (deck.closingBadge) {
      const badgeW = Math.min(3.6, Math.max(2.4, deck.closingBadge.length * 0.14 + 1.1));
      s.addShape(pptx.ShapeType.roundRect, {
        x: 13.333 - badgeW - 0.55,
        y: 0.45,
        w: badgeW,
        h: 0.36,
        fill: { color: c.ocean },
        line: { color: c.led, width: 1.25 },
        rectRadius: 0.18,
      });
      s.addText(deck.closingBadge, {
        x: 13.333 - badgeW - 0.55,
        y: 0.48,
        w: badgeW,
        h: 0.3,
        fontSize: 10,
        color: c.led,
        bold: true,
        align: "center",
        fontFace: "Arial",
      });
    }

    s.addText(deck.closingLine.toUpperCase(), {
      x: 1,
      y: 2.35,
      w: 11.3,
      h: 0.55,
      fontSize: 30,
      color: c.onDark,
      bold: true,
      align: "center",
      fontFace: "Arial",
    });
    s.addText(deck.closingLineAccent.toUpperCase(), {
      x: 1,
      y: 2.9,
      w: 11.3,
      h: 0.55,
      fontSize: 30,
      color: c.led,
      bold: true,
      align: "center",
      fontFace: "Arial",
    });

    s.addShape(pptx.ShapeType.roundRect, {
      x: 3.4,
      y: 4.0,
      w: 6.5,
      h: 1.85,
      fill: { color: c.ocean },
      line: { color: "1A3A40", width: 1.25 },
      rectRadius: 0.14,
    });

    const contacts = [
      { text: deck.contactAddress, accent: false },
      { text: deck.contactEmail, accent: true },
      { text: deck.contactWeb, accent: true },
    ].filter((x) => x.text);

    contacts.forEach((row, i) => {
      const y = 4.25 + i * 0.45;
      s.addText(row.text, {
        x: 3.55,
        y,
        w: 6.2,
        h: 0.35,
        fontSize: 12,
        color: row.accent ? c.led : c.onDark,
        align: "center",
        valign: "middle",
        fontFace: "Arial",
        ...(row.accent && row.text.includes("@")
          ? { hyperlink: { url: `mailto:${row.text}` } }
          : row.accent
            ? {
                hyperlink: {
                  url: row.text.startsWith("http") ? row.text : `https://${row.text}`,
                },
              }
            : {}),
      });
    });
  }

  const out = await pptx.write({ outputType: "nodebuffer" });
  return Buffer.from(out as ArrayBuffer);
}
