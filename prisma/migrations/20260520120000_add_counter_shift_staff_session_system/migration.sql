-- CreateTable: Counter
CREATE TABLE "Counter" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "printerName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Counter_pkey" PRIMARY KEY ("id")
);

-- CreateTable: CounterShift
CREATE TABLE "CounterShift" (
    "id" TEXT NOT NULL,
    "counterId" TEXT NOT NULL,
    "openedBy" TEXT NOT NULL,
    "closedBy" TEXT,
    "openingCash" DOUBLE PRECISION NOT NULL,
    "openingNote" TEXT,
    "closingCash" DOUBLE PRECISION,
    "closingNote" TEXT,
    "closingTime" TIMESTAMP(3),
    "expectedCash" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cashDifference" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalSales" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCashSales" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalUpiSales" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCardSales" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCreditSales" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalReturns" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalExpenses" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalInvoices" INTEGER NOT NULL DEFAULT 0,
    "shiftStatus" TEXT NOT NULL DEFAULT 'Open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CounterShift_pkey" PRIMARY KEY ("id")
);

-- CreateTable: StaffSession
CREATE TABLE "StaffSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "counterShiftId" TEXT NOT NULL,
    "counterId" TEXT NOT NULL,
    "loginTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "logoutTime" TIMESTAMP(3),
    "sessionStatus" TEXT NOT NULL DEFAULT 'Active',
    "totalInvoices" INTEGER NOT NULL DEFAULT 0,
    "totalSales" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable: CashWithdrawal
CREATE TABLE "CashWithdrawal" (
    "id" TEXT NOT NULL,
    "counterShiftId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "withdrawnBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CashWithdrawal_pkey" PRIMARY KEY ("id")
);

-- AlterTable: Add counterShiftId and counterId to Sale
ALTER TABLE "Sale" ADD COLUMN "counterShiftId" TEXT;
ALTER TABLE "Sale" ADD COLUMN "counterId" TEXT;

-- CreateIndex: CounterShift.counterId
CREATE INDEX "CounterShift_counterId_idx" ON "CounterShift"("counterId");

-- CreateIndex: CounterShift.openedBy
CREATE INDEX "CounterShift_openedBy_idx" ON "CounterShift"("openedBy");

-- CreateIndex: CounterShift.closedBy
CREATE INDEX "CounterShift_closedBy_idx" ON "CounterShift"("closedBy");

-- CreateIndex: CounterShift.shiftStatus
CREATE INDEX "CounterShift_shiftStatus_idx" ON "CounterShift"("shiftStatus");

-- CreateIndex: StaffSession.userId
CREATE INDEX "StaffSession_userId_idx" ON "StaffSession"("userId");

-- CreateIndex: StaffSession.counterShiftId
CREATE INDEX "StaffSession_counterShiftId_idx" ON "StaffSession"("counterShiftId");

-- CreateIndex: StaffSession.counterId
CREATE INDEX "StaffSession_counterId_idx" ON "StaffSession"("counterId");

-- CreateIndex: StaffSession.sessionStatus
CREATE INDEX "StaffSession_sessionStatus_idx" ON "StaffSession"("sessionStatus");

-- CreateIndex: CashWithdrawal.counterShiftId
CREATE INDEX "CashWithdrawal_counterShiftId_idx" ON "CashWithdrawal"("counterShiftId");

-- CreateIndex: Sale.counterShiftId
CREATE INDEX "Sale_counterShiftId_idx" ON "Sale"("counterShiftId");

-- CreateIndex: Sale.counterId
CREATE INDEX "Sale_counterId_idx" ON "Sale"("counterId");

-- AddForeignKey: CounterShift -> Counter
ALTER TABLE "CounterShift" ADD CONSTRAINT "CounterShift_counterId_fkey" FOREIGN KEY ("counterId") REFERENCES "Counter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: CounterShift -> User (openedBy)
ALTER TABLE "CounterShift" ADD CONSTRAINT "CounterShift_openedBy_fkey" FOREIGN KEY ("openedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: CounterShift -> User (closedBy)
ALTER TABLE "CounterShift" ADD CONSTRAINT "CounterShift_closedBy_fkey" FOREIGN KEY ("closedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: Sale -> CounterShift
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_counterShiftId_fkey" FOREIGN KEY ("counterShiftId") REFERENCES "CounterShift"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: StaffSession -> User
ALTER TABLE "StaffSession" ADD CONSTRAINT "StaffSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: StaffSession -> CounterShift
ALTER TABLE "StaffSession" ADD CONSTRAINT "StaffSession_counterShiftId_fkey" FOREIGN KEY ("counterShiftId") REFERENCES "CounterShift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: StaffSession -> Counter
ALTER TABLE "StaffSession" ADD CONSTRAINT "StaffSession_counterId_fkey" FOREIGN KEY ("counterId") REFERENCES "Counter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: CashWithdrawal -> CounterShift
ALTER TABLE "CashWithdrawal" ADD CONSTRAINT "CashWithdrawal_counterShiftId_fkey" FOREIGN KEY ("counterShiftId") REFERENCES "CounterShift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: CashWithdrawal -> User
ALTER TABLE "CashWithdrawal" ADD CONSTRAINT "CashWithdrawal_withdrawnBy_fkey" FOREIGN KEY ("withdrawnBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Insert default counter
INSERT INTO "Counter" ("id", "name", "location", "status", "createdAt", "updatedAt")
VALUES ('default_counter_1', 'Counter 1', 'Main', 'Active', NOW(), NOW());
