-- CreateEnum
CREATE TYPE "InteractionType" AS ENUM ('VIEW', 'LIKE', 'RATING', 'SAVE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "country" TEXT,
    "ageRange" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Destination" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "translations" JSONB NOT NULL,
    "popularityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Destination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureCategory" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "defaultWeight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,

    CONSTRAINT "FeatureCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feature" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "Feature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DestinationFeature" (
    "destinationId" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,

    CONSTRAINT "DestinationFeature_pkey" PRIMARY KEY ("destinationId","featureId")
);

-- CreateTable
CREATE TABLE "Interaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "destinationId" TEXT NOT NULL,
    "type" "InteractionType" NOT NULL,
    "value" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Interaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trip" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Trip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripDestination" (
    "tripId" TEXT NOT NULL,
    "destinationId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "plannedDate" TIMESTAMP(3),

    CONSTRAINT "TripDestination_pkey" PRIMARY KEY ("tripId","destinationId")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Destination_slug_key" ON "Destination"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureCategory_key_key" ON "FeatureCategory"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Feature_key_key" ON "Feature"("key");

-- CreateIndex
CREATE INDEX "DestinationFeature_featureId_idx" ON "DestinationFeature"("featureId");

-- CreateIndex
CREATE INDEX "Interaction_userId_createdAt_idx" ON "Interaction"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Interaction_destinationId_idx" ON "Interaction"("destinationId");

-- AddForeignKey
ALTER TABLE "Feature" ADD CONSTRAINT "Feature_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "FeatureCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DestinationFeature" ADD CONSTRAINT "DestinationFeature_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DestinationFeature" ADD CONSTRAINT "DestinationFeature_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "Feature"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripDestination" ADD CONSTRAINT "TripDestination_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripDestination" ADD CONSTRAINT "TripDestination_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE CASCADE ON UPDATE CASCADE;
