-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Expense_tripId_idx" ON "Expense"("tripId");

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
