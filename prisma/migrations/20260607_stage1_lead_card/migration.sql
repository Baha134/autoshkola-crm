-- Stage 1: Карточка лида — финансы + напоминание о звонке

ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "courseAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "nextCallAt" TIMESTAMP(3);
