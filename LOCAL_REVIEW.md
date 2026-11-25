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

## Persistence and checkout

Catalogue changes, audit events, catalogue orders, booking/check-in records, payments and published verification records use atomic local files under ignored data/local-preview/. They survive server restart. Their records retain tenant/branch scope and an outbox for future Astra integration. The outbox is preparation only; no Astra delivery worker is running.

Other existing clinical/pharmacy records still include browser-local or in-memory state. This is not a fully synchronized production database.

Catalogue polling uses revision checks and conditional responses; the picker initially renders 40 matches. Dashboard pages load on demand. A large production JavaScript chunk warning remains.

Paystack initialization and verification are implemented on the server with server-calculated amounts and reference, currency, amount, booking and test-domain validation. Unknown or reference-only fees cannot be charged online. Preview accepts test keys only. No provider key was configured, no live payment was taken, and actual provider checkout was not exercised. Confirm starter facility fees before operational use. Cash/payment recording is supported in the billing workflow.

Public booking currently uses the server-configured facility scope. Multi-tenant public routing requires the trusted production backend.

## Verified results

All eight commands passed:

| Command | Result |
| --- | --- |
| npm run lint | TypeScript passed |
| npm test | 40 tests passed |
| npm run build | Vite build passed |
| npm run test:api | 15 checks passed |
| npm run test:browser | 19 checks passed |
| npm run test:integration | 16 checks passed |
| npm run test:qr | 25 checks passed |
| npm run test:management | 20 checks passed |

Total: 135 automated checks, using synthetic records and fresh headless Edge contexts. External browser requests were blocked. Tests cover approval invalidation, signature reuse, multiple orders, departmental handoffs, pharmacy checkout, billing, catalogue roles/audit, stale edits, request replay, branch separation, booking check-in, report withdrawal and management navigation.

Booking, laboratory and radiology PDFs were rendered and their QR codes actually decoded and checked against working local routes. Booking and radiology page renders were also visually inspected. Print actions invoked the browser print flow; physical printer output was not tested.

Mobile checks cover rapid review, public verification and management charts at 390px width. No uncaught browser errors were reported by the passing suites.

Dependency audit: zero runtime advisories; seven moderate development-tool advisories remain. No high or critical advisories were reported by the full audit.

Evidence is local and ignored under work/: final-validation-v2.json, final-*.txt, qr-results/, browser-results/ and management-results/. Synthetic preview records may remain for review. The user's regular browser profile was not cleared or used for automated tests.

## Remaining release work and explicit holds

- Configure trusted server authentication and tenant/branch authorization. Browser-stored role metadata is only a local preview identity. New staff mutation routes fail closed outside preview until a trusted resolver is provided. Signature digests bind contents; they do not establish a trusted server identity or certificate-based digital signature.
- Implement approved durable production storage, Astra mappings/outbox delivery, full cross-device reconciliation and audit retention. Vercel handlers need local Express feature/authentication parity; local files are not serverless storage.
- Configure an approved public HTTPS origin and backend before worldwide QR access. A localhost QR works on the preview computer, not on an arbitrary phone or overseas device.
- Configure and exercise the payment provider with approved facility fees before enabling real checkout.
- Physical camera/USB hardware, microphone transcription, actual notification delivery, and physical printers have not been verified. Camera and dictation availability depend on the browser and permissions.
- This is workflow/reporting software; no scanner hardware, DICOM/PACS acquisition or clinical accuracy validation is claimed.
- Broader device/accessibility and long-report layouts still need operational review.

Astra DB migration and Vercel deployment remain on hold until local review and explicit user approval. The original Antigravity source checkout remains at e4a810e; application edits are in the separate preview worktree.

## Server restart verification

After restarting the preview server, the home and booking pages returned HTTP 200. The approved report digest, checked-in booking, two mixed-department orders, archived catalogue item and its fee were preserved. Astra migration still returned HTTP 423, and external AI remained disabled.
