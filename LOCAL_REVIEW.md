# TekiLab local review — 25 November 2026

Preview: http://localhost:3000

Worktree: C:\Users\AGU\Desktop\TekiLab-ChatGPT-preview

Branch: chatgpt/tekilab-ui-workflow

## What is implemented

- Administrators, branch managers and clinical leads land on Lab Overview. Its operational cards and shortcuts open the laboratory, radiology, reception, patient registry, new-order and financial pages.
- Business financial charts use recorded patient charges: amounts raised, collected, outstanding and waived; daily invoice cohorts; and service mix. The dedicated financial page includes ledger detail and 7/30/90-day reporting. These are patient-ledger figures, not bank settlements, expenses or profit.
- The shared catalogue contains 1,326 entries: 1,086 laboratory tests/panels and 240 imaging entries. Search, department/category filters, multiple selection and visible fees or “quote required” are available in walk-in ordering and online booking. The catalogue is expandable, not globally exhaustive.
- Authorized accounts can add/configure, archive, restore and price tests/scans. CEO/branch managers manage both; clinical leads manage tests/templates; billing manages fees. Explicit delegated permissions are supported. Archive preserves historical orders.
- Imaging requests carry modality, body site, fee and order snapshot into radiology queues and billing. Radiology supports recorded scan completion, draft findings, professional signature, release and verification PDFs. Laboratory worklists and the rapid order page provide radiology links.
- The rapid page has a prominent sticky New Test heading. Only a single reviewed rapid template enters rapid result steps; mixed, multiple or specialist orders go to departmental worklists.
- Online booking produces an unpaid receipt with a real QR code. Reception can validate pasted/USB scanner input, or request camera access, confirm client identity and check in. Repeat scans restore the same orders, patient and queue records without duplicate orders.
- Approved laboratory/radiology results receive opaque verification links. The dedicated verification page opens the full approved result for anyone possessing the link, as requested; it supports print and PDF download. Published report contents are immutable. Authorized reviewers can withdraw a report. A withdrawn link no longer displays a valid report; previously downloaded copies cannot be recalled.
- PDF QR codes link to this site's booking or result verification pages. The existing specimen QR and label workflow is retained.
- Rich findings, optional browser-native dictation, advisory review downloads and reusable session signatures remain. Each report requires explicit human approval; content changes invalidate the approval.
- The header database/CQL control is removed. App installation is offered in the footer.

## Latest preview update

- Staff directory views now share the same laboratory role and permissions catalogue, with editable staff names and no fallback pharmacy POS grants.
- Overview adds patient, consultation, team and facility counts plus links to staff, branches, appointments, inpatient, reports and module settings. Colourful service cards retain financial charts.
- Staff and branch dialogs scroll to their Save actions at 390 x 600. The application sidebar remains visible while navigating.
- Shared online/walk-in order summaries list each selected test with a Remove action.
- Dictation handles final and interim events, inserts recognized text, avoids repeated final transcripts, and explains microphone/network errors. This is browser speech support, independent of a paid AI API; physical microphone transcription remains unverified.
- The schema manifest now includes staff, facilities, catalogue, orders, bookings, payments, published reports, audit and sync-outbox mappings. It is a proposed mapping, not an executed Astra migration.

## Persistence and checkout

Catalogue changes, audit events, catalogue orders, booking/check-in records, payments and published verification records use atomic local files under ignored data/local-preview/. They survive server restart. Their records retain tenant/branch scope and an outbox for future Astra integration. The outbox is preparation only; no Astra delivery worker is running.

Other existing clinical/pharmacy records still include browser-local or in-memory state. This is not a fully synchronized production database.

Catalogue polling uses revision checks and conditional responses; the picker initially renders 40 matches. Dashboard pages load on demand. A large production JavaScript chunk warning remains.

Flutterwave initialization and verification are implemented on the server with server-calculated amounts and reference, currency, amount, booking and hosted checkout-domain validation. Unknown or reference-only fees cannot be charged online. Preview accepts test keys only. No provider key was configured, no live payment was taken, and actual provider checkout was not exercised. Confirm starter facility fees before operational use. Cash/payment recording is supported in the billing workflow.

