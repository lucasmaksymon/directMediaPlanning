import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { computePlatformFee } from "./platform-fee";

describe("computePlatformFee", () => {
  it("calcula 6% y el neto del medio", () => {
    const { platformFee, providerAmount } = computePlatformFee(1000, new Prisma.Decimal("0.06"));
    expect(platformFee.toString()).toBe("60");
    expect(providerAmount.toString()).toBe("940");
  });
});
