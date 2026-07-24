-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Profile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "heightCm" INTEGER NOT NULL,
    "weightKg" INTEGER NOT NULL,
    "gender" TEXT NOT NULL,
    "primaryGoal" TEXT NOT NULL,
    "occupation" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "themeColor" TEXT NOT NULL DEFAULT 'ocean',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Profile" ("age", "createdAt", "gender", "heightCm", "id", "name", "occupation", "primaryGoal", "timezone", "updatedAt", "userId", "weightKg") SELECT "age", "createdAt", "gender", "heightCm", "id", "name", "occupation", "primaryGoal", "timezone", "updatedAt", "userId", "weightKg" FROM "Profile";
DROP TABLE "Profile";
ALTER TABLE "new_Profile" RENAME TO "Profile";
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