Public booking currently uses the server-configured facility scope. Multi-tenant public routing requires the trusted production backend.

## Verified results for this update

| Check | Result |
| --- | --- |
| TypeScript (npm run lint) | Passed |
| Vite build (--configLoader native) | Passed; large-chunk warning remains |
| Native TypeScript unit runner | 43 passed |
| API browser suite | 15 passed |
| Department integration browser suite | 16 passed |
| Dictation-event and department browser suite | 19 passed |
| QR booking/result browser suite | 25 passed |
| Management/imaging browser suite | 20 passed |
| Staff editor browser suite | 4 passed |
| Branch dialog browser suite | 1 passed |

The suites overlap; these counts are not unique end-user workflows. Browser suites use synthetic records, fresh headless Edge contexts and blocked external browser requests. Dictation uses simulated browser speech events; Flutterwave unit tests mock provider responses. No live payment or physical microphone result is claimed.

The previous rapid-browser suite was not rerun on this static build: it imports a source module that the static server does not serve. The current unit, department, dictation, QR and management suites provide the listed coverage. Previous QR PDF render/decode inspection remains prior evidence, rather than a new physical scanner test.

On this Windows host, tsx fails before execution in os.userInfo and the default Vite config bundler encounters filesystem access restrictions. Validation used a native TypeScript transpilation hook and Vite's native config loader, without modifying installed dependencies. See scripts/native-ts-loader.mjs. The built preview runs with NODE_ENV=production and TEKILAB_PREVIEW_MODE=true; production static serving does not mean production authorization/storage is enabled.

Reproduce the alternate unit command with:

    node --import ./scripts/native-ts-loader.mjs --test tests/workflows.test.ts tests/catalogue-qr.test.ts tests/flutterwave.test.ts

Build with npm run build -- --configLoader native. To run the built local preview in PowerShell:

    $env:NODE_ENV='production'
    $env:TEKILAB_PREVIEW_MODE='true'
    node --import ./scripts/native-ts-loader.mjs server.ts

Evidence is local and ignored under work/: demo-unit-final.txt, demo-lint-final.txt, native-build-final.txt, demo-management-final.txt and the per-suite logs. Synthetic preview records may remain. Automated tests do not clear or use the user's regular browser profile. The earlier dependency audit is not a fresh audit for this update.

## Remaining release work and explicit holds

- Configure trusted server authentication and tenant/branch authorization. Browser-stored role metadata is only a local preview identity. New staff mutation routes fail closed outside preview until a trusted resolver is provided. Signature digests bind contents; they do not establish a trusted server identity or certificate-based digital signature.
- Implement approved durable production storage, Astra mappings/outbox delivery, full cross-device reconciliation and audit retention. Vercel handlers need local Express feature/authentication parity; local files are not serverless storage.
- Configure an approved public HTTPS origin and backend before worldwide QR access. A localhost QR works on the preview computer, not on an arbitrary phone or overseas device.
- Configure and exercise the payment provider with approved facility fees before enabling real checkout.
- Physical camera/USB hardware, microphone transcription, actual notification delivery, and physical printers have not been verified. Camera and dictation availability depend on the browser and permissions.
- This is workflow/reporting software; no scanner hardware, DICOM/PACS acquisition or clinical accuracy validation is claimed.
- Broader device/accessibility and long-report layouts still need operational review.

The user approved Vercel deployment on 25 November 2026, targeting tekilab.vercel.app. Astra DB migration remains on hold. The hosted deployment is a UI demo: Vercel does not run the local Express feature APIs; its API routes return an explicit 503 rather than exposing the legacy credential proxy. No local preview data or environment files are uploaded. A dismissible notice explains the limitation. Production shared bookings, QR records and payments require the trusted backend. The original Antigravity source checkout remains at e4a810e; application edits are in the separate preview worktree.

## Server restart verification

After restarting the preview server, the home and booking pages returned HTTP 200. The approved report digest, checked-in booking, two mixed-department orders, archived catalogue item and its fee were preserved. Astra migration still returned HTTP 423, and external AI remained disabled.
