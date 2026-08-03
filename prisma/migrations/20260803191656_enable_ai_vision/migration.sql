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
    "aiUsageCount" INTEGER NOT NULL DEFAULT 0,
    "aiUsageToday" INTEGER NOT NULL DEFAULT 0,
    "aiUsageDay" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_UserSettings" ("aiCoachEnabled", "aiDailyReport", "aiUsageCount", "aiUsageDay", "aiUsageToday", "aiVisionEnabled", "createdAt", "dateFormat", "id", "language", "notifyAppearance", "notifyCoach", "notifyHabits", "notifyNutrition", "notifyTasks", "notifyWorkouts", "plan", "themeMode", "unitSystem", "updatedAt", "userId") SELECT "aiCoachEnabled", "aiDailyReport", "aiUsageCount", "aiUsageDay", "aiUsageToday", "aiVisionEnabled", "createdAt", "dateFormat", "id", "language", "notifyAppearance", "notifyCoach", "notifyHabits", "notifyNutrition", "notifyTasks", "notifyWorkouts", "plan", "themeMode", "unitSystem", "updatedAt", "userId" FROM "UserSettings";
DROP TABLE "UserSettings";
ALTER TABLE "new_UserSettings" RENAME TO "UserSettings";
CREATE UNIQUE INDEX "UserSettings_userId_key" ON "UserSettings"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- Backfill: every existing false is the old column default, never a choice —
-- the switch rendered as a disabled "Скоро" badge, so no user could have set
-- it. Copying those rows forward unchanged would ship the photo analysis they
-- already had as silently switched off.
UPDATE "UserSettings" SET "aiVisionEnabled" = true;
