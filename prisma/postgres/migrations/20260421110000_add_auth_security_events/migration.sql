-- CreateEnum
CREATE TYPE "AuthSecurityEventType" AS ENUM ('LOGIN_SUCCESS', 'LOGIN_FAILURE', 'PASSWORD_RESET_REQUEST');

-- CreateTable
CREATE TABLE "AuthSecurityEvent" (
    "id" TEXT NOT NULL,
    "type" "AuthSecurityEventType" NOT NULL,
    "reason" TEXT,
    "email" TEXT,
    "slug" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT,
    "barbershopId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthSecurityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuthSecurityEvent_barbershopId_type_createdAt_idx" ON "AuthSecurityEvent"("barbershopId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "AuthSecurityEvent_userId_type_createdAt_idx" ON "AuthSecurityEvent"("userId", "type", "createdAt");

-- AddForeignKey
ALTER TABLE "AuthSecurityEvent" ADD CONSTRAINT "AuthSecurityEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthSecurityEvent" ADD CONSTRAINT "AuthSecurityEvent_barbershopId_fkey" FOREIGN KEY ("barbershopId") REFERENCES "Barbershop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
