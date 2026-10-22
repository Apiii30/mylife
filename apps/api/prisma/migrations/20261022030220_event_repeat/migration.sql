-- CreateEnum
CREATE TYPE "EventRepeat" AS ENUM ('NONE', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY');

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "repeat" "EventRepeat" NOT NULL DEFAULT 'NONE';
