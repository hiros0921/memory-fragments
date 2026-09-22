# Premium state protection

## Scope

Protect stored paid membership from writes made with an ordinary user's Firebase
credentials. Do not rewrite existing account, diary, or photo data. This is not
a historical payment audit or a complete Stripe integration hardening project.
Removing checkout UI is a separate follow-up.

## Changes

- `users/{uid}` billing fields are server-maintained: `isPremium`, `plan`,
  `maxMemories`, `subscriptionStatus`, `stripeCustomerId`,
  `stripeSubscriptionId`, `premiumStartDate`, and `premiumEndDate`.
- Client create cannot contain these fields; update cannot add, remove, or change
  them. Whole profile deletion is denied to preserve billing links. A future
  account-erasure feature needs a trusted server workflow. Diary CRUD is unchanged.
- Ordinary owner profile updates remain allowed. Future entitlement fields must
  be added to the protected list before deployment.
- The current premium service reads an existing profile and accepts only boolean
  `true`. On first login it creates a **non-billing** profile (`createdAt` only)
  with merge, preserving any concurrent server-written values. This retains the
  existing webhook's `update()` compatibility. Missing/failed reads default free.
- `?success=true` is not proof of payment. It only shows an informational message;
  it cannot write membership or enable paid UI. Other query parameters are preserved.
- Authentication transitions reset in-memory premium state and discard delayed
  status responses from the prior account.
- Admin SDK server updates remain possible; `subscriptions` stays owner-readable,
  client-write-denied. Existing stored membership values are not audited/reset.

## Compatibility and limits

The public build uses `js/app/services/premium-service.js`. Archived, unserved
`js/auth-manager.js` initializes/modifies `plan` and `maxMemories`; its old client
writes are intentionally rejected. Do not republish it without adapting it.
Membership limits enforced only in UI are not a billing security boundary.
Existing Stripe price validation, webhook retries, and production payment setup
are outside this change; no real payment is used as a test.

## Verification and release

`npm test` runs the demo Firestore and Storage emulators, existing regression tests,
and new billing-rule / application-state cases. These include prohibited creation,
update, field removal, parent deletion/replacement, ordinary profile updates,
first-login merge vs. a server grant, owner diary CRUD, logout/account switching,
and forged checkout return URLs. JSDOM uses real application code with mocked
Firebase boundaries; emulator tests exercise actual rules.

Build with `npm run build`; only the allowlisted public assets go to Vercel.
Compare live Firestore source with the known base before publishing rules.
Deploy **only** `firestore:rules` to Firebase project `memory-fragments`, then
publish the web build through Vercel. Verify released rule source and served
asset hashes. Do not deploy Storage, Functions, or Firebase Hosting for this task.

Base: `7fa22be5db7af1aad797ca898f23151dde3e9375`.
Previous Firestore ruleset: `1e94917f-863f-4f02-8aa3-8738539c7bc0`.
Previous web deployment: `dpl_FgexGDESqRZ1TCZMqERRRAww9Wns`.
For a web rollback, prefer retaining the hardened rules rather than restoring
the old client-writable billing policy. No data migration is part of this release.
