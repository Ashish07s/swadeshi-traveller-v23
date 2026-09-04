import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    datasourceUrl: process.env.DIRECT_URL, // Use DIRECT_URL to bypass PgBouncer
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;