-- NOVA Path, история веса и прогресс Академии.
--
-- Миграция строго добавляющая: ни одна существующая колонка не меняется и не
-- удаляется, поэтому применение к рабочей базе не может испортить данные и не
-- требует бэкфилла. Единственный INSERT в конце — перенос текущего веса из
-- Profile в первую строку WeightLog, чтобы у графика веса была точка отсчёта с
-- первого дня, а не после второго взвешивания.

-- CreateTable
CREATE TABLE "NovaPath" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "goalKind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "startValue" DOUBLE PRECISION,
    "targetValue" DOUBLE PRECISION,
    "unit" TEXT,
    "horizonDays" INTEGER NOT NULL DEFAULT 90,
    "source" TEXT NOT NULL DEFAULT 'template',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "NovaPath_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NovaPathStep" (
    "id" TEXT NOT NULL,
    "pathId" TEXT NOT NULL,
    "stageIndex" INTEGER NOT NULL,
    "stageTitle" TEXT NOT NULL,
    "stageGoal" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "hint" TEXT,
    "target" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isDone" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "NovaPathStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeightLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" TIMESTAMP(3) NOT NULL,
    "weightKg" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeightLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademyProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AcademyProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NovaPath_userId_archivedAt_idx" ON "NovaPath"("userId", "archivedAt");

-- CreateIndex
CREATE INDEX "NovaPathStep_pathId_idx" ON "NovaPathStep"("pathId");

-- CreateIndex
CREATE INDEX "WeightLog_userId_day_idx" ON "WeightLog"("userId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "WeightLog_userId_day_key" ON "WeightLog"("userId", "day");

-- CreateIndex
CREATE INDEX "AcademyProgress_userId_idx" ON "AcademyProgress"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AcademyProgress_userId_lessonId_key" ON "AcademyProgress"("userId", "lessonId");

-- AddForeignKey
ALTER TABLE "NovaPath" ADD CONSTRAINT "NovaPath_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NovaPathStep" ADD CONSTRAINT "NovaPathStep_pathId_fkey" FOREIGN KEY ("pathId") REFERENCES "NovaPath"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeightLog" ADD CONSTRAINT "WeightLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademyProgress" ADD CONSTRAINT "AcademyProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Точка отсчёта для истории веса: вес, названный в онбординге, датируется днём
-- создания профиля. Без этого первый график веса был бы одной точкой «сегодня»,
-- а карточка «Тело» продолжала бы писать «нет истории» тем, кто в приложении
-- уже месяц.
--
-- date_trunc до дня — та же UTC-полночь, которую пишет приложение. ON CONFLICT
-- делает миграцию идемпотентной при повторном применении.
INSERT INTO "WeightLog" ("id", "userId", "day", "weightKg", "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::text,
    "userId",
    date_trunc('day', "createdAt"),
    "weightKg"::double precision,
    "createdAt",
    "createdAt"
FROM "Profile"
WHERE "weightKg" > 0
ON CONFLICT ("userId", "day") DO NOTHING;
