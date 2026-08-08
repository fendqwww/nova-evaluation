import "server-only";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "@/shared/config/env";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

/**
 * Один пул на процесс.
 *
 * На Vercel каждая функция — отдельный контейнер, который живёт от запроса до
 * запроса и засыпает, не закрывая соединений. Пул без потолка означает, что
 * десяток одновременных пользователей разбирает лимит подключений Postgres
 * целиком, и приложение начинает отказывать не потому, что не справляется, а
 * потому, что не может подключиться.
 *
 * Отсюда узкий пул и короткий idle-таймаут: соединение отдаётся обратно
 * раньше, чем контейнер заснёт вместе с ним. Neon держит перед базой
 * собственный пулер, так что несколько контейнеров по три соединения — это
 * нормальный режим, а не экономия.
 */
const adapter = new PrismaPg({
  connectionString: env.DATABASE_URL,
  max: 3,
  idleTimeoutMillis: 10_000,
});

export const db = globalForPrisma.prisma ?? new PrismaClient({ adapter });

// В разработке Next перезагружает модули на каждое изменение файла, и без
// этого кэша каждая перезагрузка открывала бы новый пул поверх старого.
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
