import { prisma } from "@/lib/prisma";

export async function getProviderProfileByUserId(userId: string) {
  return prisma.providerProfile.findUnique({
    where: { userId },
  });
}
