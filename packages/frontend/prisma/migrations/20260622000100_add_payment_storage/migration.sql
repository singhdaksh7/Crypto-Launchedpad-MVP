CREATE TABLE "PaymentOrder" (
    "id" TEXT NOT NULL,
    "paymentProvider" TEXT NOT NULL,
    "providerOrderId" TEXT NOT NULL,
    "providerPaymentId" TEXT,
    "providerTransactionId" TEXT,
    "walletAddress" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "providerStatus" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "PaymentOrder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConsumedPayment" (
    "id" TEXT NOT NULL,
    "paymentProvider" TEXT NOT NULL,
    "providerPaymentId" TEXT,
    "providerTransactionId" TEXT,
    "consumeKey" TEXT NOT NULL,
    "providerOrderId" TEXT,
    "walletAddress" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsumedPayment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WalletAccess" (
    "id" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "hasLaunchAccess" BOOLEAN NOT NULL DEFAULT false,
    "paymentProvider" TEXT,
    "providerOrderId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WalletAccess_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PaymentOrder_providerOrderId_key" ON "PaymentOrder"("providerOrderId");
CREATE INDEX "PaymentOrder_walletAddress_idx" ON "PaymentOrder"("walletAddress");
CREATE INDEX "PaymentOrder_status_idx" ON "PaymentOrder"("status");

CREATE UNIQUE INDEX "ConsumedPayment_consumeKey_key" ON "ConsumedPayment"("consumeKey");
CREATE INDEX "ConsumedPayment_walletAddress_idx" ON "ConsumedPayment"("walletAddress");

CREATE UNIQUE INDEX "WalletAccess_walletAddress_key" ON "WalletAccess"("walletAddress");

ALTER TABLE "ConsumedPayment"
ADD CONSTRAINT "ConsumedPayment_providerOrderId_fkey"
FOREIGN KEY ("providerOrderId") REFERENCES "PaymentOrder"("providerOrderId")
ON DELETE SET NULL ON UPDATE CASCADE;
