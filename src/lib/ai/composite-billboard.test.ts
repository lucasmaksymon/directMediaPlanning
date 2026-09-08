import { describe, expect, it } from "vitest";
import {
  homography,
  invertHomography,
  isPlausibleAdQuad,
  normalizeCorners,
  orderCorners,
  parseDetectedCorners,
  parseDetectedSurfaces,
  pickBestSurface,
} from "./composite-billboard";

describe("composite-billboard", () => {
  it("ordena esquinas TL TR BR BL", () => {
    const [tl, tr, br, bl] = orderCorners([
      { x: 0.8, y: 0.7 },
      { x: 0.1, y: 0.2 },
      { x: 0.75, y: 0.25 },
      { x: 0.15, y: 0.65 },
    ]);
    expect(tl).toEqual({ x: 0.1, y: 0.2 });
    expect(tr).toEqual({ x: 0.75, y: 0.25 });
    expect(br).toEqual({ x: 0.8, y: 0.7 });
    expect(bl).toEqual({ x: 0.15, y: 0.65 });
  });

  it("mapea identidad con homografía", () => {
    const src = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 5 },
      { x: 0, y: 5 },
    ];
    const h = homography(src, src);
    const inv = invertHomography(h);
    const w = inv[6] * 4 + inv[7] * 2 + inv[8];
    const x = (inv[0] * 4 + inv[1] * 2 + inv[2]) / w;
    const y = (inv[3] * 4 + inv[4] * 2 + inv[5]) / w;
    expect(x).toBeCloseTo(4, 5);
    expect(y).toBeCloseTo(2, 5);
  });

  it("normaliza pixels del preview y deja 0-1 intacto", () => {
    const frac = normalizeCorners(
      [
        { x: 0.2, y: 0.3 },
        { x: 0.8, y: 0.3 },
        { x: 0.8, y: 0.7 },
        { x: 0.2, y: 0.7 },
      ],
      1280,
      720,
    );
    expect(frac[0]).toEqual({ x: 0.2, y: 0.3 });
    const px = normalizeCorners(
      [
        { x: 256, y: 216 },
        { x: 1024, y: 216 },
        { x: 1024, y: 504 },
        { x: 256, y: 504 },
      ],
      1280,
      720,
    );
    expect(px[0].x).toBeCloseTo(0.2);
    expect(px[0].y).toBeCloseTo(0.3);
  });

  it("parsea corners válidos", () => {
    expect(parseDetectedCorners({ corners: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }] })).toHaveLength(4);
    expect(parseDetectedCorners({ corners: [] })).toBeNull();
  });

  it("descarta un sello chico al centro y elige el cartel lateral", () => {
    const stamp = [
      { x: 0.42, y: 0.38 },
      { x: 0.58, y: 0.38 },
      { x: 0.58, y: 0.58 },
      { x: 0.42, y: 0.58 },
    ];
    const board = [
      { x: 0.06, y: 0.1 },
      { x: 0.2, y: 0.12 },
      { x: 0.19, y: 0.62 },
      { x: 0.05, y: 0.6 },
    ];
    expect(isPlausibleAdQuad(stamp)).toBe(false);
    const picked = pickBestSurface([
      { kind: "facade", corners: stamp },
      { kind: "billboard", corners: board },
    ]);
    expect(picked).toEqual(board);
    expect(
      parseDetectedSurfaces({
        surfaces: [
          { kind: "facade", corners: stamp },
          { kind: "billboard", corners: board },
        ],
      }),
    ).toEqual(board);
  });
});
