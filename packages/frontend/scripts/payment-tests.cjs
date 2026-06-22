const assert = require('node:assert/strict');
const test = require('node:test');
const path = require('node:path');
const Module = require('node:module');

require('ts-node').register({
  transpileOnly: true,
  compilerOptions: {
    module: 'CommonJS',
    moduleResolution: 'node',
  },
});

const srcRoot = path.resolve(__dirname, '../src');
const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function patchedResolveFilename(request, parent, isMain, options) {
  if (request.startsWith('@/')) {
    return originalResolveFilename.call(this, path.join(srcRoot, request.slice(2)), parent, isMain, options);
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

const {
  createLaunchAccessOrder,
  getLaunchAccess,
  listLaunchAccessForAdmin,
  listPaymentOrdersForAdmin,
  requireCreatorAccess,
  verifyLaunchAccessPayment,
} = require('../src/lib/server/payments/service.ts');
const {
  createDatabasePaymentStorage,
  createMemoryPaymentStorage,
  getPaymentStorage,
  resetPaymentStorageForTests,
} = require('../src/lib/server/payments/storage.ts');
const {
  getConfiguredPaymentProviderName,
} = require('../src/lib/server/payments/provider.ts');
const {
  getDatabaseHostType,
  getPaymentStorageDiagnosticCode,
  getPaymentStorageSafeError,
  isPaymentStorageDebugEnabled,
} = require('../src/lib/server/payments/diagnostics.ts');
const authNonceHandler = require('../src/pages/api/auth/nonce.ts').default;
const debugPaymentStorageHandler = require('../src/pages/api/debug/payment-storage.ts').default;
const paymentCreateOrderHandler = require('../src/pages/api/payment/create-order.ts').default;
const paymentVerifyHandler = require('../src/pages/api/payment/verify.ts').default;
const { MockPaymentProvider, createMockPaymentSignature } = require('../src/lib/server/payments/mockProvider.ts');

const WALLET = '0x1111111111111111111111111111111111111111';
const OTHER_WALLET = '0x2222222222222222222222222222222222222222';

function createMockRes() {
  return {
    statusCode: 200,
    headers: {},
    body: undefined,
    setHeader(name, value) {
      this.headers[name] = value;
      return this;
    },
    getHeader(name) {
      return this.headers[name];
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

async function createFixture() {
  const storage = createMemoryPaymentStorage();
  const provider = new MockPaymentProvider();
  const order = await createLaunchAccessOrder(WALLET, { storage, provider });
  return { storage, provider, order };
}

test('valid payment verification approves launch access', async () => {
  const { storage, provider, order } = await createFixture();

  const accessBefore = await getLaunchAccess(WALLET, storage);
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

  await storage.createPaymentOrder({
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

  assert.equal((await getLaunchAccess(WALLET, storage)).hasLaunchAccess, false);
  await verifyLaunchAccessPayment(
    {
      walletAddress: WALLET,
      providerOrderId: order.providerOrderId,
      providerPaymentId: order.providerSessionId,
      providerSignature: order.devProviderSignature,
    },
    { storage, provider },
  );
  assert.equal((await getLaunchAccess(WALLET, storage)).hasLaunchAccess, true);
});

test('storage adapter can create and fetch a payment order', async () => {
  const storage = createMemoryPaymentStorage();
  await storage.createPaymentOrder({
    paymentProvider: 'mock',
    providerOrderId: 'mock_order_fetch',
    providerStatus: 'pending',
    walletAddress: WALLET,
    amount: 1000,
    currency: 'INR',
    status: 'pending',
    createdAt: '2026-01-01T00:00:00.000Z',
  });

  const order = await storage.getPaymentOrderByProviderOrderId('mock_order_fetch');
  assert.equal(order.walletAddress, WALLET);
  assert.equal(order.amount, 1000);
});

test('wallet access approval is durable inside the selected storage adapter', async () => {
  const storage = createMemoryPaymentStorage();
  await storage.approveWalletAccess(WALLET, 'mock', '2026-01-01T00:00:00.000Z');

  const access = await storage.getWalletAccess(WALLET);
  assert.equal(access.hasLaunchAccess, true);
  assert.equal(access.paymentProvider, 'mock');
});

test('consumed payment replay protection works at storage level', async () => {
  const storage = createMemoryPaymentStorage();
  await storage.createPaymentOrder({
    paymentProvider: 'mock',
    providerOrderId: 'mock_order_consumed',
    providerStatus: 'pending',
    walletAddress: WALLET,
    amount: 1000,
    currency: 'INR',
    status: 'pending',
    createdAt: '2026-01-01T00:00:00.000Z',
  });
  await storage.markPaymentConsumed('mock_order_consumed', {
    providerPaymentId: 'mock_payment_consumed',
    consumedAt: '2026-01-01T00:01:00.000Z',
  });

  assert.equal(await storage.checkPaymentConsumed('mock_payment_consumed'), true);
});

test('production memory-storage guard fails safely', () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousStorage = process.env.PAYMENT_STORAGE;
  resetPaymentStorageForTests();
  process.env.NODE_ENV = 'production';
  process.env.PAYMENT_STORAGE = 'memory';

  assert.throws(() => getPaymentStorage(), /PAYMENT_STORAGE=database is required/);

  resetPaymentStorageForTests();
  if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = previousNodeEnv;
  if (previousStorage === undefined) delete process.env.PAYMENT_STORAGE;
  else process.env.PAYMENT_STORAGE = previousStorage;
});

test('production missing payment storage fails safely', () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousStorage = process.env.PAYMENT_STORAGE;
  resetPaymentStorageForTests();
  process.env.NODE_ENV = 'production';
  delete process.env.PAYMENT_STORAGE;

  assert.throws(() => getPaymentStorage(), /PAYMENT_STORAGE=database is required/);

  resetPaymentStorageForTests();
  if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = previousNodeEnv;
  if (previousStorage === undefined) delete process.env.PAYMENT_STORAGE;
  else process.env.PAYMENT_STORAGE = previousStorage;
});

test('invalid payment storage selection fails clearly', () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousStorage = process.env.PAYMENT_STORAGE;
  resetPaymentStorageForTests();
  process.env.NODE_ENV = 'test';
  process.env.PAYMENT_STORAGE = 'unknown';

  assert.throws(() => getPaymentStorage(), /Unsupported PAYMENT_STORAGE/);

  resetPaymentStorageForTests();
  if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = previousNodeEnv;
  if (previousStorage === undefined) delete process.env.PAYMENT_STORAGE;
  else process.env.PAYMENT_STORAGE = previousStorage;
});

test('database storage selection requires DATABASE_URL', () => {
  const previousStorage = process.env.PAYMENT_STORAGE;
  const previousDatabaseUrl = process.env.DATABASE_URL;
  resetPaymentStorageForTests();
  process.env.PAYMENT_STORAGE = 'database';
  delete process.env.DATABASE_URL;

  assert.throws(() => getPaymentStorage(), /DATABASE_URL is required/);

  resetPaymentStorageForTests();
  if (previousStorage === undefined) delete process.env.PAYMENT_STORAGE;
  else process.env.PAYMENT_STORAGE = previousStorage;
  if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = previousDatabaseUrl;
});

test('database adapter methods fail clearly without DATABASE_URL', async () => {
  const previousDatabaseUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = '';
  const storage = createDatabasePaymentStorage();

  await assert.rejects(
    () => storage.getWalletAccess(WALLET),
    /DATABASE_URL is required/,
  );

  if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = previousDatabaseUrl;
});

test('database host classification is safe and specific', () => {
  assert.equal(getDatabaseHostType(undefined), 'missing');
  assert.equal(
    getDatabaseHostType('postgresql://user:pass@aws-0-ap-south-1.pooler.supabase.com:6543/postgres'),
    'pooler',
  );
  assert.equal(
    getDatabaseHostType('postgresql://user:pass@db.project.supabase.co:5432/postgres'),
    'direct-supabase',
  );
  assert.equal(
    getDatabaseHostType('postgresql://user:pass@localhost:5432/postgres'),
    'other',
  );
});

test('diagnostic error codes stay safe and stable', () => {
  assert.equal(
    getPaymentStorageDiagnosticCode(new Error('DATABASE_URL is required when PAYMENT_STORAGE=database.')),
    'DATABASE_URL_MISSING',
  );
  assert.equal(
    getPaymentStorageDiagnosticCode(new Error('PAYMENT_STORAGE=database is required in production.')),
    'PAYMENT_STORAGE_MISSING',
  );
  assert.equal(
    getPaymentStorageDiagnosticCode({ code: 'P1001', message: 'Cannot reach database server.' }),
    'DB_UNREACHABLE',
  );
  assert.equal(
    getPaymentStorageDiagnosticCode({ code: 'P2021', message: 'The table does not exist.' }),
    'PRISMA_TABLE_MISSING',
  );
  assert.equal(
    getPaymentStorageSafeError('PRISMA_CLIENT_ERROR'),
    'Prisma client failed to load.',
  );
});

test('payment provider defaults to mock outside production', () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousProvider = process.env.PAYMENT_PROVIDER;
  process.env.NODE_ENV = 'test';
  delete process.env.PAYMENT_PROVIDER;

  assert.equal(getConfiguredPaymentProviderName(), 'mock');

  if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = previousNodeEnv;
  if (previousProvider === undefined) delete process.env.PAYMENT_PROVIDER;
  else process.env.PAYMENT_PROVIDER = previousProvider;
});

test('payment provider must be explicit in production', () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousProvider = process.env.PAYMENT_PROVIDER;
  process.env.NODE_ENV = 'production';
  delete process.env.PAYMENT_PROVIDER;

  assert.throws(
    () => getConfiguredPaymentProviderName(),
    /PAYMENT_PROVIDER must be explicitly set/,
  );

  process.env.PAYMENT_PROVIDER = 'invalid';
  assert.throws(
    () => getConfiguredPaymentProviderName(),
    /Unsupported PAYMENT_PROVIDER/,
  );

  if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = previousNodeEnv;
  if (previousProvider === undefined) delete process.env.PAYMENT_PROVIDER;
  else process.env.PAYMENT_PROVIDER = previousProvider;
});

test('diagnostics endpoint is disabled by default', async () => {
  const previous = process.env.DEBUG_PAYMENT_STORAGE;
  delete process.env.DEBUG_PAYMENT_STORAGE;

  const req = { method: 'GET' };
  const res = createMockRes();
  await debugPaymentStorageHandler(req, res);

  assert.equal(isPaymentStorageDebugEnabled(), false);
  assert.equal(res.statusCode, 404);
  assert.deepEqual(res.body, { error: 'Not enabled' });

  if (previous === undefined) delete process.env.DEBUG_PAYMENT_STORAGE;
  else process.env.DEBUG_PAYMENT_STORAGE = previous;
});

test('diagnostics endpoint is enabled only when DEBUG_PAYMENT_STORAGE=true', async () => {
  const previousDebug = process.env.DEBUG_PAYMENT_STORAGE;
  const previousStorage = process.env.PAYMENT_STORAGE;
  const previousUrl = process.env.DATABASE_URL;
  process.env.DEBUG_PAYMENT_STORAGE = 'true';
  process.env.PAYMENT_STORAGE = 'database';
  delete process.env.DATABASE_URL;

  const req = { method: 'GET' };
  const res = createMockRes();
  await debugPaymentStorageHandler(req, res);

  assert.equal(isPaymentStorageDebugEnabled(), true);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.hasDatabaseUrl, false);
  assert.equal(res.body.safeError, 'Database URL is missing.');

  if (previousDebug === undefined) delete process.env.DEBUG_PAYMENT_STORAGE;
  else process.env.DEBUG_PAYMENT_STORAGE = previousDebug;
  if (previousStorage === undefined) delete process.env.PAYMENT_STORAGE;
  else process.env.PAYMENT_STORAGE = previousStorage;
  if (previousUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = previousUrl;
});

test('payment create-order returns JSON error payloads', async () => {
  const req = { method: 'POST', cookies: {}, body: { walletAddress: WALLET } };
  const res = createMockRes();
  await paymentCreateOrderHandler(req, res);

  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, { error: 'Verify your wallet first.' });
});

test('payment verify returns JSON error payloads', async () => {
  const req = { method: 'POST', cookies: {}, body: { walletAddress: WALLET } };
  const res = createMockRes();
  await paymentVerifyHandler(req, res);

  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, { error: 'Verify your wallet first.' });
});

