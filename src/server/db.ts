import "server-only";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { env } from "@/shared/config/env";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

// Migrating to PostgreSQL means swapping this adapter for
// @prisma/adapter-pg (and the schema.prisma provider literal) — the rest of
// the app talks to `db`, never to the adapter directly.
const adapter = new PrismaBetterSqlite3({ url: env.DATABASE_URL });

export const db = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
