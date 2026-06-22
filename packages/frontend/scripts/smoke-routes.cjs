const assert = require('node:assert/strict');

const baseUrl = (process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const debugEnabled = process.env.DEBUG_PAYMENT_STORAGE === 'true';

const pageRoutes = [
  '/',
  '/create-token',
  '/launchpads',
  '/launchpads/create',
  '/dashboard',
  '/vesting',
  '/terms',
  '/privacy',
  '/risk-disclosure',
];

async function checkPage(route) {
  const res = await fetch(`${baseUrl}${route}`, {
    headers: { accept: 'text/html' },
  });
  assert.equal(res.ok, true, `${route} returned ${res.status}`);
  const body = await res.text();
  assert.ok(body.includes('<html'), `${route} did not return HTML`);
  console.log(`PASS ${route} ${res.status}`);
}

async function checkDebugRoute() {
  const route = '/api/debug/payment-storage';
  const res = await fetch(`${baseUrl}${route}`, {
    headers: { accept: 'application/json' },
  });
  const body = await res.json().catch(() => ({}));

  if (debugEnabled) {
    assert.equal(res.status, 200, `${route} expected 200 when debug is enabled`);
    assert.equal(typeof body.safeError, 'string', `${route} missing safeError`);
  } else {
    assert.equal(res.status, 404, `${route} expected 404 when debug is disabled`);
    assert.equal(body.error, 'Not enabled', `${route} expected disabled response`);
  }

  console.log(`PASS ${route} ${res.status}`);
}

async function main() {
  for (const route of pageRoutes) {
    await checkPage(route);
  }
  await checkDebugRoute();
  console.log(`Smoke checks completed against ${baseUrl}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
