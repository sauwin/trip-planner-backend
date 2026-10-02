DROP INDEX "UserPreference_userId_categoryId_key";

CREATE UNIQUE INDEX "UserPreference_userId_categoryId_featureId_key"
ON "UserPreference"("userId", "categoryId", "featureId");
