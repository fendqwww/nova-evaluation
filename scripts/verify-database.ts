import "dotenv/config";
import { db } from "@/server/db";
import {
  consumeAppearanceAnalysis,
  consumeCoachMessage,
  consumeFoodAnalysis,
  getUserUsage,
} from "@/features/usage/server";
import { getConsentState, hasAiConsent, recordConsents } from "@/features/legal/server";
import type { PlanId } from "@/features/settings/types";

/**
 * Проверка живой базы: схема применилась и лимиты держат гонку.
 *
 * Запускается один раз после подключения PostgreSQL, до того как в приложение
 * пустят людей:
 *
 *   npx tsx scripts/verify-database.ts
 *
 * Смысл именно в гонках. Атомарность лимитов держится на условном UPDATE
 * (`UPDATE ... WHERE used < limit`), и на SQLite она проверялась при
 * единственном писателе, которого сериализовала сама база. PostgreSQL пишет
 * по-настоящему параллельно, а на Vercel параллельны ещё и контейнеры — то
 * есть ровно та ситуация, ради которой условный UPDATE и выбирался вместо
 * «прочитать счётчик, потом увеличить». Здесь это проверяется на настоящем
 * движке, а не на предположении о нём.
 *
 * Скрипт создаёт временного пользователя и удаляет его за собой; на боевых
 * данных он не оставляет следов.
 */

let failures = 0;

function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(
    `${ok ? "  OK  " : " FAIL "} ${label}` +
      (ok ? "" : `\n        ожидалось ${JSON.stringify(expected)}, получено ${JSON.stringify(actual)}`),
  );
}

async function main() {
  console.log("\n== Подключение и схема ==");

  const [{ version }] = await db.$queryRaw<Array<{ version: string }>>`SELECT version()`;
  console.log(`  подключено: ${version.split(",")[0]}`);

  const tables = await db.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  `;
  // 34 модели + служебная таблица истории миграций Prisma.
  check("таблиц создано", Number(tables[0].count) >= 35, true);

  const user = await db.user.create({
    data: { telegramId: `verify-${Date.now()}`, firstName: "Проверка" },
    select: { id: true },
  });
  const ctx = { userId: user.id, plan: "free" as PlanId, today: "2026-08-08" };

  try {
    console.log("\n== Согласия ==");
    check("новый аккаунт не пускают без согласия", (await getConsentState(user.id)).satisfied, false);
    await recordConsents(user.id, ["terms", "personal-data"], "onboarding");
    check("после обязательных — пускают", (await getConsentState(user.id)).satisfied, true);
    check("AI без своего согласия запрещён", await hasAiConsent(user.id), false);

    console.log("\n== Лимиты: гонка на реальном PostgreSQL ==");

    const coach = await Promise.all(
      Array.from({ length: 30 }, () => consumeCoachMessage(ctx)),
    );
    check(
      "30 одновременных сообщений против лимита 20 → ровно 20",
      coach.filter((result) => result.success).length,
      20,
    );

    const food = await Promise.all(Array.from({ length: 10 }, () => consumeFoodAnalysis(ctx)));
    check(
      "10 одновременных анализов еды против 1 в неделю → ровно 1",
      food.filter((result) => result.success).length,
      1,
    );

    const appearance = await Promise.all(
      Array.from({ length: 10 }, () => consumeAppearanceAnalysis(ctx)),
    );
    check(
      "10 одновременных анализов внешности против 1 → ровно 1",
      appearance.filter((result) => result.success).length,
      1,
    );

    const usage = await getUserUsage(ctx);
    check(
      "счётчики в базе не превысили потолки",
      [usage.coach.used, usage.food.used, usage.appearance.used],
      [20, 1, 1],
    );
  } finally {
    await db.user.delete({ where: { id: user.id } });
  }

  console.log(
    `\n${failures === 0 ? "База готова к работе." : `ПРОБЛЕМ: ${failures}. Разбираться до запуска.`}\n`,
  );
  await db.$disconnect();
  process.exit(failures === 0 ? 0 : 1);
}

void main();
