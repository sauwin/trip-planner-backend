ALTER TABLE "Destination"
ADD COLUMN "popularityScore" DOUBLE PRECISION NOT NULL DEFAULT 0;

UPDATE "Destination" AS destination
SET "popularityScore" = COALESCE(
  (
    SELECT AVG(review."rating")::DOUBLE PRECISION
    FROM "DestinationReview" AS review
    WHERE review."destinationId" = destination."id"
  ),
  0
);
