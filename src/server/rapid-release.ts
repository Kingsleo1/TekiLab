import {createHash} from 'node:crypto';
import {CatalogueError} from './catalogue-errors';
import {validatePublishedReport} from './report-validation';
import {isRapidReady} from '../lib/test-catalog';
import type {CatalogueActor,CatalogueSnapshot} from '../types/test-catalog';
// Reconstruct exactly the signed patient, test, findings and delivery choices.
export function approvedRapidRelease(actor:CatalogueActor,input:any,catalogue:CatalogueSnapshot){
 const approval=input?.approval;let signed:any;try{signed=JSON.parse(approval.reportSnapshot);}catch{throw new CatalogueError(400,'Sign and approve this report before saving.');}
 const item=catalogue.items.find(item=>item.id===signed.testId);
 if(!item||!isRapidReady(item)||item.name!==signed.testName)throw new CatalogueError(409,'The selected rapid test changed. Review its template and sign again.');
 if(!signed.selectedPatientId||!signed.patientName?.trim()||!signed.sampleUid||signed.custodyVerified!==true)throw new CatalogueError(400,'Complete patient identification and sample custody first.');
 if(!Array.isArray(signed.parameters)||signed.parameters.length!==item.parameters.length||new Set(signed.parameters.map((p:any)=>p.name)).size!==item.parameters.length||item.parameters.some(p=>!signed.parameters.some((r:any)=>r.name===p.name)))throw new CatalogueError(409,'Review every parameter in the selected test template.');
 if(signed.quotedFee&&(!Number.isFinite(Number(signed.quotedFee))||Number(signed.quotedFee)<0))throw new CatalogueError(400,'Invalid quoted test fee.');
 const email=String(signed.patientEmail||'').trim(),phone=String(signed.patientPhone||'').trim();
 if(signed.sendEmail&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new CatalogueError(400,'Enter a valid patient email address or turn off email delivery and sign again.');
 if(signed.sendWhatsApp&&!/^\+?[0-9 ()-]{10,24}$/.test(phone))throw new CatalogueError(400,'Enter a valid patient mobile number or turn off WhatsApp delivery and sign again.');
 const order:any={id:'rapid-'+signed.sampleUid,accessionNumber:signed.sampleUid,patientId:signed.selectedPatientId,patientName:signed.patientName,mrn:signed.patientMrn||signed.selectedPatientId,testId:item.id,testName:item.name,category:item.category,sampleType:item.sampleType,department:'Laboratory',sampleStatus:'Sample Collected',orderStatus:'RELEASED',results:Object.fromEntries(signed.parameters.map((p:any)=>[p.name,{value:p.value,unit:p.unit,referenceRange:p.referenceRange,flag:p.flag}])),likelyIssue:signed.aiReport?.likelyDiagnosis||'Professional review completed',clinicalInterpretation:signed.approvalNotes||'',findingsHtml:signed.findingsHtml||'',validatedByName:actor.name,validatedAt:approval.signedAt,releasedAt:approval.signedAt,createdAt:signed.workflowStartedAt?new Date(signed.workflowStartedAt).toISOString():approval.signedAt,priceNaira:String(signed.quotedFee||'').trim()?Number(signed.quotedFee):0,pricingStatus:String(signed.quotedFee||'').trim()?'Quoted':'Unquoted',billingStatus:'Pending',reportNumber:'TLAB-'+createHash('sha256').update(approval.reportSnapshot).digest('hex').slice(0,16).toUpperCase(),reportApproval:approval,patientPhone:phone,patientEmail:email,rapidWorkflow:true,consultationRequested:signed.consultationRequested===true,deliveryConsent:{email:signed.sendEmail===true,whatsapp:signed.sendWhatsApp===true}};
 const patient={id:order.patientId,fullName:order.patientName,mrn:order.mrn,phone,email};validatePublishedReport(actor,'laboratory',order,patient);return {order,patient};
}
