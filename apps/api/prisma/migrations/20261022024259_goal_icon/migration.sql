-- AlterTable
ALTER TABLE "goals" ADD COLUMN     "icon" TEXT NOT NULL DEFAULT 'target',
ALTER COLUMN "color" SET DEFAULT 'purple';
