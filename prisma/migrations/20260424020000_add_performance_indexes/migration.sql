CREATE INDEX IF NOT EXISTS "Barbershop_suspended_idx" ON "Barbershop"(suspended);
CREATE INDEX IF NOT EXISTS "Barbershop_subscriptionPlan_idx" ON "Barbershop"("subscriptionPlan");
CREATE INDEX IF NOT EXISTS "Booking_barbershopId_startTime_idx" ON "Booking"("barbershopId", "startTime");
CREATE INDEX IF NOT EXISTS "Booking_barbershopId_status_startTime_idx" ON "Booking"("barbershopId", status, "startTime");
CREATE INDEX IF NOT EXISTS "Booking_barberId_startTime_idx" ON "Booking"("barberId", "startTime");
CREATE INDEX IF NOT EXISTS "WorkingHours_barbershopId_idx" ON "WorkingHours"("barbershopId");
CREATE INDEX IF NOT EXISTS "WorkingHours_barbershopId_barberId_idx" ON "WorkingHours"("barbershopId", "barberId");
CREATE INDEX IF NOT EXISTS "Notification_barbershopId_read_createdAt_idx" ON "Notification"("barbershopId", read, "createdAt");
