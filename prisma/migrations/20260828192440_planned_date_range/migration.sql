/*
  Warnings:

  - You are about to drop the column `plannedDate` on the `TripDestination` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "TripDestination" DROP COLUMN "plannedDate",
ADD COLUMN     "plannedDateEnd" TIMESTAMP(3),
ADD COLUMN     "plannedDateStart" TIMESTAMP(3);
