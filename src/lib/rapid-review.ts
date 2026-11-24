export function buildMeasuredReview(parameters: any[]) {
  const flagged = parameters.filter(p => ['High','Low','Critical','Positive'].includes(p.flag));
  return { anomalyDetected: flagged.length > 0, severity: parameters.some(p => p.flag === 'Critical') ? 'critical' : flagged.length ? 'attention' : 'normal',
    likelyDiagnosis: 'Measured-result review — no diagnosis inferred',
    clinicalSummary: 'Flags are recorded observations, not an independent diagnostic assessment. Verify reference intervals, quality control, patient context and every measured result. Professional review is mandatory.',
    flaggedParameters: flagged.map(p => ({ parameter: p.name, value: String(p.value), referenceRange: p.referenceRange,
      deviation: p.flag, clinicalNote: 'Recorded flag: ' + p.flag + '. Reviewer must verify this observation.' })),
    aiSuggestedDrug: null, checkedAt: new Date().toISOString(), model: 'tekilab-measured-review-v1 (no AI)' };
}
export function validateDispatch(body: any): string | null {
  if (!body || typeof body.accessionNumber !== 'string' || !body.accessionNumber.trim() || typeof body.patientId !== 'string' || !body.patientId.trim() || typeof body.patientName !== 'string' || !body.patientName.trim() || typeof body.testName !== 'string' || !body.testName.trim()) return 'Patient, accession and test identity are required.';
  if (body.custodyVerified !== true || !Array.isArray(body.parameters) || !body.parameters.length || body.parameters.length > 40 ||
    body.parameters.some((p: any) => typeof p?.name !== 'string' || !p.name.trim() || typeof p?.value !== 'string' || !p.value.trim())) return 'Verified sample custody and complete measured parameters are required.';
  const a = body.reportApproval;
  if (!a || !a.signerId || !a.signerName || a.signerName !== body.validatedBy || !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(a.signaturePng || '') ||
    a.signaturePng.length > 250000 || !/^[a-f0-9]{64}$/.test(a.reportDigest || '') || !Number.isFinite(Date.parse(a.signedAt))) return 'Explicit signed human approval is required.';
  return null;
}
