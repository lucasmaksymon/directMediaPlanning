import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const DEFAULT_FEE_RATE = new Prisma.Decimal("0.06");

export async function getPlatformFeeRate(): Promise<Prisma.Decimal> {
  const settings = await prisma.platformSettings.findUnique({ where: { id: "default" } });
  return settings?.platformFeeRate ?? DEFAULT_FEE_RATE;
}

export function computePlatformFee(
  amount: Prisma.Decimal | number,
  rate: Prisma.Decimal | number,
): { platformFee: Prisma.Decimal; providerAmount: Prisma.Decimal } {
  const amt = new Prisma.Decimal(amount);
  const r = new Prisma.Decimal(rate);
  const platformFee = amt.mul(r).toDecimalPlaces(2);
  const providerAmount = amt.sub(platformFee).toDecimalPlaces(2);
  return { platformFee, providerAmount };
}
