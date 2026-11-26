import {getRoleDefinition} from '../config/roles';
import {ResultNotifications,type DeliveryJob} from './result-notifications';
import {normalizeNigerianWhatsAppPhone} from '../config/roles';
import {validatePublishedReport} from './report-validation';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {canApproveReport} from '../lib/report-approval';
import {CatalogueError,TestCatalogueStore} from './test-catalog-store';
import type {CatalogueActor,CatalogueScope} from '../types/test-catalog';
export const tokenPattern=/^[A-Za-z0-9_-]{43}$/;
const digest=(value:string)=>createHash('sha256').update(value).digest('hex');
export class QRRegistry {
 private writes=Promise.resolve();
 constructor(private file:string,private catalogue:TestCatalogueStore){}
 private async read(){try{const data=JSON.parse(await fs.readFile(this.file,'utf8'));if(!data.reports||!data.bookings||!Array.isArray(data.outbox))throw Error('Invalid registry');return data;}catch(error:any){if(error.code==='ENOENT')return {reports:{},bookings:{},outbox:[]};throw error;}}
 private async transaction(action:(data:any)=>any){let resolve!:(v:any)=>void,reject!:(e:any)=>void;const result=new Promise<any>((res,rej)=>{resolve=res;reject=rej;});this.writes=this.writes.catch(()=>{}).then(async()=>{try{const data=await this.read();const value=await action(data);await fs.mkdir(path.dirname(this.file),{recursive:true});const temporary=this.file+'.'+randomUUID()+'.tmp';await fs.writeFile(temporary,JSON.stringify(data),{mode:0o600});await fs.rename(temporary,this.file);resolve(value);}catch(error){reject(error);}});return result;}
 async publish(scope:CatalogueScope,actor:CatalogueActor,input:any){
   validatePublishedReport(actor,input.kind,input.order,input.patient);
   // Validate scope even when no branch overrides have been saved.
   await this.catalogue.get(scope,actor);
   return this.transaction(data=>{
     const order=input.order;
     const key=digest(scope.tenantId+'|'+scope.branchId+'|'+input.kind+'|'+order.id);
     const previous=data.reports[key];
     const payload={kind:input.kind,order:{id:order.id,patientId:order.patientId,patientName:order.patientName,mrn:order.mrn,testName:order.testName,accessionNumber:order.accessionNumber,reportNumber:order.reportNumber,orderStatus:order.orderStatus,results:order.results,clinicalInterpretation:order.clinicalInterpretation,likelyIssue:order.likelyIssue,clinicalIndication:order.clinicalIndication,techniqueNotes:order.techniqueNotes,findingsNotes:order.findingsNotes,impressionNotes:order.impressionNotes,recommendationsNotes:order.recommendationsNotes,findingsHtml:order.findingsHtml,findingCode:order.findingCode,referenceSource:order.referenceSource,assayMethod:order.assayMethod,referenceReviewed:order.referenceReviewed,reportApproval:order.reportApproval,releasedAt:order.releasedAt},patient:{id:order.patientId,fullName:order.patientName||input.patient?.fullName,mrn:order.mrn||input.patient?.mrn}};
     const contentDigest=digest(JSON.stringify(payload));
     if(previous){if(previous.contentDigest!==contentDigest)throw new CatalogueError(409,'A published report is immutable. Create and approve an amended report.');if(previous.revokedAt)throw new CatalogueError(410,'This report has been withdrawn.');return {token:previous.token,publishedAt:previous.publishedAt,contentDigest};}
     const record={...payload,scope,token:randomBytes(32).toString('base64url'),publishedAt:new Date().toISOString(),contentDigest,revokedAt:null};
     data.reports[key]=record;data.outbox.push({entity:'verified_report',key,payload:record,state:'pending_astra_connection'});
     return {token:record.token,publishedAt:record.publishedAt,contentDigest};
   });
 }
 async linkPatientAccount(scope:CatalogueScope,actor:CatalogueActor,input:any){
   if(!['ceo','branch_manager'].includes(getRoleDefinition(actor.role).id))throw new CatalogueError(403,'A facility administrator must link patient portal accounts.');
   if(input.identityConfirmed!==true||!input.accountId||!input.patientId||String(input.accountId).length>160||String(input.patientId).length>160)throw new CatalogueError(400,'Confirm the patient identity and portal account reference.');
   return this.transaction(data=>{const known=Object.values(data.reports).some((r:any)=>r.scope.tenantId===scope.tenantId&&r.scope.branchId===scope.branchId&&r.order.patientId===input.patientId);if(!known)throw new CatalogueError(404,'Save a result for this patient at this facility before linking the portal account.');
     data.patientLinks=data.patientLinks||{};const key=digest(scope.tenantId+'|'+scope.branchId+'|'+input.accountId);const previous=data.patientLinks[key];if(previous&&previous.patientId!==input.patientId)throw new CatalogueError(409,'This account is already linked to another patient. Resolve the identity record before changing the link.');
     data.patientLinks[key]={patientId:input.patientId,accountId:input.accountId,scope,linkedBy:actor.id,linkedAt:previous?.linkedAt||new Date().toISOString()};data.outbox.push({entity:'patient_portal_link',payload:data.patientLinks[key],state:'pending_astra_connection'});return {linked:true};
   });
 }
 async patientReports(scope:CatalogueScope,actor:CatalogueActor){
   if(!/patient/i.test(actor.role))throw new CatalogueError(403,'Use a linked patient account to view patient results.');
   const data=await this.read();const patientId=data.patientLinks?.[digest(scope.tenantId+'|'+scope.branchId+'|'+actor.id)]?.patientId||actor.id;return Object.values(data.reports).filter((r:any)=>r.scope.tenantId===scope.tenantId&&r.scope.branchId===scope.branchId&&r.order.patientId===patientId&&!r.revokedAt).map((report:any)=>({...report,portalAccountId:actor.id}));
 }
 async prepareDelivery(scope:CatalogueScope,actor:CatalogueActor,token:string,order:any,siteOrigin:string){
   return this.transaction(data=>{
     const report:any=Object.values(data.reports).find((r:any)=>r.token===token&&r.scope.tenantId===scope.tenantId&&r.scope.branchId===scope.branchId);
     if(!report||report.order.reportApproval.signerId!==actor.id||report.order.reportApproval.reportDigest!==order.reportApproval.reportDigest)throw new CatalogueError(403,'Delivery requires the saved approved report.');
     let signed:any;try{signed=JSON.parse(report.order.reportApproval.reportSnapshot);}catch{throw new CatalogueError(400,'Invalid saved approval.');}
     data.deliveries=data.deliveries||{};
     for(const channel of ['email','whatsapp'] as const){
       if(!(channel==='email'?signed.sendEmail:signed.sendWhatsApp))continue;
       const to=channel==='email'?String(signed.patientEmail||'').trim():normalizeNigerianWhatsAppPhone(signed.patientPhone).digits;
       const id=digest(report.token+'|'+channel);
       if(!data.deliveries[id]){data.deliveries[id]={id,channel,to,url:siteOrigin+'/verify/'+token,token,scope,status:'pending_configuration',createdAt:new Date().toISOString()};data.outbox.push({entity:'result_notification',payload:data.deliveries[id],scope,state:'pending_astra_connection'});}
     }
     return Object.values(data.deliveries).filter((job:any)=>job.token===token);
   });
 }
 async attemptDelivery(token:string,sender:ResultNotifications){
   const data=await this.read();const ids=Object.values(data.deliveries||{}).filter((job:any)=>job.token===token).map((job:any)=>job.id);
   for(const id of ids){
     const job=await this.transaction(state=>{const job=state.deliveries?.[id];if(!job||!sender.configured(job.channel)||!['pending_configuration','pending_public_https','queued'].includes(job.status))return null;job.status='sending';return {...job};});
     if(!job)continue;
     const result=await sender.send(job);
     await this.transaction(state=>{Object.assign(state.deliveries[id],result,{updatedAt:new Date().toISOString()});state.outbox.push({entity:'result_notification',payload:{...state.deliveries[id]},scope:state.deliveries[id].scope,state:'pending_astra_connection'});return null;});
   }
   return Object.values((await this.read()).deliveries||{}).filter((job:any)=>job.token===token);
 }
 async verify(token:string){if(!tokenPattern.test(token))throw new CatalogueError(404,'Report not found.');const data=await this.read();const report:any=Object.values(data.reports).find((r:any)=>r.token===token);if(!report)throw new CatalogueError(404,'Report not found.');if(report.revokedAt)throw new CatalogueError(410,'This report was withdrawn and is no longer valid.');const {scope,...publicReport}=report;return publicReport;}
 async revoke(scope:CatalogueScope,actor:CatalogueActor,token:string){
   if(!canApproveReport(actor,false,true)&&!canApproveReport(actor))throw new CatalogueError(403,'An authorized reviewer must withdraw a report.');
   return this.transaction(data=>{const report:any=Object.values(data.reports).find((r:any)=>r.token===token&&r.scope.tenantId===scope.tenantId&&r.scope.branchId===scope.branchId);if(!report)throw new CatalogueError(404,'Report not found.');report.revokedAt=report.revokedAt||new Date().toISOString();data.outbox.push({entity:'verified_report_revocation',token,at:report.revokedAt,actorId:actor.id,state:'pending_astra_connection'});return {revokedAt:report.revokedAt};});
 }
 async book(scope:CatalogueScope,input:any){
   if(!input.patient?.fullName?.trim()||input.patient.fullName.length>160||String(input.patient.phone||'').length>40||String(input.patient.email||'').length>180)throw new CatalogueError(400,'Enter valid booking contact details.');
   if(!/^[A-Za-z0-9_-]{8,100}$/.test(input.requestId||'')||!/^\d{4}-\d{2}-\d{2}$/.test(input.appointmentDate||'')||input.appointmentDate<new Date().toISOString().slice(0,10)||!/^\d{2}:\d{2}$/.test(input.appointmentTime||''))throw new CatalogueError(400,'Choose a future appointment date and valid time.');
   const [hour,minute]=String(input.appointmentTime).split(':').map(Number);if(hour>23||minute>59)throw new CatalogueError(400,'Choose a valid appointment time.');
   if(!Array.isArray(input.testIds)||!input.testIds.length||input.testIds.length>50||new Set(input.testIds).size!==input.testIds.length)throw new CatalogueError(400,'Choose between 1 and 50 different tests.');
   const catalogue=await this.catalogue.get(scope);
   if(catalogue.revision!==input.baseRevision)throw new CatalogueError(409,'Fees changed. Review your selection before booking.');
   const tests=input.testIds.map((id:string)=>{const item=catalogue.items.find(test=>test.id===id&&test.isActive);if(!item)throw new CatalogueError(400,'A selected test is unavailable.');return {id:item.id,name:item.name,sampleType:item.sampleType,category:item.category,department:item.department||'Laboratory',modality:item.modality,bodySite:item.bodySite,priceNaira:item.priceStatus==='quote_required'?null:item.priceNaira,priceStatus:item.priceStatus,parameters:item.parameters||[]};});
   const fingerprint=digest(JSON.stringify({scope,patient:input.patient,testIds:input.testIds,appointmentDate:input.appointmentDate,appointmentTime:input.appointmentTime}));
   return this.transaction(data=>{
     const existing:any=Object.values(data.bookings).find((b:any)=>b.requestId===input.requestId&&b.scope.tenantId===scope.tenantId&&b.scope.branchId===scope.branchId);
     if(existing){if(existing.fingerprint!==fingerprint)throw new CatalogueError(409,'Booking request identifier already used.');return existing;}
     const token=randomBytes(32).toString('base64url');
     const booking={id:'booking-'+randomUUID(),number:'TKB-'+randomBytes(6).toString('hex').toUpperCase(),token,scope,requestId:input.requestId,fingerprint,patient:{id:'online-'+randomUUID(),fullName:input.patient.fullName.trim(),phone:String(input.patient.phone||''),email:String(input.patient.email||'')},tests,totalNaira:tests.reduce((sum:number,test:any)=>sum+(test.priceNaira??0),0),unquoted:tests.some((test:any)=>test.priceNaira===null),appointmentDate:input.appointmentDate,appointmentTime:input.appointmentTime,status:'Booked',paymentStatus:'Unpaid',createdAt:new Date().toISOString(),catalogueRevision:catalogue.revision};
     data.bookings[token]=booking;data.outbox.push({entity:'online_booking',payload:booking,state:'pending_astra_connection'});return booking;
   });
 }
 async booking(token:string,scope?:CatalogueScope){if(!tokenPattern.test(token))throw new CatalogueError(404,'Booking not found.');const booking=(await this.read()).bookings[token];if(!booking||scope&&(booking.scope.tenantId!==scope.tenantId||booking.scope.branchId!==scope.branchId))throw new CatalogueError(404,'Booking not found at this branch.');return booking;}
 async checkIn(token:string,scope:CatalogueScope,actor:CatalogueActor){
   return this.transaction(async data=>{const booking=data.bookings[token];if(!booking||booking.scope.tenantId!==scope.tenantId||booking.scope.branchId!==scope.branchId)throw new CatalogueError(404,'Booking not found at this branch.');if(booking.status==='Cancelled')throw new CatalogueError(410,'Booking cancelled.');
     const bundle=await this.catalogue.acceptBooking(scope,actor,booking);
     const alreadyCheckedIn=booking.status==='Checked In';booking.status='Checked In';booking.checkedInAt=booking.checkedInAt||new Date().toISOString();data.outbox.push({entity:'booking_checkin',id:booking.id,at:booking.checkedInAt,actorId:actor.id,state:'pending_astra_connection'});
     return {...bundle,patient:{...booking.patient,mrn:booking.number,allergies:[],chronicConditions:[],createdAt:booking.createdAt},alreadyCheckedIn,bookingNumber:booking.number};
   });
 }
 async preparePayment(token:string){
  return this.transaction(async data=>{
    const booking=data.bookings[token];if(!booking)throw new CatalogueError(404,'Booking not found.');
    if(booking.status==='Checked In'&&(await this.catalogue.bookingPaymentState(booking.scope,booking.id))!=='Unpaid')throw new CatalogueError(409,'Payment is already recorded at the facility. Ask reception to reconcile the remaining balance.');
    if(booking.paymentStatus==='Paid')throw new CatalogueError(409,'This booking is already paid.');
    if(booking.unquoted||booking.tests.some((test:any)=>test.priceStatus!=='facility'))throw new CatalogueError(409,'The facility must confirm all fees before online payment.');
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(booking.patient.email||''))throw new CatalogueError(400,'An email address is required for online payment. Contact reception.');
    const amountMinor=Math.round(booking.totalNaira*100);if(amountMinor<=0)throw new CatalogueError(400,'No payable amount is recorded.');
    booking.payment=booking.payment||{bookingId:booking.id,reference:'TKP-'+randomBytes(12).toString('hex'),amountMinor,email:booking.patient.email};
    return booking.payment;
  });
 }
 async confirmOnlinePayment(token:string,proof:any){
  return this.transaction(async data=>{
    const booking=data.bookings[token];if(!booking||booking.payment?.reference!==proof.reference)throw new CatalogueError(409,'Payment does not match this booking.');
    if(booking.paymentStatus==='Paid')return {number:booking.number,paymentStatus:'Paid',paymentMode:booking.paymentMode};
    if(booking.status==='Checked In')await this.catalogue.markBookingPaid(booking.scope,booking.id,proof);
    booking.paymentStatus='Paid';booking.paymentProof=proof;booking.paymentMode=proof.mode;
    data.outbox.push({entity:'online_payment',bookingId:booking.id,payload:proof,state:'pending_astra_connection'});
    return {number:booking.number,paymentStatus:'Paid',paymentMode:proof.mode};
  });
 }

}
