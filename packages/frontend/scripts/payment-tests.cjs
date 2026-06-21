const assert = require('node:assert/strict');
const test = require('node:test');

require('ts-node').register({
  transpileOnly: true,
  compilerOptions: {
    module: 'CommonJS',
    moduleResolution: 'node',
  },
});

const {
  createLaunchAccessOrder,
  getLaunchAccess,
  verifyLaunchAccessPayment,
} = require('../src/lib/server/payments/service.ts');
const { createMemoryPaymentStorage } = require('../src/lib/server/payments/storage.ts');
const { MockPaymentProvider, createMockPaymentSignature } = require('../src/lib/server/payments/mockProvider.ts');

const WALLET = '0x1111111111111111111111111111111111111111';
const OTHER_WALLET = '0x2222222222222222222222222222222222222222';

async function createFixture() {
  const storage = createMemoryPaymentStorage();
  const provider = new MockPaymentProvider();
  const order = await createLaunchAccessOrder(WALLET, { storage, provider });
  return { storage, provider, order };
}

test('valid payment verification approves launch access', async () => {
  const { storage, provider, order } = await createFixture();

  const accessBefore = getLaunchAccess(WALLET, storage);
  assert.equal(accessBefore.hasLaunchAccess, false);

  const access = await verifyLaunchAccessPayment(
    {
      walletAddress: WALLET,
      providerOrderId: order.providerOrderId,
      providerPaymentId: order.providerSessionId,
      providerSignature: order.devProviderSignature,
    },
    { storage, provider },
  );

  assert.equal(access.walletAddress, WALLET);
  assert.equal(access.hasLaunchAccess, true);
  assert.equal(access.paymentProvider, 'mock');
});

test('wrong wallet cannot verify another wallet order', async () => {
  const { storage, provider, order } = await createFixture();

  await assert.rejects(
    () =>
      verifyLaunchAccessPayment(
        {
          walletAddress: OTHER_WALLET,
          providerOrderId: order.providerOrderId,
          providerPaymentId: order.providerSessionId,
          providerSignature: order.devProviderSignature,
        },
        { storage, provider },
      ),
    /does not belong/,
  );
});

test('replayed payment verification is rejected', async () => {
  const { storage, provider, order } = await createFixture();
  const payload = {
    walletAddress: WALLET,
    providerOrderId: order.providerOrderId,
    providerPaymentId: order.providerSessionId,
    providerSignature: order.devProviderSignature,
  };

  await verifyLaunchAccessPayment(payload, { storage, provider });
  await assert.rejects(
    () => verifyLaunchAccessPayment(payload, { storage, provider }),
    /already/,
  );
});

test('invalid signature is rejected', async () => {
  const { storage, provider, order } = await createFixture();

  await assert.rejects(
    () =>
      verifyLaunchAccessPayment(
        {
          walletAddress: WALLET,
          providerOrderId: order.providerOrderId,
          providerPaymentId: order.providerSessionId,
          providerSignature: 'bad-signature',
        },
        { storage, provider },
      ),
    /Invalid payment signature/,
  );
});

test('wrong amount is rejected', async () => {
  const storage = createMemoryPaymentStorage();
  const provider = new MockPaymentProvider();
  const providerOrderId = 'mock_order_wrong_amount';
  const providerPaymentId = 'mock_payment_wrong_amount';
  const providerStatus = 'successful';

  storage.saveOrder({
    paymentProvider: 'mock',
    providerOrderId,
    providerStatus: 'pending',
    walletAddress: WALLET,
    amount: 999,
    currency: 'INR',
    status: 'pending',
    createdAt: new Date().toISOString(),
  });

  await assert.rejects(
    () =>
      verifyLaunchAccessPayment(
        {
          walletAddress: WALLET,
          providerOrderId,
          providerPaymentId,
          providerSignature: createMockPaymentSignature({
            providerOrderId,
            providerPaymentId,
            walletAddress: WALLET,
            amount: 1000,
            currency: 'INR',
            providerStatus,
          }),
        },
        { storage, provider },
      ),
    /amount mismatch/,
  );
});

test('access lookup returns false before payment and true after payment', async () => {
  const { storage, provider, order } = await createFixture();

  assert.equal(getLaunchAccess(WALLET, storage).hasLaunchAccess, false);
  await verifyLaunchAccessPayment(
    {
      walletAddress: WALLET,
      providerOrderId: order.providerOrderId,
      providerPaymentId: order.providerSessionId,
      providerSignature: order.devProviderSignature,
    },
    { storage, provider },
  );
  assert.equal(getLaunchAccess(WALLET, storage).hasLaunchAccess, true);
});
