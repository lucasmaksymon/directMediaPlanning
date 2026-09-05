import { PrismaClient } from "@prisma/client";

const CLIENT_GEN = 5;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaGen?: number;
};

if (globalForPrisma.prismaGen !== CLIENT_GEN) {
  globalForPrisma.prisma = undefined;
  globalForPrisma.prismaGen = CLIENT_GEN;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
