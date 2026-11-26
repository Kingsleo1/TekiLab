# Approved result release and integration handoff

Updated 26 November 2026. Preview branch: chatgpt/tekilab-ui-workflow.

## Release flow

Rapid workflow now posts one signed report to /api/lims/qr/rapid-release. The server reconstructs the released order from the signed patient, test, measurements, findings, recipients and consent choices. Test identity is frozen at registration, reviewer identity follows the signed-in account, and role defaults use the central laboratory role catalogue.

The server publishes the immutable report, saves its laboratory/billing projection, records requested notifications, and returns the saved report and its unique verification URL. Repeating the request retains the report number, token and notification job IDs; it preserves a recorded payment. If a projection write is interrupted, repeating the same signed request reconciles the projection. This is recoverable idempotency across local stores, not a distributed transaction.

The saved-result card offers the QR and verification link; PDF download uses the saved report. No guessed measurement is generated. Invalid, incomplete or modified approvals still fail review. The original standard rapid flow passed locally before this change; the user's exact reported error message and environment were not provided, so no exact reproduction of that incident is claimed.

## Patient results and consultation

Patient results are restricted by patient identity, not a name or an unrelated fallback list. Where a login account has a different ID from the facility patient record, a facility administrator can explicitly link the portal account reference after checking identity. That reference is shown in the patient's account details. A patient cannot link themselves to a different patient, and an established link cannot be reassigned through the normal link endpoint.

Saved results refresh in the patient portal every 15 seconds. This is polling, not a production realtime subscription. The result must be at the account's facility scope. Legacy browser records remain a preview mechanism, not trusted production authorization.

The rapid approval screen records whether the patient requests Doctor Consultation. Only an opted-in rapid result creates that follow-up ticket. Other existing departmental handoffs are retained. This does not create a prescription or infer a clinical referral without review.

## Email and WhatsApp

Result links expose the full approved report to anyone who possesses them, as requested. Confirm the recipient and the patient's choice before signing. The optional email and WhatsApp choices and recipients are signature-bound. Notifications are recorded separately from the saved result, so a notification failure does not invalidate it.

Server-only settings:

- TEKILAB_ENABLE_NOTIFICATIONS=true
- PUBLIC_SITE_URL=https://your-approved-public-origin
- RESEND_API_KEY and TEKILAB_EMAIL_FROM (a sender on a verified sending domain)
- WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID
- WHATSAPP_GRAPH_VERSION (a supported explicit Graph API version, such as the version selected in your Meta app)
- WHATSAPP_RESULT_TEMPLATE and optional WHATSAPP_TEMPLATE_LANGUAGE (default en)

The approved WhatsApp template must have one body text parameter for the result URL. Links are sent, not PDF attachments. Resend requests use a stable idempotency key. Provider acceptance is shown as accepted, not delivered. Delivery/read webhooks are not implemented. Uncertain network attempts are not automatically retried; inspect provider status before a manual resend to avoid duplicate messages. Preview mode disables external sending even if keys exist. No real email or WhatsApp message was sent during testing.

The provider adapters are implemented and mocked in tests. Real provider accounts, verified sender domain, approved WhatsApp template and real delivery are not configured or verified by this update.

Official API references:
- https://resend.com/docs/api-reference/emails/send-email
- https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages

## Astra administration and sync

The platform administration database tab now describes TekiLab, serves the current laboratory schema, checks the connection, and can create the selectively indexed Data API record store and sync the clinical outbox. It uses document collections, not the obsolete pharmacy CQL/REST-v2 schema. It never uploads source code or environment files.

Server-only settings:

- ASTRA_DB_API_ENDPOINT=https://database-region.apps.astra.datastax.com
- ASTRA_DB_APPLICATION_TOKEN=AstraCS:... (server-only; never VITE_)
- ASTRA_DB_KEYSPACE=default_keyspace
- TEKILAB_ASTRA_RECORDS_COLLECTION=tekilab_records (optional override; use the same value for sync and public verification)
- TEKILAB_ENABLE_ASTRA_WRITES=true only after reviewing the schema and approving actual writes
- TEKILAB_ADMIN_ACCESS_KEY (at least 32 characters) for non-preview administrator operations

The form can test a token held temporarily in server memory. It clears the token input after connection and does not store it in browser storage or return it in status. Configure server environment settings for persistence across process restarts. Only the platform super administrator can use the local management API; hosted administrator calls need the server access key.

