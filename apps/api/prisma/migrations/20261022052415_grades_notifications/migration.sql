-- CreateEnum
CREATE TYPE "GradeScale" AS ENUM ('LETTER_AB', 'PLUS_MINUS');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "grade_scale" "GradeScale" NOT NULL DEFAULT 'LETTER_AB',
ADD COLUMN     "notifications_seen_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "semesters" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "label" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "semesters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "semester_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "credits" INTEGER NOT NULL,
    "grade" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "semesters_user_id_number_key" ON "semesters"("user_id", "number");

-- CreateIndex
CREATE INDEX "courses_semester_id_idx" ON "courses"("semester_id");

-- CreateIndex
CREATE INDEX "courses_user_id_idx" ON "courses"("user_id");

-- AddForeignKey
ALTER TABLE "semesters" ADD CONSTRAINT "semesters_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_semester_id_fkey" FOREIGN KEY ("semester_id") REFERENCES "semesters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
