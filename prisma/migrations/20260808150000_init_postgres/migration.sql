-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "telegramId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "username" TEXT,
    "languageCode" TEXT,
    "photoUrl" TEXT,
    "onboardingCompletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSettings" (
    "id" TEXT NOT NULL,
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
    "planSince" TIMESTAMP(3),
    "planUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "targetDate" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoalStep" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "isDone" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoalStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Habit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "note" TEXT,
    "frequency" TEXT NOT NULL DEFAULT 'daily',
    "weekdayMask" INTEGER NOT NULL DEFAULT 127,
    "timesPerWeek" INTEGER NOT NULL DEFAULT 3,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Habit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HabitLog" (
    "id" TEXT NOT NULL,
    "habitId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HabitLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "note" TEXT,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workout" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "note" TEXT,
    "category" TEXT NOT NULL DEFAULT 'strength',
    "weekdayMask" INTEGER NOT NULL DEFAULT 0,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Workout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutExercise" (
    "id" TEXT NOT NULL,
    "workoutId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "targetSets" INTEGER NOT NULL DEFAULT 3,
    "targetReps" INTEGER NOT NULL DEFAULT 10,
    "targetWeightKg" DOUBLE PRECISION,
    "restSeconds" INTEGER NOT NULL DEFAULT 90,
    "note" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkoutExercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutSession" (
    "id" TEXT NOT NULL,
    "workoutId" TEXT NOT NULL,
    "day" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkoutSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutSet" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "reps" INTEGER NOT NULL,
    "weightKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkoutSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachMessage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "payload" TEXT,
    "day" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoachMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachMemory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoachMemory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachDailyBrief" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" TIMESTAMP(3) NOT NULL,
    "payload" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoachDailyBrief_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NutritionFood" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "caloriesPer100" DOUBLE PRECISION NOT NULL,
    "proteinPer100" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fatPer100" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "carbsPer100" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NutritionFood_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NutritionEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "foodId" TEXT NOT NULL,
    "mealSlot" TEXT NOT NULL,
    "day" TIMESTAMP(3) NOT NULL,
    "amountG" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NutritionEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NutritionWaterLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" TIMESTAMP(3) NOT NULL,
    "amountMl" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NutritionWaterLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NutritionMealTemplate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mealSlot" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NutritionMealTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NutritionMealTemplateItem" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "foodId" TEXT NOT NULL,
    "amountG" DOUBLE PRECISION NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "NutritionMealTemplateItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NutritionGoal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "calories" INTEGER NOT NULL DEFAULT 0,
    "proteinG" INTEGER NOT NULL DEFAULT 0,
    "fatG" INTEGER NOT NULL DEFAULT 0,
    "carbsG" INTEGER NOT NULL DEFAULT 0,
    "waterMl" INTEGER NOT NULL DEFAULT 2000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NutritionGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppearanceRoutine" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "note" TEXT,
    "category" TEXT NOT NULL DEFAULT 'skin',
    "timeOfDay" TEXT NOT NULL DEFAULT 'any',
    "frequency" TEXT NOT NULL DEFAULT 'daily',
    "weekdayMask" INTEGER NOT NULL DEFAULT 127,
    "timesPerWeek" INTEGER NOT NULL DEFAULT 3,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppearanceRoutine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppearanceStep" (
    "id" TEXT NOT NULL,
    "routineId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppearanceStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppearanceRoutineLog" (
    "id" TEXT NOT NULL,
    "routineId" TEXT NOT NULL,
    "day" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppearanceRoutineLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppearanceStepLog" (
    "id" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "day" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppearanceStepLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppearancePhoto" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'skin',
    "day" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "thumbData" TEXT NOT NULL,
    "imageData" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "analysisJson" TEXT,
    "analyzedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppearancePhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppearanceGoal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "note" TEXT,
    "category" TEXT NOT NULL DEFAULT 'skin',
    "targetDate" TIMESTAMP(3),
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppearanceGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SleepLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" TIMESTAMP(3) NOT NULL,
    "bedTime" TEXT NOT NULL,
    "wakeTime" TEXT NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "quality" INTEGER NOT NULL DEFAULT 3,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SleepLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserConsent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "consentId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "source" TEXT NOT NULL DEFAULT 'onboarding',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserConsent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "periodMonth" TEXT NOT NULL,
    "foodAnalysesUsed" INTEGER NOT NULL DEFAULT 0,
    "appearanceAnalysesUsed" INTEGER NOT NULL DEFAULT 0,
    "coachMessagesUsed" INTEGER NOT NULL DEFAULT 0,
    "foodWeekKey" TEXT,
    "foodWeekUsed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FoodAnalysisCache" (
    "id" TEXT NOT NULL,
    "imageHash" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "hits" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FoodAnalysisCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" SERIAL NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "userId" TEXT,
    "telegramId" TEXT NOT NULL,
    "username" TEXT,
    "firstName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "screenshots" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "assignedTo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportMessage" (
    "id" TEXT NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "author" TEXT NOT NULL,
    "authorTelegramId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportSession" (
    "telegramId" TEXT NOT NULL,
    "step" TEXT NOT NULL DEFAULT 'idle',
    "draftCategory" TEXT,
    "draftMessage" TEXT,
    "draftScreenshots" TEXT NOT NULL DEFAULT '[]',
    "activeTicketId" INTEGER,
    "windowStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "windowCount" INTEGER NOT NULL DEFAULT 0,
    "blockedUntil" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportSession_pkey" PRIMARY KEY ("telegramId")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserSettings_userId_key" ON "UserSettings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "HabitLog_habitId_date_key" ON "HabitLog"("habitId", "date");

-- CreateIndex
CREATE INDEX "WorkoutSession_day_idx" ON "WorkoutSession"("day");

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutSession_workoutId_day_key" ON "WorkoutSession"("workoutId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutSet_sessionId_exerciseId_position_key" ON "WorkoutSet"("sessionId", "exerciseId", "position");

-- CreateIndex
CREATE INDEX "CoachMessage_userId_createdAt_idx" ON "CoachMessage"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "CoachMemory_userId_updatedAt_idx" ON "CoachMemory"("userId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CoachMemory_userId_key_key" ON "CoachMemory"("userId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "CoachDailyBrief_userId_day_key" ON "CoachDailyBrief"("userId", "day");

-- CreateIndex
CREATE INDEX "NutritionFood_userId_isFavorite_idx" ON "NutritionFood"("userId", "isFavorite");

-- CreateIndex
CREATE INDEX "NutritionEntry_userId_day_idx" ON "NutritionEntry"("userId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "NutritionWaterLog_userId_day_key" ON "NutritionWaterLog"("userId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "NutritionGoal_userId_key" ON "NutritionGoal"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AppearanceRoutineLog_routineId_day_key" ON "AppearanceRoutineLog"("routineId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "AppearanceStepLog_stepId_day_key" ON "AppearanceStepLog"("stepId", "day");

-- CreateIndex
CREATE INDEX "AppearancePhoto_userId_day_idx" ON "AppearancePhoto"("userId", "day");

-- CreateIndex
CREATE INDEX "SleepLog_userId_day_idx" ON "SleepLog"("userId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "SleepLog_userId_day_key" ON "SleepLog"("userId", "day");

-- CreateIndex
CREATE INDEX "UserConsent_userId_idx" ON "UserConsent"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserConsent_userId_consentId_key" ON "UserConsent"("userId", "consentId");

-- CreateIndex
CREATE INDEX "UserUsage_userId_foodWeekKey_idx" ON "UserUsage"("userId", "foodWeekKey");

-- CreateIndex
CREATE UNIQUE INDEX "UserUsage_userId_periodMonth_key" ON "UserUsage"("userId", "periodMonth");

-- CreateIndex
CREATE UNIQUE INDEX "FoodAnalysisCache_imageHash_key" ON "FoodAnalysisCache"("imageHash");

-- CreateIndex
CREATE INDEX "FoodAnalysisCache_createdAt_idx" ON "FoodAnalysisCache"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SupportTicket_ticketNumber_key" ON "SupportTicket"("ticketNumber");

-- CreateIndex
CREATE INDEX "SupportTicket_status_createdAt_idx" ON "SupportTicket"("status", "createdAt");

-- CreateIndex
CREATE INDEX "SupportTicket_telegramId_createdAt_idx" ON "SupportTicket"("telegramId", "createdAt");

-- CreateIndex
CREATE INDEX "SupportMessage_ticketId_createdAt_idx" ON "SupportMessage"("ticketId", "createdAt");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalStep" ADD CONSTRAINT "GoalStep_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Habit" ADD CONSTRAINT "Habit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HabitLog" ADD CONSTRAINT "HabitLog_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "Habit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workout" ADD CONSTRAINT "Workout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutExercise" ADD CONSTRAINT "WorkoutExercise_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "Workout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutSession" ADD CONSTRAINT "WorkoutSession_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "Workout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutSet" ADD CONSTRAINT "WorkoutSet_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "WorkoutSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutSet" ADD CONSTRAINT "WorkoutSet_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "WorkoutExercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachMessage" ADD CONSTRAINT "CoachMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachMemory" ADD CONSTRAINT "CoachMemory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachDailyBrief" ADD CONSTRAINT "CoachDailyBrief_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutritionFood" ADD CONSTRAINT "NutritionFood_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutritionEntry" ADD CONSTRAINT "NutritionEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutritionEntry" ADD CONSTRAINT "NutritionEntry_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "NutritionFood"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutritionWaterLog" ADD CONSTRAINT "NutritionWaterLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutritionMealTemplate" ADD CONSTRAINT "NutritionMealTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutritionMealTemplateItem" ADD CONSTRAINT "NutritionMealTemplateItem_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "NutritionMealTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutritionGoal" ADD CONSTRAINT "NutritionGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppearanceRoutine" ADD CONSTRAINT "AppearanceRoutine_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppearanceStep" ADD CONSTRAINT "AppearanceStep_routineId_fkey" FOREIGN KEY ("routineId") REFERENCES "AppearanceRoutine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppearanceRoutineLog" ADD CONSTRAINT "AppearanceRoutineLog_routineId_fkey" FOREIGN KEY ("routineId") REFERENCES "AppearanceRoutine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppearanceStepLog" ADD CONSTRAINT "AppearanceStepLog_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "AppearanceStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppearancePhoto" ADD CONSTRAINT "AppearancePhoto_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppearanceGoal" ADD CONSTRAINT "AppearanceGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SleepLog" ADD CONSTRAINT "SleepLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserConsent" ADD CONSTRAINT "UserConsent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserUsage" ADD CONSTRAINT "UserUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
