-- CreateTable
CREATE TABLE "UserUsage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "periodMonth" TEXT NOT NULL,
    "foodAnalysesUsed" INTEGER NOT NULL DEFAULT 0,
    "appearanceAnalysesUsed" INTEGER NOT NULL DEFAULT 0,
    "coachMessagesUsed" INTEGER NOT NULL DEFAULT 0,
    "foodWeekKey" TEXT,
    "foodWeekUsed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FoodAnalysisCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "imageHash" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "hits" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_UserSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "themeMode" TEXT NOT NULL DEFAULT 'system',
    "language" TEXT NOT NULL DEFAULT 'ru',
    "dateFormat" TEXT NOT NULL DEFAULT 'dmy',
    "unitSystem" TEXT NOT NULL DEFAULT 'metric',
    "notifyHabits" BOOLEAN NOT NULL DEFAULT true,
    "notifyTasks" BOOLEAN NOT NULL DEFAULT true,
    "notifyNutrition" BOOLEAN NOT NULL DEFAULT false,
    "notifyWorkouts" BOOLEAN NOT NULL DEFAULT true,
    "notifyAppearance" BOOLEAN NOT NULL DEFAULT false,
    "notifyCoach" BOOLEAN NOT NULL DEFAULT true,
    "aiCoachEnabled" BOOLEAN NOT NULL DEFAULT true,
    "aiDailyReport" BOOLEAN NOT NULL DEFAULT true,
    "aiVisionEnabled" BOOLEAN NOT NULL DEFAULT true,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "planSince" DATETIME,
    "planUntil" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_UserSettings" ("aiCoachEnabled", "aiDailyReport", "aiVisionEnabled", "createdAt", "dateFormat", "id", "language", "notifyAppearance", "notifyCoach", "notifyHabits", "notifyNutrition", "notifyTasks", "notifyWorkouts", "plan", "planSince", "planUntil", "themeMode", "unitSystem", "updatedAt", "userId") SELECT "aiCoachEnabled", "aiDailyReport", "aiVisionEnabled", "createdAt", "dateFormat", "id", "language", "notifyAppearance", "notifyCoach", "notifyHabits", "notifyNutrition", "notifyTasks", "notifyWorkouts", "plan", "planSince", "planUntil", "themeMode", "unitSystem", "updatedAt", "userId" FROM "UserSettings";
DROP TABLE "UserSettings";
ALTER TABLE "new_UserSettings" RENAME TO "UserSettings";
CREATE UNIQUE INDEX "UserSettings_userId_key" ON "UserSettings"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "UserUsage_userId_foodWeekKey_idx" ON "UserUsage"("userId", "foodWeekKey");

-- CreateIndex
CREATE UNIQUE INDEX "UserUsage_userId_periodMonth_key" ON "UserUsage"("userId", "periodMonth");

-- CreateIndex
CREATE UNIQUE INDEX "FoodAnalysisCache_imageHash_key" ON "FoodAnalysisCache"("imageHash");

-- CreateIndex
CREATE INDEX "FoodAnalysisCache_createdAt_idx" ON "FoodAnalysisCache"("createdAt");
