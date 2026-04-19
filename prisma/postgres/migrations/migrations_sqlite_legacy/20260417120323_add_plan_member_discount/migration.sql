-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Barbershop" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "whatsapp" TEXT,
    "instagram" TEXT,
    "logoUrl" TEXT,
    "heroImageUrl" TEXT,
    "heroTitle" TEXT,
    "heroSubtitle" TEXT,
    "heroButtonText" TEXT,
    "aboutText" TEXT,
    "galleryImages" TEXT,
    "promoEnabled" BOOLEAN NOT NULL DEFAULT false,
    "promoTitle" TEXT,
    "promoText" TEXT,
    "promoButtonText" TEXT,
    "showPlans" BOOLEAN NOT NULL DEFAULT true,
    "showProducts" BOOLEAN NOT NULL DEFAULT true,
    "planMemberDiscount" INTEGER NOT NULL DEFAULT 0,
    "accentColor" TEXT NOT NULL DEFAULT 'orange',
    "subscriptionPlan" TEXT NOT NULL DEFAULT 'FREE',
    "subscriptionEndsAt" DATETIME,
    "suspended" BOOLEAN NOT NULL DEFAULT false,
    "suspendedReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Barbershop" ("aboutText", "accentColor", "address", "createdAt", "galleryImages", "heroButtonText", "heroImageUrl", "heroSubtitle", "heroTitle", "id", "instagram", "logoUrl", "name", "phone", "promoButtonText", "promoEnabled", "promoText", "promoTitle", "showPlans", "showProducts", "slug", "subscriptionEndsAt", "subscriptionPlan", "suspended", "suspendedReason", "updatedAt", "whatsapp") SELECT "aboutText", "accentColor", "address", "createdAt", "galleryImages", "heroButtonText", "heroImageUrl", "heroSubtitle", "heroTitle", "id", "instagram", "logoUrl", "name", "phone", "promoButtonText", "promoEnabled", "promoText", "promoTitle", "showPlans", "showProducts", "slug", "subscriptionEndsAt", "subscriptionPlan", "suspended", "suspendedReason", "updatedAt", "whatsapp" FROM "Barbershop";
DROP TABLE "Barbershop";
ALTER TABLE "new_Barbershop" RENAME TO "Barbershop";
CREATE UNIQUE INDEX "Barbershop_slug_key" ON "Barbershop"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