test('auth nonce returns JSON error payloads', async () => {
  const req = { method: 'POST', body: { address: 'bad-address' } };
  const res = createMockRes();
  await authNonceHandler(req, res);

  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, { error: 'Invalid address' });
});

test('requireCreatorAccess rejects unpaid wallet', async () => {
  const storage = createMemoryPaymentStorage();

  await assert.rejects(() => requireCreatorAccess(WALLET, storage), /Payment required/);
});

test('requireCreatorAccess allows paid wallet', async () => {
  const storage = createMemoryPaymentStorage();
  await storage.approveWalletAccess(WALLET, 'mock', '2026-01-01T00:00:00.000Z');

  const access = await requireCreatorAccess(WALLET, storage);
  assert.equal(access.hasLaunchAccess, true);
});

test('admin list helpers omit secrets and expose safe payment visibility fields', async () => {
  const storage = createMemoryPaymentStorage();
  await storage.createPaymentOrder({
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
  await storage.approveWalletAccess(WALLET, 'mock', '2026-01-01T00:01:00.000Z');

  const [order] = await listPaymentOrdersForAdmin(storage);
  const [access] = await listLaunchAccessForAdmin(storage);

  assert.equal(order.providerOrderId, 'mock_order_admin');
  assert.equal(order.walletAddress, WALLET);
  assert.equal(order.amount, 1000);
  assert.equal(order.currency, 'INR');
  assert.equal(order.status, 'successful');
  assert.equal(order.paymentProvider, 'mock');
  assert.equal(Object.prototype.hasOwnProperty.call(order, 'providerSignature'), false);
  assert.equal(access.hasLaunchAccess, true);
});
