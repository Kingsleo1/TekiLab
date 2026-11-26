# Findings terminology and reference interval changes

Research date: 26 November 2026.

The application imports the 39 active, selectable concepts from HL7 THO ObservationInterpretation, version 4.0.0. Codes, display names, source system, version, retrieval date and the CC0 copyright statement are retained in public/catalogue/clinical-findings.json. The client bundle uses the matching generated src/data/clinical-findings.ts so the picker works without an external terminology request.

Sources:
- https://terminology.hl7.org/CodeSystem-v3-ObservationInterpretation.json
- https://terminology.hl7.org/CodeSystem-v3-ObservationInterpretation.html
- https://terminology.hl7.org/license.html
- https://medlineplus.gov/lab-tests/how-to-understand-your-lab-results/

The picker groups positive/detected/reactive, negative/not-detected, uncertain, reference-interval/threshold, antimicrobial-susceptibility, trend and other reviewed interpretations. Search matches terminology and category. An unrestricted custom finding remains available. This is an interpretation vocabulary, not an exhaustive list of diagnoses or assay-specific answers. Only applicable concepts should be selected: susceptibility needs the relevant microbiology method and breakpoints; trend terms need a suitable prior comparison.

The old preset list combined findings with unverified disease diagnoses. It was replaced rather than expanded with additional inferred diagnoses. Selecting a concept seeds editable wording only when the interpretation is blank. It never fills a measurement, unit, reference interval or flag, and never overwrites entered prose.

Reference intervals and units vary with the laboratory method and patient context. No universal numeric ranges were scraped or assigned. Scientists can edit each parameter's interval and units, record the source and method, and explicitly confirm their review. Those values and the selected interpretation code are part of the signed snapshot. Changes invalidate approval. Critical interpretations require critical-result review permission. Published result metadata and PDFs retain the recorded method and reference source.

These changes support professional documentation. They do not validate a manufacturer's assay, establish local reference intervals, prove clinical accuracy or guarantee acceptance by an embassy or airport.
