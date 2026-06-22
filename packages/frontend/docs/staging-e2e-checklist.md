# Stage 5.3 BSC Testnet E2E QA Checklist

Use this checklist for full staging verification before promoting a deployment.

## Session setup

- Start with a clean browser session.
- Clear prior LaunchBNB cookies or open a fresh private window.
- Confirm the deployment points to BSC Testnet, not mainnet.

## Wallet and network

- Open `/`.
- Connect a supported wallet.
- Confirm the UI shows `BSC Testnet` when the wallet is on chain `97`.
- Switch the wallet to the wrong network and verify creator-gated flows show the wrong-network warning.
- Switch back to BSC Testnet and confirm the warning clears.

## Wallet verification and creator access

- Open `/create-token`.
- Verify the access gate loads without raw HTML errors.
- Trigger wallet verification and confirm the signature prompt appears.
- Reject the signature once and confirm the UI shows a safe JSON-backed error.
- Retry verification and complete the signature successfully.
- Confirm demo payment mode is clearly labeled when `PAYMENT_PROVIDER=mock`.
- Start the mock payment flow and complete mock verification.
- Confirm creator launch access is approved after server-side verification.

## Token and presale flow

- Create a BEP-20 token on BSC Testnet.
- Confirm the success state shows contract information and the link into presale creation.
- Open `/launchpads/create` and verify the creator safety checklist is visible.
- Create a presale using the newly created token.
- Confirm the success state loads and the funding panel appears when applicable.
- Open `/launchpads` and verify the new presale appears in the listing if supported by current data flow.
- Open the presale detail page and confirm pricing, caps, and timeline render correctly.

## Buyer and lifecycle checks

- If contribution flow is enabled in the current environment, test a small BSC Testnet contribution.
- Verify claim UI appears only when the presale state allows it.
- Verify refund UI appears only when the presale state allows it.
- Confirm no creator-only action appears unlocked for an unverified or unpaid wallet.

## Dashboard and legal routes

- Open `/dashboard` and confirm creator visibility is correct after launch access is granted.
- Open `/vesting` and confirm the page renders without layout breakage.
- Open `/terms`, `/privacy`, and `/risk-disclosure`.
- Verify footer links navigate correctly on both desktop and mobile widths.

## Mobile responsive pass

- Repeat homepage, access gate, token creation, presale creation, and legal-page checks at a narrow mobile width.
- Confirm the navbar drawer opens cleanly and links remain usable.
- Confirm the demo payment label and creator checklist do not overflow on mobile.

## Debug route safety

- Confirm `/api/debug/payment-storage` returns disabled behavior when `DEBUG_PAYMENT_STORAGE=false`.
- Only enable `DEBUG_PAYMENT_STORAGE=true` briefly during active debugging.
- Disable the debug route again before final sign-off.

## Deployment sign-off

- Confirm production-safe logs show short diagnostic codes only.
- Confirm no secret values, raw `DATABASE_URL`, or payment signatures appear in browser UI or server logs.
- Confirm `.env` and `.env.local` are not committed.
