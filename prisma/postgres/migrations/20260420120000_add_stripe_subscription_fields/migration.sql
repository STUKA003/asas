ALTER TABLE "Barbershop"
ADD COLUMN "stripeCustomerId" TEXT,
ADD COLUMN "stripeSubscriptionId" TEXT,
ADD COLUMN "stripeSubscriptionStatus" TEXT;

CREATE UNIQUE INDEX "Barbershop_stripeCustomerId_key" ON "Barbershop"("stripeCustomerId");
CREATE UNIQUE INDEX "Barbershop_stripeSubscriptionId_key" ON "Barbershop"("stripeSubscriptionId");
