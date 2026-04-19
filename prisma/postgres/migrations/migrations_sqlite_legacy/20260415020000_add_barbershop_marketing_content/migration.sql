ALTER TABLE "Barbershop" ADD COLUMN "galleryImages" TEXT;
ALTER TABLE "Barbershop" ADD COLUMN "promoEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Barbershop" ADD COLUMN "promoTitle" TEXT;
ALTER TABLE "Barbershop" ADD COLUMN "promoText" TEXT;
ALTER TABLE "Barbershop" ADD COLUMN "promoButtonText" TEXT;
ALTER TABLE "Barbershop" ADD COLUMN "showPlans" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Barbershop" ADD COLUMN "showProducts" BOOLEAN NOT NULL DEFAULT true;
