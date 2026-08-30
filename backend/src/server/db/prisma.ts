import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../generated/prisma/client";
import { getEnvironment } from "@/server/config/env";

const globalForPrisma = globalThis as unknown as {
  restaurantPrisma?: PrismaClient;
};

export function getPrisma(): PrismaClient {
  if (!globalForPrisma.restaurantPrisma) {
    const adapter = new PrismaPg({
      connectionString: getEnvironment().DATABASE_URL,
    });
    globalForPrisma.restaurantPrisma = new PrismaClient({ adapter });
  }

  return globalForPrisma.restaurantPrisma;
}
