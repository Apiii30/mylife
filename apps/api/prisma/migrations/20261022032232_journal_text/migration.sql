-- AlterTable
ALTER TABLE "journals" ADD COLUMN     "plain_text" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "word_count" INTEGER NOT NULL DEFAULT 0;
