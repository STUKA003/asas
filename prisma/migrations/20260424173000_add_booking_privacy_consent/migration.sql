ALTER TABLE "Booking"
  ADD COLUMN IF NOT EXISTS "privacyConsentAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "privacyConsentVersion" TEXT,
  ADD COLUMN IF NOT EXISTS "privacyConsentIp" TEXT;
