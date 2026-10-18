-- DropForeignKey
ALTER TABLE "PointOfInterest" DROP CONSTRAINT "PointOfInterest_destinationId_fkey";

-- DropTable
DROP TABLE "PointOfInterest";

-- DropEnum
DROP TYPE "PoiCategory";
