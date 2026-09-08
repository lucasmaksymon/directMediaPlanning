import sharp from "sharp";

export type Point = { x: number; y: number };

export function orderCorners(points: Point[]): [Point, Point, Point, Point] {
  if (points.length !== 4) throw new Error("Se necesitan 4 esquinas.");
  const sorted = [...points].sort((a, b) => a.y - b.y || a.x - b.x);
  const top = sorted.slice(0, 2).sort((a, b) => a.x - b.x);
  const bottom = sorted.slice(2, 4).sort((a, b) => a.x - b.x);
  return [top[0], top[1], bottom[1], bottom[0]];
}

export function normalizeCorners(points: Point[], width: number, height: number): Point[] {
  const looksLikePixels = points.some((p) => p.x > 1.5 || p.y > 1.5);
  return points.map((p) =>
    looksLikePixels
      ? { x: p.x / width, y: p.y / height }
      : { x: p.x, y: p.y },
  );
}

function dist(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function solveLinear(A: number[][], b: number[]): number[] {
  const n = b.length;
  const m = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(m[row][col]) > Math.abs(m[pivot][col])) pivot = row;
    }
    [m[col], m[pivot]] = [m[pivot], m[col]];
    const diag = m[col][col];
    if (Math.abs(diag) < 1e-12) throw new Error("No se pudo calcular la perspectiva.");
    for (let j = col; j <= n; j++) m[col][j] /= diag;
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const f = m[row][col];
      for (let j = col; j <= n; j++) m[row][j] -= f * m[col][j];
    }
  }
  return m.map((row) => row[n]);
}

/** Homografía 3x3 (fila mayor) que mapea src → dst. */
export function homography(src: Point[], dst: Point[]): number[] {
  const A: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const { x: xs, y: ys } = src[i];
    const { x: xd, y: yd } = dst[i];
    A.push([xs, ys, 1, 0, 0, 0, -xd * xs, -xd * ys]);
    b.push(xd);
    A.push([0, 0, 0, xs, ys, 1, -yd * xs, -yd * ys]);
    b.push(yd);
  }
  return [...solveLinear(A, b), 1];
}

export function invertHomography(h: number[]): number[] {
  const [a, b, c, d, e, f, g, i, j] = h;
  const A = e * j - f * i;
  const B = c * i - b * j;
  const C = b * f - c * e;
  const D = f * g - d * j;
  const E = a * j - c * g;
  const F = c * d - a * f;
  const G = d * i - e * g;
  const H = b * g - a * i;
  const I = a * e - b * d;
  const det = a * A + b * D + c * G;
  if (Math.abs(det) < 1e-12) throw new Error("No se pudo invertir la perspectiva.");
  return [A, B, C, D, E, F, G, H, I].map((v) => v / det);
}

function applyH(h: number[], x: number, y: number): Point {
  const w = h[6] * x + h[7] * y + h[8];
  return {
    x: (h[0] * x + h[1] * y + h[2]) / w,
    y: (h[3] * x + h[4] * y + h[5]) / w,
  };
}

function sampleBilinear(
  data: Buffer,
  width: number,
  height: number,
  x: number,
  y: number,
): [number, number, number, number] | null {
  if (x < 0 || y < 0 || x > width - 1 || y > height - 1) return null;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(x0 + 1, width - 1);
  const y1 = Math.min(y0 + 1, height - 1);
  const dx = x - x0;
  const dy = y - y0;
  const idx = (ix: number, iy: number) => (iy * width + ix) * 4;
  const mix = (a: number, b: number, t: number) => a + (b - a) * t;
  const i00 = idx(x0, y0);
  const i10 = idx(x1, y0);
  const i01 = idx(x0, y1);
  const i11 = idx(x1, y1);
  const out: [number, number, number, number] = [0, 0, 0, 0];
  for (let c = 0; c < 4; c++) {
    const v0 = mix(data[i00 + c], data[i10 + c], dx);
    const v1 = mix(data[i01 + c], data[i11 + c], dx);
    out[c] = mix(v0, v1, dy);
  }
  return out;
}

