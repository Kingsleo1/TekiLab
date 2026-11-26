# Flutterwave checkout setup

Online booking now uses Flutterwave Standard hosted checkout. The existing Paystack module is retained for compatibility but is not selected by the booking router.

## Server configuration

- FLW_SECRET_KEY: server-only Flutterwave secret. Never use a VITE_ variable, commit the value, or put it in browser storage.
- PUBLIC_SITE_URL: approved public HTTPS site origin, used for checkout callback and QR links. Local review defaults to http://localhost:3000.
- TEKILAB_PREVIEW_MODE=true: only test keys are accepted; Astra and external AI remain disabled.
- TEKILAB_BOOKING_TENANT_ID and TEKILAB_BOOKING_BRANCH_ID: facility scope for public booking.

Configure secrets through the server environment. No provider credentials are included. Amounts come from the server catalogue; quote-only/reference fees cannot be charged. The server verifies transaction status, reference, NGN currency, amount and booking metadata before recording payment. Callback retries use the existing idempotent payment/order workflow.

## Before accepting real payments

1. Confirm approved facility fees and complete local review.
2. Configure test credentials and verify successful, cancelled, failed and repeated callbacks with Flutterwave's sandbox.
3. Complete trusted server authentication, tenant authorization and durable production persistence before enabling production routes.
4. Configure the approved public HTTPS origin and test callback access and receipt reconciliation.
5. Add verified webhook reconciliation before relying on asynchronous payments when the customer does not return to the callback.

This update includes mocked provider contract tests, not an actual Flutterwave checkout or charge. A webhook receiver/reconciliation worker is not implemented. Astra migration remains held for explicit approval. Vercel preparation is included for handoff; this does not enable the production backend.

Official references: [Flutterwave Standard](https://developer.flutterwave.com/docs/collections-inflow/flutterwave-standard) and [transaction verification](https://developer.flutterwave.com/docs/transaction-verification).