The local Node server persists scoped clinical snapshots and transactional outboxes, and retries pending events every five seconds when writes are enabled. Patients, encounters, charges, queues and diagnostic orders are projected to individual collection records; published reports, catalogue changes, bookings, payments, portal links and notification jobs have corresponding mappings. Successful operations receive local acknowledgements; failed operations remain pending. Removed snapshot entries are represented by tombstones. This is one-way synchronization from the local preview, not a completed production shared-read implementation. Legacy staff, facility and optional pharmacy stores are not all migrated by this worker.

The schema manifest and its public download are kept in sync. Logical record groups use entity-tagged documents in one physical collection, tekilab_records, rather than requiring a separate collection per group. Only entity, tenant/branch scope and the token/revocation lookup fields are indexed. Long findings, approval snapshots and signature images are not indexed. Existing collections are preserved. A changed record-store target gets its own outbox acknowledgement version so earlier records can be re-synchronized. Private credentials with a VITE_ prefix cause the build to fail rather than embedding them in browser JavaScript.

No Astra connection, migration or live database write was executed during this task. Tests use synthetic providers and temporary directories. The legacy unauthenticated Astra proxy is disabled.

Official Data API references:
- https://docs.datastax.com/en/astra-db-serverless/api-reference/dataapiclient.html
- https://docs.datastax.com/en/astra-db-serverless/api-reference/document-methods/find-one-and-replace.html

## Public result verification on Vercel

The Vercel configuration now routes GET /api/lims/qr/results/:token to a dedicated read-only serverless function. It reads the approved record and withdrawal events from Astra, checks the signature-bound clinical contents, returns the full result for the bearer link, and never accepts report writes, client credentials or listing queries.

To activate public verification:

1. On the local issuing server, set PUBLIC_SITE_URL to the actual approved HTTPS origin, configure the server-only Astra settings above, review the schema and enable writes.
2. Use the super-admin panel to create the record store and synchronize the outbox. Confirm that pending events reach zero and check a synthetic published report.
3. In Vercel, configure ASTRA_DB_API_ENDPOINT, ASTRA_DB_KEYSPACE and the matching TEKILAB_ASTRA_RECORDS_COLLECTION. Prefer a separate read-only ASTRA_VERIFICATION_APPLICATION_TOKEN; the server-only ASTRA_DB_APPLICATION_TOKEN is a fallback. Do not use a VITE_ variable for either token.
4. Deploy this branch. Open a synthetic /verify/:token link on the deployed origin and check its download, print and withdrawal behavior before operational use.

Previously printed localhost QR codes do not become public automatically. Configure the issuing server public origin and regenerate the PDF; the report token and clinical approval remain unchanged while the link is refreshed. A published record or withdrawal becomes visible on Vercel only after it reaches Astra. Keep the issuing server/outbox worker running while issuing or withdrawing reports, and confirm sync before announcing public availability or withdrawal. Database/provider access and collection limits must be verified against the actual account; no live Astra or Vercel deployment was performed here.

The hosted verification route was tested using mocked Astra responses and a real headless browser/PDF QR decode, not a live Astra connection. Both laboratory and radiology records are covered by contract tests. It verifies stored approved content; it does not establish accreditation or guarantee embassy/airport acceptance.

## Clinical write hosting boundary

Shared online booking, staff result entry, patient login, consultation, payments and messaging still require the trusted hosted clinical backend with durable storage and real patient/staff sessions. Those hosted write APIs remain disabled. Vercel plus Astra settings can enable the read-only public verification route above; it does not complete clinical write APIs or notification delivery. Local Node workflows and one-way sync remain available separately.

Physical microphone/camera/printer operation, live provider checkout, message delivery, real Astra schema provisioning and embassy acceptance were not tested. Do not use patient data to test this handoff.

## Validation evidence

The final unit and browser counts are recorded in LOCAL_REVIEW.md. Current browser and API results are listed in LOCAL_REVIEW.md. The verified portal flow covers an explicitly linked account and excludes unrelated same-name records, downloads its approved PDF, and shows the account reference. The portal no longer reports that a password changed when no account-service request exists; production account authentication/password changes remain pending.

Indexing reference: https://docs.datastax.com/en/astra-db-serverless/api-reference/collection-methods/create-collection.html

The package pins Node.js 24.x, matching the tested runtime and Vite native configuration loader. Vercel supports this engine override: https://vercel.com/docs/functions/runtimes/node-js/node-js-versions
