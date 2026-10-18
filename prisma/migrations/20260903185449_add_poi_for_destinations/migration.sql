-- CreateEnum
CREATE TYPE "PoiCategory" AS ENUM ('ATTRACTION', 'MUSEUM', 'VIEWPOINT', 'RESTAURANT', 'CAFE', 'PARK', 'OTHER');

-- CreateTable
CREATE TABLE "PointOfInterest" (
    "id" TEXT NOT NULL,
    "destinationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "PoiCategory" NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointOfInterest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PointOfInterest_destinationId_idx" ON "PointOfInterest"("destinationId");

-- AddForeignKey
ALTER TABLE "PointOfInterest" ADD CONSTRAINT "PointOfInterest_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE CASCADE ON UPDATE CASCADE;
