import PptxGenJS from "pptxgenjs";
import { CLIENT_BRAND, PRODUCT_NAME } from "@/lib/brand";
import { imageForPptx } from "@/lib/presentations/image-for-pptx";
import { slideSpecRows } from "@/lib/presentations/slide-data";
import { getPresentationPptxPalette } from "@/lib/presentations/theme";
import type { PresentationDeck } from "@/lib/presentations/types";

const IMG_W = 7.33;
const SLIDE_H = 7.5;
const SPEC_X = 7.7;
const SPEC_W = 5.1;

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
    const s = pptx.addSlide();
    s.background = { color: c.canvas };

    s.addShape(pptx.ShapeType.ellipse, {
      x: 0.7,
      y: 0.72,
      w: 0.16,
      h: 0.16,
      fill: { color: c.led },
      line: { color: c.led },
    });
    s.addText(CLIENT_BRAND.toUpperCase(), {
      x: 1.0,
      y: 0.65,
      w: 10,
      h: 0.3,
      fontSize: 11,
      color: c.led,
      bold: true,
      charSpacing: 3,
      fontFace: "Arial",
    });
    s.addText(deck.title, {
      x: 0.7,
      y: 1.35,
      w: 11,
      h: 1.4,
      fontSize: 34,
      color: c.foreground,
      bold: true,
      fontFace: "Arial",
    });
    if (deck.subtitle) {
      s.addText(deck.subtitle, {
        x: 0.7,
        y: 2.9,
        w: 10,
        h: 0.8,
        fontSize: 14,
        color: c.muted,
        fontFace: "Arial",
      });
    }
    deck.highlights.slice(0, 3).forEach((h, i) => {
      const x = 0.7 + i * 4.0;
      s.addShape(pptx.ShapeType.roundRect, {
        x,
        y: 4.5,
        w: 3.7,
        h: 1.4,
        fill: { color: c.card },
        line: { color: c.border, width: 1 },
        rectRadius: 0.12,
      });
      s.addShape(pptx.ShapeType.rect, {
        x,
        y: 4.5,
        w: 0.08,
        h: 1.4,
        fill: { color: c.led },
      });
      s.addText(h.value || "—", {
        x: x + 0.3,
        y: 4.7,
        w: 3.2,
        h: 0.5,
        fontSize: 22,
        color: c.led,
        bold: true,
        fontFace: "Arial",
      });
      s.addText(h.label, {
        x: x + 0.3,
        y: 5.25,
        w: 3.2,
        h: 0.35,
        fontSize: 11,
        color: c.muted,
        fontFace: "Arial",
      });
    });
    s.addText(PRODUCT_NAME, {
      x: 0.7,
      y: 6.95,
      w: 4,
      h: 0.25,
      fontSize: 10,
      color: c.muted,
      fontFace: "Arial",
    });
    s.addText(deck.generatedAt, {
      x: 8.5,
      y: 6.95,
      w: 4.1,
      h: 0.25,
      fontSize: 10,
      color: c.muted,
      align: "right",
      fontFace: "Arial",
    });
  }

  for (let index = 0; index < deck.slides.length; index++) {
    const slide = deck.slides[index]!;
    const s = pptx.addSlide();
    s.background = { color: c.canvas };

    s.addShape(pptx.ShapeType.rect, {
      x: IMG_W,
      y: 0,
      w: 13.333 - IMG_W,
      h: SLIDE_H,
      fill: { color: c.card },
    });

    const img = await imageForPptx(slide.imageSrc);
    if (img) {
      try {
        const natural = naturalSizeForCover(slide.imageWidth, slide.imageHeight);
        s.addImage({
          ...img,
          x: 0,
          y: 0,
          w: natural.w,
          h: natural.h,
          sizing: { type: "cover", w: IMG_W, h: SLIDE_H },
        });
      } catch {
        s.addShape(pptx.ShapeType.rect, {
          x: 0,
          y: 0,
          w: IMG_W,
          h: SLIDE_H,
          fill: { color: c.surfaceSecondary },
        });
        s.addText("Sin imagen", {
          x: 0,
          y: 3.4,
          w: IMG_W,
          h: 0.4,
          color: c.muted,
          align: "center",
        });
      }
    } else {
      s.addShape(pptx.ShapeType.rect, {
        x: 0,
        y: 0,
        w: IMG_W,
        h: SLIDE_H,
        fill: { color: c.surfaceSecondary },
      });
      s.addText("Sin imagen", {
        x: 0,
        y: 3.4,
        w: IMG_W,
        h: 0.4,
        color: c.muted,
        align: "center",
      });
    }

    let y = 1.2;
    if (slide.providerName) {
      s.addText(slide.providerName, {
        x: SPEC_X,
        y,
        w: SPEC_W,
        h: 0.3,
        fontSize: 11,
        color: c.led,
        bold: true,
        fontFace: "Arial",
      });
      y += 0.35;
    }
    s.addText(slide.slideTitle, {
      x: SPEC_X,
      y,
      w: SPEC_W,
      h: 0.7,
      fontSize: 18,
      color: c.foreground,
      bold: true,
      fontFace: "Arial",
    });
    y += 0.75;
    if (slide.location) {
      s.addText(slide.location, {
        x: SPEC_X,
        y,
        w: SPEC_W,
        h: 0.45,
        fontSize: 12,
        color: c.muted,
        fontFace: "Arial",
      });
      y += 0.55;
    }

    const rows = slideSpecRows(slide).filter((r) => r.label !== "Ubicación");
    rows.forEach((row) => {
      s.addText(row.label, {
        x: SPEC_X,
        y,
        w: SPEC_W,
        h: 0.22,
        fontSize: 10,
        color: c.muted,
        fontFace: "Arial",
      });
      s.addText(row.value, {
        x: SPEC_X,
        y: y + 0.22,
        w: SPEC_W,
        h: 0.4,
        fontSize: 13,
        color: c.foreground,
        bold: true,
        fontFace: "Arial",
      });
      y += 0.75;
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
      x: 11,
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
    s.addText(CLIENT_BRAND.toUpperCase(), {
      x: 1,
      y: 2.2,
      w: 11.3,
      h: 0.35,
      fontSize: 12,
      color: c.led,
      bold: true,
      align: "center",
      charSpacing: 3,
      fontFace: "Arial",
    });
    s.addText(PRODUCT_NAME, {
      x: 1,
      y: 2.7,
      w: 11.3,
      h: 0.6,
      fontSize: 32,
      color: c.onDark,
      bold: true,
      align: "center",
      fontFace: "Arial",
    });
    s.addText(deck.closingLine, {
      x: 2,
      y: 3.5,
      w: 9.3,
      h: 0.7,
      fontSize: 14,
      color: c.onDarkMuted,
      align: "center",
      fontFace: "Arial",
    });
    deck.contactLines.forEach((line, i) => {
      s.addText(line, {
        x: 2,
        y: 4.5 + i * 0.35,
        w: 9.3,
        h: 0.3,
        fontSize: 12,
        color: c.onDarkMuted,
        align: "center",
        fontFace: "Arial",
      });
    });
  }

  const out = await pptx.write({ outputType: "nodebuffer" });
  return Buffer.from(out as ArrayBuffer);
}
