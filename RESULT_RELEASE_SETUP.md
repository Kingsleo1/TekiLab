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

The platform administration database tab now describes TekiLab, serves the current laboratory schema, checks the connection, and can create missing Data API collections and sync the clinical outbox. It uses document collections, not the obsolete pharmacy CQL/REST-v2 schema. It never uploads source code or environment files.

Server-only settings:

- ASTRA_DB_API_ENDPOINT=https://database-region.apps.astra.datastax.com
- ASTRA_DB_APPLICATION_TOKEN=AstraCS:... (server-only; never VITE_)
- ASTRA_DB_KEYSPACE=default_keyspace
- TEKILAB_ENABLE_ASTRA_WRITES=true only after reviewing the schema and approving actual writes
- TEKILAB_ADMIN_ACCESS_KEY (at least 32 characters) for non-preview administrator operations

The form can test a token held temporarily in server memory. It clears the token input after connection and does not store it in browser storage or return it in status. Configure server environment settings for persistence across process restarts. Only the platform super administrator can use the local management API; hosted administrator calls need the server access key.

The local Node server persists scoped clinical snapshots and transactional outboxes, and retries pending events every five seconds when writes are enabled. Patients, encounters, charges, queues and diagnostic orders are projected to individual collection records; published reports, catalogue changes, bookings, payments, portal links and notification jobs have corresponding mappings. Successful operations receive local acknowledgements; failed operations remain pending. Removed snapshot entries are represented by tombstones. This is one-way synchronization from the local preview, not a completed production shared-read implementation. Legacy staff, facility and optional pharmacy stores are not all migrated by this worker.

The schema manifest and its public download are kept in sync. Private credentials with a VITE_ prefix cause the build to fail rather than embedding them in browser JavaScript.

No Astra connection, migration or live database write was executed during this task. Tests use synthetic providers and temporary directories. The legacy unauthenticated Astra proxy is disabled.

Official Data API references:
- https://docs.datastax.com/en/astra-db-serverless/api-reference/dataapiclient.html
- https://docs.datastax.com/en/astra-db-serverless/api-reference/document-methods/find-one-and-replace.html

## Hosting boundary

The current Vercel configuration is still an explicitly labelled UI demo. It does not run the local Node clinical APIs or use local filesystem persistence. Vercel deployment plus Astra credentials alone does not enable shared booking, result saving, account authentication or live notifications. A trusted hosted clinical backend with durable storage, patient/staff sessions and API routing remains necessary before operational use. The local fixes and connectors do not remove this boundary.

Physical microphone/camera/printer operation, live provider checkout, message delivery, real Astra schema provisioning and embassy acceptance were not tested. Do not use patient data to test this handoff.

## Validation evidence

The final units passed 69 tests. Current browser and API results are listed in LOCAL_REVIEW.md. The verified portal flow covers an explicitly linked account and excludes unrelated same-name records, downloads its approved PDF, and shows the account reference. The portal no longer reports that a password changed when no account-service request exists; production account authentication/password changes remain pending.
