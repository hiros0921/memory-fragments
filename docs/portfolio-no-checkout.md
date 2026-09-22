# Portfolio public screen: no new checkout

## Approved scope

The public website is a portfolio, not a new subscription sales channel. Remove
purchase UI and checkout calls while retaining the source as implementation
evidence. Keep existing data, entitlements, contracts, and the 50-entry free limit.

## Implementation

- Removed the purchase modal, capacity upsell button, sales animation, Stripe SDK,
  Firebase Functions client SDK and browser initialization/call to checkout.
- Old `?upgrade=true` links no longer open a purchase dialog. Existing checkout
  result parameters remain informational only, as in the previous security fix.
- Added a public portfolio / no new paid signup notice. Updated pricing/payment
  descriptions to reflect this status without cancelling or changing old contracts.
- Removed the upsell from emotion-analysis output; existing analysis remains.
- At the storage limit the form preserves its draft, performs no write, and
  explains how to back up via export before removing unwanted entries.
- Archived the former browser function in `examples/checkout-reference.js`.
  The exact previous UI remains in Git commit `e72ae24`. Server implementation
  remains in `archive/payment-reference/functions/index.js`. Neither reference is in the public asset
  allowlist; the browser archive is not a runnable or production-ready demo.

## Boundaries

This removes **public-screen routes** to checkout, not the deployed server
endpoint. Existing server functions, Stripe prices/subscriptions, Firestore and
Storage rules are unchanged and are NOT deployed in this task. An already-open
old tab or custom client could still call the old server endpoint; disabling it
at the server is a separate change. This release does not claim to cancel billing
or to remove all pre-existing backend payment risks.

## Verification

- Full project test suite: `npm test` (demo Firebase emulators, JSDOM).
- New checks cover app initialization without payment SDKs; capacity display at
  0/25/49/50 entries; old upgrade URL; full-limit draft preservation; last-slot
  non-commercial notification; built SDK/archive exclusion; analysis output.
- `npm run build` uses the existing 21-asset allowlist. Compare production file
  hashes to the build after deploying with Vercel only.
- Test fixtures never write real diaries or create real checkout sessions.

Base branch: `fix/protect-premium-state` at `e72ae24`.
Previous production deployment: `dpl_Ee2aT2WTzPVCbaDeGASoegHE1cAc`.
Keep a stacked PR against that branch; do not merge the stack into main as part
of this task. No data migration or automatic contract changes occur.
