# TekiLab System Settings and Vercel review

The platform administrator can manage the laboratory name, logo, brand accents, public contact details, booking instructions and footer. Values are validated and saved with a revision check. Imported JSON is an unsaved draft. Export contains only public settings. The screen no longer stores passwords or advertises placeholder save/provider statuses.

Local preview saves live in ignored data/local-preview/site-settings. GET /api/site-settings returns public settings; PUT requires the preview platform administrator. Local changes enter the Astra outbox, whose writes remain held by default. Shared version conflicts stop settings synchronization rather than overwrite a newer version.

On Vercel, /api/site-settings routes to the dedicated platform-settings serverless function. GET reads the public settings document from Astra; PUT requires TEKILAB_ADMIN_ACCESS_KEY in an Authorization bearer header and TEKILAB_ENABLE_ASTRA_WRITES=true. The administrator enters that key in the Database & deployment tab. It remains in component memory, is never stored in localStorage, and clears after a confirmed save. Astra tokens belong only in server environment variables. The key protects platform settings, not the separate staff authentication system.

Deploy repository Kingsleo92/tekilab, branch chatgpt/tekilab-ui-workflow, project root ., framework Vite, Node 24.x, build npm run build -- --configLoader native, output dist. If Vercel defaults to another production branch, choose this branch for the deployment or explicitly set it as the production branch in the project Git settings. Code has been pushed; actual deployment, domain availability and Vercel account access require checking in Vercel.

Before shared settings saves, create the existing Data API collection tekilab_records in default_keyspace using the reviewed database setup. The system_settings logical group uses _id tekilab-site-settings-v1 inside that collection; it does not require a separate CQL table. Set ASTRA_DB_API_ENDPOINT, ASTRA_DB_APPLICATION_TOKEN, ASTRA_DB_KEYSPACE, TEKILAB_ASTRA_RECORDS_COLLECTION and a random TEKILAB_ADMIN_ACCESS_KEY of at least 32 characters. Enable writes only after review. Redeploy after changing server environment variables. No live Astra migration or write was performed for this implementation.

The new settings API and the existing read-only result verifier are Vercel functions. The rest of the hosted clinical API still returns an explicit unavailable response. Staff authentication, shared clinical writes, hosted booking/payment execution and result delivery still require the production backend. Deploying the frontend alone does not complete those integrations. Public QR reports also require approved reports to be synchronized into Astra. Branding changes never mutate approved report contents.

Tests use synthetic records, a temporary local settings store and a mocked Astra transport. No real patient data, provider credentials, emails, payments or live database writes are used.

The primary development and Vercel source repository is Kingsleo92/tekilab on chatgpt/tekilab-ui-workflow. The previous Kingsleo1 repository can be mirrored, but production source updates must reach Kingsleo92/tekilab.
