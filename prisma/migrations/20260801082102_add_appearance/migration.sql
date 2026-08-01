-- CreateTable
CREATE TABLE "AppearanceRoutine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "note" TEXT,
    "category" TEXT NOT NULL DEFAULT 'skin',
    "timeOfDay" TEXT NOT NULL DEFAULT 'any',
    "frequency" TEXT NOT NULL DEFAULT 'daily',
    "weekdayMask" INTEGER NOT NULL DEFAULT 127,
    "timesPerWeek" INTEGER NOT NULL DEFAULT 3,
    "archivedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AppearanceRoutine_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AppearanceStep" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "routineId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AppearanceStep_routineId_fkey" FOREIGN KEY ("routineId") REFERENCES "AppearanceRoutine" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AppearanceRoutineLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "routineId" TEXT NOT NULL,
    "day" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AppearanceRoutineLog_routineId_fkey" FOREIGN KEY ("routineId") REFERENCES "AppearanceRoutine" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AppearanceStepLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stepId" TEXT NOT NULL,
    "day" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AppearanceStepLog_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "AppearanceStep" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AppearancePhoto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'skin',
    "day" DATETIME NOT NULL,
    "note" TEXT,
    "thumbData" TEXT NOT NULL,
    "imageData" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AppearancePhoto_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AppearanceGoal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "note" TEXT,
    "category" TEXT NOT NULL DEFAULT 'skin',
    "targetDate" DATETIME,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AppearanceGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "AppearanceRoutineLog_routineId_day_key" ON "AppearanceRoutineLog"("routineId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "AppearanceStepLog_stepId_day_key" ON "AppearanceStepLog"("stepId", "day");

-- CreateIndex
CREATE INDEX "AppearancePhoto_userId_day_idx" ON "AppearancePhoto"("userId", "day");
