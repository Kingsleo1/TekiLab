import {createHash} from 'node:crypto';
import {CatalogueError} from './catalogue-errors';
import {canApproveReport} from '../lib/report-approval';
import type {CatalogueActor} from '../types/test-catalog';
const digest=(value:string)=>createHash('sha256').update(value).digest('hex');
export function validatePublishedReport(actor:CatalogueActor,kind:string,order:any,patient:any){
  const imaging=kind==='radiology';if(!['laboratory','radiology'].includes(kind))throw new CatalogueError(400,'Unsupported report type.');
  if(!order?.id||!order.patientId||!order.testName||order.orderStatus!==(imaging?'Released':'RELEASED'))throw new CatalogueError(400,'Only released reports may be published.');
  const approval=order.reportApproval;
  if(!approval||approval.signerId!==actor.id||approval.signerName!==actor.name||!canApproveReport(actor,Object.values(order.results||{}).some((r:any)=>r.flag==='Critical'),imaging))throw new CatalogueError(403,'The approving professional must publish this report.');
  if(typeof approval.reportSnapshot!=='string'||digest(approval.reportSnapshot)!==approval.reportDigest||!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(approval.signaturePng||'')||approval.signaturePng.length>250000||!Number.isFinite(Date.parse(approval.signedAt)))throw new CatalogueError(400,'Invalid report approval.');
  let signed:any;try{signed=JSON.parse(approval.reportSnapshot);}catch{throw new CatalogueError(400,'Invalid approval snapshot.');}
  if(['AA','HH','LL'].includes(signed.findingCode)&&!canApproveReport(actor,true))throw new CatalogueError(403,'A critical interpretation requires an authorized critical-result reviewer.');
  for(const field of ['findingCode','referenceSource','assayMethod','referenceReviewed'])if(signed[field]!==undefined&&signed[field]!==order[field])throw new CatalogueError(409,'The signed interpretation or reference-method details changed.');
  if(signed.referenceReviewed!==undefined&&signed.referenceReviewed!==true)throw new CatalogueError(400,'Review the method-specific reference intervals and units before release.');
  if((signed.id&&signed.id!==order.id)||(signed.patientId&&signed.patientId!==order.patientId)||(signed.selectedPatientId&&signed.selectedPatientId!==order.patientId)||(signed.sampleUid&&signed.sampleUid!==order.accessionNumber)||(signed.patientName&&signed.patientName!==order.patientName))throw new CatalogueError(409,'Report identity differs from its approval.');
  for(const field of ['testId','testName','accessionNumber','mrn'])if(signed[field]!==undefined&&signed[field]!==order[field])throw new CatalogueError(409,'Approved test identity changed.');
  if(patient?.id&&patient.id!==order.patientId)throw new CatalogueError(409,'Wrong patient record.');
  if(imaging){
    if(!signed.findingsNotes?.trim()||!signed.impressionNotes?.trim())throw new CatalogueError(400,'Complete reviewed findings are required.');
    for(const key of ['clinicalIndication','techniqueNotes','findingsNotes','impressionNotes','recommendationsNotes','findingsHtml'])if((signed[key]||'')!==(order[key]||''))throw new CatalogueError(409,'Findings changed after approval.');
  }else{
    const parameters=signed.parameters||Object.entries(signed.resultValues||{}).map(([name,value]:[string,any])=>({name,...value}));
    if(!parameters.length||parameters.length!==Object.keys(order.results||{}).length)throw new CatalogueError(400,'A complete approved result is required.');
    for(const parameter of parameters){
      const result=order.results[parameter.name];if(!String(parameter.value??'').trim()||!result)throw new CatalogueError(400,'Missing measurement.');
      const template=signed.template?.find((p:any)=>p.name===parameter.name)||{};
      for(const field of ['value','flag','unit','referenceRange'])if(String(parameter[field]??template[field]??'')!==String(result[field]??''))throw new CatalogueError(409,'Measurements changed after approval.');
    }
    if((signed.approvalNotes??signed.clinicalInterpretation??'')!==(order.clinicalInterpretation||''))throw new CatalogueError(409,'Findings changed after approval.');
    if(signed.likelyIssue!==undefined){const expected=signed.isCustomIssueMode?String(signed.customIssueText||'').trim():signed.likelyIssue;if(expected!==(order.likelyIssue||''))throw new CatalogueError(409,'Reviewer impression changed after approval.');}
    if(signed.sampleUid&&order.likelyIssue!==(signed.aiReport?.likelyDiagnosis||'Professional review completed'))throw new CatalogueError(409,'Reviewer impression changed after approval.');
    if((signed.findingsHtml||'')!==(order.findingsHtml||''))throw new CatalogueError(409,'Findings changed after approval.');
  }
}
