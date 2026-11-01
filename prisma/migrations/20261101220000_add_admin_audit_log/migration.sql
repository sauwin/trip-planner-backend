CREATE TYPE "AdminAuditAction" AS ENUM (
    'DESTINATION_CREATED',
    'DESTINATION_UPDATED',
    'DESTINATION_DELETED',
    'REVIEW_DELETED',
    'ADMIN_ADDED',
    'ADMIN_REMOVED'
);

CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "actorEmail" TEXT NOT NULL,
    "action" "AdminAuditAction" NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityLabel" TEXT NOT NULL,
    "targetLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");
