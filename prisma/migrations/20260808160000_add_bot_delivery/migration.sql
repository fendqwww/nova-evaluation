-- CreateTable
CREATE TABLE "BotDelivery" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "converted" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BotDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BotSubscriber" (
    "userId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "started" BOOLEAN NOT NULL DEFAULT false,
    "unsubscribed" BOOLEAN NOT NULL DEFAULT false,
    "blocked" BOOLEAN NOT NULL DEFAULT false,
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BotSubscriber_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE INDEX "BotDelivery_userId_sentAt_idx" ON "BotDelivery"("userId", "sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "BotDelivery_userId_kind_day_key" ON "BotDelivery"("userId", "kind", "day");

-- CreateIndex
CREATE INDEX "BotSubscriber_unsubscribed_blocked_idx" ON "BotSubscriber"("unsubscribed", "blocked");

-- AddForeignKey
ALTER TABLE "BotDelivery" ADD CONSTRAINT "BotDelivery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BotSubscriber" ADD CONSTRAINT "BotSubscriber_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
