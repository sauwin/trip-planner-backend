CREATE TABLE "DestinationReview" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "destinationId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "photos" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DestinationReview_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DestinationReview_userId_destinationId_key"
ON "DestinationReview"("userId", "destinationId");

CREATE INDEX "DestinationReview_destinationId_createdAt_idx"
ON "DestinationReview"("destinationId", "createdAt");

ALTER TABLE "DestinationReview"
ADD CONSTRAINT "DestinationReview_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DestinationReview"
ADD CONSTRAINT "DestinationReview_destinationId_fkey"
FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE CASCADE ON UPDATE CASCADE;
