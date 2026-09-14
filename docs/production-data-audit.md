# Production Data Audit

Date: 2026-09-14

## Required source-of-truth rule

Authenticated customer data must flow through `React -> FastAPI -> database`.
Firebase Auth/Firestore must not be used alongside the FastAPI JWT identity, and
customer-facing views must not construct records from static arrays or browser
storage.

## Authentication: highest priority

| Current location | Current source | Required replacement |
| --- | --- | --- |
| `src/components/auth-dialog.tsx` | Firebase email, Google and password-reset APIs; Firestore profile sync | FastAPI `/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/me` and PostgreSQL `users` |
| `src/app/signup/page.tsx` | Firebase Auth | Same FastAPI JWT flow |
| `src/app/(app)/layout.tsx` | Firebase current user and sign-out | Shared FastAPI session provider and `/auth/logout` |
| `src/app/(app)/profile/*` | Firebase Auth/Firestore | `/users/me` |
| `src/app/tailor/profile/*` | Firebase Auth/Firestore | `/tailors/me` |
| `src/app/tailor/settings/*` | Firebase Admin/Firestore | Dedicated FastAPI settings/profile endpoint |

The backend JWT must be stored in secure HTTP-only cookies (or another approved
secure session mechanism), not duplicated in Firebase or UI-only state.

## Customer modules using non-authoritative data

| Module | Current locations | Required API/database source |
| --- | --- | --- |
| Catalog and product recommendations | `src/lib/garments.ts`, `src/lib/db.ts`, dashboard, AI recommendation flow | `products` via `/products`; recommendations must receive the fetched catalog |
| Cart and checkout | `src/context/app-context.tsx`, cart page/actions | Persisted cart endpoint/table, then `/orders` and `/payments` |
| Orders and tracking | `src/lib/orders-data.ts`, app context, orders/track pages, Firestore listeners | `/orders`, `/orders/{id}`, `/orders/{id}/tracking` |
| Returns | `src/lib/returns-data.ts`, returns/orders pages | `/returns` and `return_requests` |
| Rewards | `src/lib/rewards-data.ts`, rewards page | `/rewards` and transactions/history endpoint |
| Wallet | Wallet UI-only balances/actions | `/wallet` and `/wallet/transactions` |
| Subscriptions | Subscription page's plan/state arrays | persisted `/subscriptions` after verified payment |
| Tailors | `src/lib/tailors.ts`, cart random selection | `/tailors` with an actual location/radius filter |
| Messages | Firestore and `localStorage` conversations | `/messages` |
| Measurements and fitness | Firestore measurement state and static fitness history | `/measurements` plus a persisted fitness-plan model/API |
| Tailor operations | static charges, designs, reports, earnings, customers, orders/dashboard | admin/tailor FastAPI routes backed by database tables; do not show estimates as live values |

## Static data that must not be presented as live business data

- `src/lib/garments.ts`, `orders-data.ts`, `returns-data.ts`, `rewards-data.ts`,
  `tailors.ts`, `fitness-data.ts`, `charges-data.ts`, `designs-data.ts`, and
  `reports-data.ts`.
- Static customer/tailor/order/earnings arrays in dashboard, customers, earnings,
  orders, cart, offers, rewards, returns and subscription screens.
- `perfectfit-db.json` and the Firebase/local fallback in `src/lib/db.ts`.
- Browser storage for `tailorPrices` and `tailor_chats`.

Marketing copy, legal-policy text, translations, and purely presentational UI
labels may remain static.  Any displayed price, availability, account state,
customer record, operational KPI, or transaction may not.

## Backend gaps before the UI can be fully migrated

1. Add a persisted cart/cart-item model and endpoints (cart currently exists only
   in React state).
2. Add subscription-payment linkage: a verified Razorpay payment must create or
   activate a `subscriptions` record server-side. React must never activate it.
3. Add a secure Razorpay webhook-signature check and idempotency protection.
4. Add staff/admin workflows for catalog, tailor onboarding, order assignment,
   return processing, charges, designs, reports and payouts.
5. Replace the current filesystem upload URL with authenticated object storage in
   production, and expose it through a controlled static/media route.
6. Create migrations, seed only approved business catalog data, and add API and
   browser end-to-end tests.

## Migration order

1. FastAPI JWT session and route guards.
2. Products, persisted cart, orders, payment verification and subscription state.
3. Customer account modules: profile, measurements, messages, wallet, rewards,
   returns and notifications.
4. Tailor/admin operations.
5. Real provider configuration, migration of approved business data, and full
   happy-path/failure-path tests.
