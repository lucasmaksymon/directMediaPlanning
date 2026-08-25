export type PresentationImageFit = "cover" | "contain";

/** Calcula posición/tamaño para object-fit: cover (recorta, no deforma). */
export function coverRect(
  naturalWidth: number,
  naturalHeight: number,
  boxWidth: number,
  boxHeight: number,
): { width: number; height: number; x: number; y: number } {
  if (!naturalWidth || !naturalHeight || !boxWidth || !boxHeight) {
    return { width: boxWidth, height: boxHeight, x: 0, y: 0 };
  }
  const scale = Math.max(boxWidth / naturalWidth, boxHeight / naturalHeight);
  const width = naturalWidth * scale;
  const height = naturalHeight * scale;
  return {
    width,
    height,
    x: (boxWidth - width) / 2,
    y: (boxHeight - height) / 2,
  };
}

/** Calcula posición/tamaño para object-fit: contain (imagen completa, no deforma). */
export function containRect(
  naturalWidth: number,
  naturalHeight: number,
  boxWidth: number,
  boxHeight: number,
): { width: number; height: number; x: number; y: number } {
  if (!naturalWidth || !naturalHeight || !boxWidth || !boxHeight) {
    return { width: boxWidth, height: boxHeight, x: 0, y: 0 };
  }
  const scale = Math.min(boxWidth / naturalWidth, boxHeight / naturalHeight);
  const width = naturalWidth * scale;
  const height = naturalHeight * scale;
  return {
    width,
    height,
    x: (boxWidth - width) / 2,
    y: (boxHeight - height) / 2,
  };
}

export function fitRect(
  mode: PresentationImageFit,
  naturalWidth: number,
  naturalHeight: number,
  boxWidth: number,
  boxHeight: number,
) {
  return mode === "contain"
    ? containRect(naturalWidth, naturalHeight, boxWidth, boxHeight)
    : coverRect(naturalWidth, naturalHeight, boxWidth, boxHeight);
}

export function normalizeImageFit(value: unknown): PresentationImageFit {
  return value === "contain" ? "contain" : "cover";
}

/** A4 landscape en puntos PDF (react-pdf). */
export const PDF_PAGE = { width: 841.89, height: 595.28 } as const;
export const PDF_IMAGE_PANE_RATIO = 0.55;

export function pdfImagePaneSize() {
  return {
    width: PDF_PAGE.width * PDF_IMAGE_PANE_RATIO,
    height: PDF_PAGE.height,
  };
}