/** Pega el arte sobre la cara detectada, usando el tamaño real post-EXIF. */
export async function compositeCreativeOnQuad(
  sceneBuf: Buffer,
  creativeBuf: Buffer,
  normalizedCorners: Point[],
): Promise<Buffer> {
  const sceneRaw = await sharp(sceneBuf, { failOn: "none", limitInputPixels: 40_000_000 })
    .rotate()
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const sceneW = sceneRaw.info.width;
  const sceneH = sceneRaw.info.height;
  if (!sceneW || !sceneH) throw new Error("La foto del cartel no es válida.");

  const [tl, tr, br, bl] = orderCorners(normalizedCorners);
  const dest = [
    { x: tl.x * sceneW, y: tl.y * sceneH },
    { x: tr.x * sceneW, y: tr.y * sceneH },
    { x: br.x * sceneW, y: br.y * sceneH },
    { x: bl.x * sceneW, y: bl.y * sceneH },
  ];

  const faceW = Math.max(32, Math.round((dist(dest[0], dest[1]) + dist(dest[3], dest[2])) / 2));
  const faceH = Math.max(32, Math.round((dist(dest[0], dest[3]) + dist(dest[1], dest[2])) / 2));

  const art = await sharp(creativeBuf, { failOn: "none" })
    .rotate()
    .resize({
      width: faceW,
      height: faceH,
      fit: "cover",
      position: "centre",
    })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const src = [
    { x: 0, y: 0 },
    { x: art.info.width - 1, y: 0 },
    { x: art.info.width - 1, y: art.info.height - 1 },
    { x: 0, y: art.info.height - 1 },
  ];
  const hInv = invertHomography(homography(src, dest));

  const out = Buffer.from(sceneRaw.data);
  const minX = Math.max(0, Math.floor(Math.min(...dest.map((p) => p.x))));
  const maxX = Math.min(sceneW - 1, Math.ceil(Math.max(...dest.map((p) => p.x))));
  const minY = Math.max(0, Math.floor(Math.min(...dest.map((p) => p.y))));
  const maxY = Math.min(sceneH - 1, Math.ceil(Math.max(...dest.map((p) => p.y))));

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const srcPt = applyH(hInv, x + 0.5, y + 0.5);
      const pix = sampleBilinear(art.data, art.info.width, art.info.height, srcPt.x, srcPt.y);
      if (!pix || pix[3] < 8) continue;
      const o = (y * sceneW + x) * 4;
      const a = pix[3] / 255;
      out[o] = Math.round(pix[0] * a + out[o] * (1 - a));
      out[o + 1] = Math.round(pix[1] * a + out[o + 1] * (1 - a));
      out[o + 2] = Math.round(pix[2] * a + out[o + 2] * (1 - a));
      out[o + 3] = 255;
    }
  }

  return sharp(out, { raw: { width: sceneW, height: sceneH, channels: 4 } })
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();
}

function readCorners(raw: unknown): Point[] | null {
  if (!Array.isArray(raw) || raw.length !== 4) return null;
  const points: Point[] = [];
  for (const c of raw) {
    if (!c || typeof c !== "object") return null;
    const x = Number((c as { x?: unknown }).x);
    const y = Number((c as { y?: unknown }).y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    points.push({ x, y });
  }
  return points;
}

export function parseDetectedCorners(raw: unknown): Point[] | null {
  if (!raw || typeof raw !== "object") return null;
  return readCorners((raw as { corners?: unknown }).corners);
}

export function quadArea(points: Point[]): number {
  const [tl, tr, br, bl] = orderCorners(points);
  return (
    Math.abs(
      tl.x * tr.y +
        tr.x * br.y +
        br.x * bl.y +
        bl.x * tl.y -
        (tr.x * tl.y + br.x * tr.y + bl.x * br.y + tl.x * bl.y),
    ) / 2
  );
}

export function isPlausibleAdQuad(points: Point[]): boolean {
  const ordered = orderCorners(points);
  if (ordered.some((p) => p.x < -0.05 || p.x > 1.05 || p.y < -0.05 || p.y > 1.05)) return false;
  const area = quadArea(ordered);
  if (area < 0.012 || area > 0.62) return false;
  const [tl, tr, br, bl] = ordered;
  const w = (dist(tl, tr) + dist(bl, br)) / 2;
  const h = (dist(tl, bl) + dist(tr, br)) / 2;
  if (w < 0.035 || h < 0.04) return false;
  const cx = (tl.x + tr.x + br.x + bl.x) / 4;
  const cy = (tl.y + tr.y + br.y + bl.y) / 4;
  if (area < 0.08 && cx > 0.35 && cx < 0.65 && cy > 0.3 && cy < 0.7) return false;
  return true;
}

const AD_KIND = /billboard|valla|cartel|led|pantalla|ooh|poster|aviso/i;

export function pickBestSurface(
  surfaces: { kind?: string; corners: Point[] }[],
): Point[] | null {
  const ranked = surfaces
    .filter((s) => isPlausibleAdQuad(s.corners))
    .map((s) => {
      const area = quadArea(s.corners);
      const [tl, tr, br, bl] = orderCorners(s.corners);
      const cx = (tl.x + tr.x + br.x + bl.x) / 4;
      const cy = (tl.y + tr.y + br.y + bl.y) / 4;
      const centeredPenalty = area < 0.08 && cx > 0.35 && cx < 0.65 && cy > 0.3 && cy < 0.7 ? 0.25 : 0;
      const kindBonus = AD_KIND.test(s.kind ?? "") ? 0.2 : 0;
      return { corners: s.corners, score: area + kindBonus - centeredPenalty };
    })
    .sort((a, b) => b.score - a.score);
  return ranked[0]?.corners ?? null;
}

export function parseDetectedSurfaces(raw: unknown): Point[] | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as { surfaces?: unknown; corners?: unknown };
  if (Array.isArray(data.surfaces)) {
    const surfaces: { kind?: string; corners: Point[] }[] = [];
    for (const item of data.surfaces) {
      if (!item || typeof item !== "object") continue;
      const corners = readCorners((item as { corners?: unknown }).corners);
      if (!corners) continue;
      surfaces.push({
        kind: String((item as { kind?: unknown }).kind ?? ""),
        corners,
      });
    }
    const picked = pickBestSurface(surfaces);
    if (picked) return picked;
  }
  const single = parseDetectedCorners(raw);
  if (single && isPlausibleAdQuad(single)) return single;
  return null;
}
