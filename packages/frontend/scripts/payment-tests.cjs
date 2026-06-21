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
  listLaunchAccessForAdmin,
  listPaymentOrdersForAdmin,
  requireCreatorAccess,
  verifyLaunchAccessPayment,
} = require('../src/lib/server/payments/service.ts');
const {
  createMemoryPaymentStorage,
  getPaymentStorage,
  resetPaymentStorageForTests,
} = require('../src/lib/server/payments/storage.ts');
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

  storage.createPaymentOrder({
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

test('storage adapter can create and fetch a payment order', () => {
  const storage = createMemoryPaymentStorage();
  storage.createPaymentOrder({
    paymentProvider: 'mock',
    providerOrderId: 'mock_order_fetch',
    providerStatus: 'pending',
    walletAddress: WALLET,
    amount: 1000,
    currency: 'INR',
    status: 'pending',
    createdAt: '2026-01-01T00:00:00.000Z',
  });

  const order = storage.getPaymentOrderByProviderOrderId('mock_order_fetch');
  assert.equal(order.walletAddress, WALLET);
  assert.equal(order.amount, 1000);
});

test('wallet access approval is durable inside the selected storage adapter', () => {
  const storage = createMemoryPaymentStorage();
  storage.approveWalletAccess(WALLET, 'mock', '2026-01-01T00:00:00.000Z');

  const access = storage.getWalletAccess(WALLET);
  assert.equal(access.hasLaunchAccess, true);
  assert.equal(access.paymentProvider, 'mock');
});

test('consumed payment replay protection works at storage level', () => {
  const storage = createMemoryPaymentStorage();
  storage.createPaymentOrder({
    paymentProvider: 'mock',
    providerOrderId: 'mock_order_consumed',
    providerStatus: 'pending',
    walletAddress: WALLET,
    amount: 1000,
    currency: 'INR',
    status: 'pending',
    createdAt: '2026-01-01T00:00:00.000Z',
  });
  storage.markPaymentConsumed('mock_order_consumed', {
    providerPaymentId: 'mock_payment_consumed',
    consumedAt: '2026-01-01T00:01:00.000Z',
  });

  assert.equal(storage.checkPaymentConsumed('mock_payment_consumed'), true);
});

test('production memory-storage guard fails safely', () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousStorage = process.env.PAYMENT_STORAGE;
  resetPaymentStorageForTests();
  process.env.NODE_ENV = 'production';
  process.env.PAYMENT_STORAGE = 'memory';

  assert.throws(() => getPaymentStorage(), /local-development only/);

  resetPaymentStorageForTests();
  if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = previousNodeEnv;
  if (previousStorage === undefined) delete process.env.PAYMENT_STORAGE;
  else process.env.PAYMENT_STORAGE = previousStorage;
});

test('requireCreatorAccess rejects unpaid wallet', () => {
  const storage = createMemoryPaymentStorage();

  assert.throws(() => requireCreatorAccess(WALLET, storage), /Payment required/);
});

test('requireCreatorAccess allows paid wallet', () => {
  const storage = createMemoryPaymentStorage();
  storage.approveWalletAccess(WALLET, 'mock', '2026-01-01T00:00:00.000Z');

  const access = requireCreatorAccess(WALLET, storage);
  assert.equal(access.hasLaunchAccess, true);
});

test('admin list helpers omit secrets and expose safe payment visibility fields', () => {
  const storage = createMemoryPaymentStorage();
  storage.createPaymentOrder({
    paymentProvider: 'mock',
    providerOrderId: 'mock_order_admin',
    providerPaymentId: 'mock_payment_admin',
    providerSignature: 'secret-signature-that-must-not-leak',
    providerStatus: 'successful',
    walletAddress: WALLET,
    amount: 1000,
    currency: 'INR',
    status: 'successful',
    createdAt: '2026-01-01T00:00:00.000Z',
    paidAt: '2026-01-01T00:01:00.000Z',
  });
  storage.approveWalletAccess(WALLET, 'mock', '2026-01-01T00:01:00.000Z');

  const [order] = listPaymentOrdersForAdmin(storage);
  const [access] = listLaunchAccessForAdmin(storage);

  assert.equal(order.providerOrderId, 'mock_order_admin');
  assert.equal(order.walletAddress, WALLET);
  assert.equal(order.amount, 1000);
  assert.equal(order.currency, 'INR');
  assert.equal(order.status, 'successful');
  assert.equal(order.paymentProvider, 'mock');
  assert.equal(Object.prototype.hasOwnProperty.call(order, 'providerSignature'), false);
  assert.equal(access.hasLaunchAccess, true);
});
