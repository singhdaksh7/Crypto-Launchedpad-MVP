# Frontend

Next.js frontend for the LaunchBNB BSC launchpad demo.

## Production demo notes

- Creator launch access is persisted with Prisma when `PAYMENT_STORAGE=database`.
- Vercel deployments should use a Supabase pooler `DATABASE_URL`, not a direct database host.
- Demo and staging should keep `PAYMENT_PROVIDER=mock` until SMEPay endpoint and webhook documentation is available.
- `DEBUG_PAYMENT_STORAGE` is temporary only and must remain disabled except during active debugging.
- `prebuild` runs `prisma generate`, and production rollouts must run `prisma migrate deploy` before relying on creator payment access.
- Never commit `.env` or `.env.local`.

## Important environment variables

See [.env.example](./.env.example) for the full template.

```bash
PAYMENT_STORAGE=database
PAYMENT_PROVIDER=mock
DATABASE_URL=postgresql://...pooler.supabase.com:6543/postgres
JWT_SECRET=...
MOCK_PAYMENT_SECRET=...
DEBUG_PAYMENT_STORAGE=false
```

## Useful commands

```bash
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
npm run smoke
npm run prisma:generate
npx prisma migrate deploy
```

## Local route smoke test

Run the app locally, then execute:

```bash
SMOKE_BASE_URL=http://127.0.0.1:3000 npm run smoke
```

The smoke script checks the main pages plus `/api/debug/payment-storage`. It expects the debug route to return `404` unless `DEBUG_PAYMENT_STORAGE=true`.

## Staging QA checklist

Full BSC Testnet staging flow:

- [docs/staging-e2e-checklist.md](./docs/staging-e2e-checklist.md)

## Debug endpoint

`/api/debug/payment-storage` is a temporary diagnostics route.

- It returns `404` unless `DEBUG_PAYMENT_STORAGE=true`.
- It reports safe status only and never returns secrets or the full `DATABASE_URL`.
- Disable it immediately after diagnosing Vercel payment-storage problems.

## Payment provider status

- Mock provider stays enabled for staging and demo flows.
- SMEPay integration is intentionally pending until official API endpoints and webhook docs are available.
- No Razorpay integration is used or required.
