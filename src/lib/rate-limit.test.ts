import { describe, expect, it } from "vitest";
import { rateLimit } from "./rate-limit";

describe("rateLimit", () => {
  it("permite hasta el cupo y luego bloquea", () => {
    const now = 1_000_000;
    expect(rateLimit("t1", 2, 10_000, now).ok).toBe(true);
    expect(rateLimit("t1", 2, 10_000, now + 1).ok).toBe(true);
    expect(rateLimit("t1", 2, 10_000, now + 2).ok).toBe(false);
  });

  it("reinicia la ventana", () => {
    const now = 2_000_000;
    rateLimit("t2", 1, 100, now);
    expect(rateLimit("t2", 1, 100, now + 101).ok).toBe(true);
  });
});
