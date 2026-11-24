import test from 'node:test';
import assert from 'node:assert/strict';
import { routePatient, transferTicket, completeDiagnostic, chargeForOrder, summarizeWorkflow } from '../src/lib/workflow';
import { canApproveReport, approvalMatches } from '../src/lib/report-approval';
import { buildMeasuredReview, validateDispatch } from '../src/lib/rapid-review';
const patient = { id: 'SYNTH-P1', fullName: 'Synthetic Patient One', mrn: 'SYNTH-MRN1' };
const user = { id: 'SYNTH-U1', name: 'Synthetic Scientist', role: 'Lead Lab Scientist' };
test('transfer completes source and creates destination for the same patient', () => {
  const source = routePatient([],patient,'Reception');
  const routed = transferTicket(source,source[0].id,'Laboratory');
  assert.equal(routed.find(t => t.department === 'Reception')?.status,'Completed');
  assert.equal(routed.find(t => t.department === 'Laboratory')?.patientId,patient.id);
  assert.deepEqual(transferTicket(routed,source[0].id,'Laboratory'),routed);
});
test('repeated department routing is idempotent', () => {
  const queue = routePatient([],patient,'Laboratory');
  assert.equal(routePatient(queue,patient,'Laboratory').length,1);
});
test('separate diagnostic orders retain separate linked queue entries', () => {
  const q = routePatient(routePatient([],patient,'Laboratory','','SYNTH-ORDER1'),patient,'Laboratory','','SYNTH-ORDER2');
  assert.equal(q.length,2);
});
test('release completes only the matching test and returns results to consultation', () => {
  const q = routePatient(routePatient([],patient,'Laboratory','','SYNTH-ORDER1'),patient,'Laboratory','','SYNTH-ORDER2');
  const result = completeDiagnostic(q,{id:'SYNTH-ORDER1',patientId:patient.id,patientName:patient.fullName,mrn:patient.mrn,testName:'Synthetic panel'},'Laboratory');
  assert.equal(result.find(t => t.sourceOrderId === 'SYNTH-ORDER2')?.status,'Waiting');
  assert.equal(result.find(t => t.department === 'Doctor Consultation')?.patientId,patient.id);
});
test('billing begins unpaid and retains source order identity', () => {
  const charge = chargeForOrder({id:'SYNTH-ORDER1',patientId:patient.id,priceNaira:1250});
  assert.equal(charge.paymentStatus,'Unpaid'); assert.equal(charge.sourceOrderId,'SYNTH-ORDER1'); assert.equal(charge.patientPayableNaira,1250);
});
test('analytics use measured timestamps and exclude cancelled queues', () => {
  const stats = summarizeWorkflow([{orderStatus:'RELEASED',createdAt:'2026-11-24T10:00:00Z',releasedAt:'2026-11-24T10:08:00Z'}],[],[{status:'Cancelled'},{status:'Waiting'}],[{paymentStatus:'Paid',patientPayableNaira:100},{paymentStatus:'Unpaid',patientPayableNaira:50}]);
  assert.equal(stats.averageTat,8); assert.equal(stats.slaPercent,100); assert.equal(stats.activeQueue,1); assert.equal(stats.collected,100); assert.equal(stats.outstanding,50);
});
test('empty analytics never invent turnaround measurements', () => assert.equal(summarizeWorkflow([],[],[],[]).averageTat,null));
test('reception, sample collectors, patients and unknown users cannot approve', () => {
  for (const role of ['Receptionist','Phlebotomist','Patient','Unknown']) assert.equal(canApproveReport({...user,role}),false);
  assert.equal(canApproveReport(undefined),false);
});
test('critical reports require a lead reviewer', () => {
  assert.equal(canApproveReport({...user,role:'Medical Lab Scientist'},true),false);
  assert.equal(canApproveReport(user,true),true);
});
test('approval becomes invalid after a content or signer change', () => {
  const approval:any={signerId:user.id,signerName:user.name,reportSnapshot:'original',signaturePng:'data:image/png;base64,AAAA'};
  assert.equal(approvalMatches(approval,'original',user),true);
  assert.equal(approvalMatches(approval,'edited',user),false);
  assert.equal(approvalMatches(approval,'original',{...user,id:'SYNTH-U2'}),false);
});
test('measured review never infers diagnosis or medication', () => {
  const review = buildMeasuredReview([{name:'Synthetic analyte',value:'12',flag:'Critical',referenceRange:'1-4'}]);
  assert.equal(review.severity,'critical'); assert.equal(review.aiSuggestedDrug,null);
  assert.match(review.likelyDiagnosis,/no diagnosis inferred/);
});
test('dispatch rejects missing approval, blank measurements and unverified custody', () => {
  assert.ok(validateDispatch({}));
  const base:any={accessionNumber:'SYNTH-A1',patientId:patient.id,patientName:patient.fullName,testName:'Synthetic panel',custodyVerified:true,parameters:[{name:'Analyte',value:'12'}]};
  assert.match(validateDispatch(base)!,/approval/);
  assert.match(validateDispatch({...base,custodyVerified:false})!,/custody/);
  assert.match(validateDispatch({...base,parameters:[{name:'Analyte',value:' '}]})!,/measured/);
});
