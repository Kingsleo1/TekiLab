import {CatalogueError} from './catalogue-errors';
export {CatalogueError} from './catalogue-errors';
import {validatePublishedReport} from './report-validation';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { canApproveReport } from '../lib/report-approval';
import { chargeForOrder } from '../lib/workflow';
import { assertCatalogueItem, catalogueCapabilities, displayedPrice } from '../lib/test-catalog';
import type { CatalogueActor, CatalogueScope, CatalogueSnapshot, TestCatalogueItem } from '../types/test-catalog';
interface StoreData { revision:number; overrides:Record<string,TestCatalogueItem>; audit:any[]; outbox:any[]; orders:Record<string,any>; updatedAt:string|null }
const initial=():StoreData=>({revision:0,overrides:{},audit:[],outbox:[],orders:{},updatedAt:null});
export class TestCatalogueStore {
  private writes = Promise.resolve();
  constructor(private directory:string, private seed:TestCatalogueItem[]) {}
  private file(scope:CatalogueScope) {
    if(!/^[a-zA-Z0-9_-]{1,100}$/.test(scope.tenantId)||!/^[a-zA-Z0-9_-]{1,100}$/.test(scope.branchId)||scope.branchId==='all')throw new CatalogueError(400,'Choose a specific facility branch.');
    return path.join(this.directory,createHash('sha256').update(scope.tenantId+'|'+scope.branchId).digest('hex')+'.json');
  }
  private async read(scope:CatalogueScope):Promise<StoreData> {
    try { const value=JSON.parse(await fs.readFile(this.file(scope),'utf8'));if(!Number.isInteger(value.revision)||!value.overrides||!Array.isArray(value.audit)||!Array.isArray(value.outbox)||!value.orders)throw Error('Invalid catalogue database');return value; }
    catch(error:any) { if(error.code==='ENOENT')return initial();throw error; }
  }
  private items(data:StoreData) {
    const merged=new Map(this.seed.map(item=>[item.id,item]));
    Object.values(data.overrides).forEach(item=>merged.set(item.id,item));return Array.from(merged.values());
  }
  private snapshot(data:StoreData,actor?:CatalogueActor):CatalogueSnapshot {
    const caps=catalogueCapabilities(actor);
    return {revision:data.revision,items:this.items(data),...(caps.managePrices||caps.manageTests?{audit:data.audit.slice(-100).reverse()}:{}),updatedAt:data.updatedAt,persistence:'local-database',astraSync:'held'};
  }
  async get(scope:CatalogueScope,actor?:CatalogueActor) { return this.snapshot(await this.read(scope),actor); }
  private async transaction<T>(scope:CatalogueScope, action:(data:StoreData)=>T|Promise<T>):Promise<T> {
    let resolve!: (value:T)=>void;let reject!:(error:unknown)=>void;
    const result=new Promise<T>((res,rej)=>{resolve=res;reject=rej;});
    this.writes=this.writes.catch(()=>{}).then(async()=>{
      try { const file=this.file(scope);const data=await this.read(scope);const value=await action(data);
        await fs.mkdir(this.directory,{recursive:true});const temporary=file+'.'+randomUUID()+'.tmp';
        await fs.writeFile(temporary,JSON.stringify(data),{encoding:'utf8',mode:0o600});await fs.rename(temporary,file);resolve(value);
      }catch(error){reject(error);}
    });return result;
  }
  async mutate(scope:CatalogueScope,actor:CatalogueActor,baseRevision:number,itemId:string|null,patch:Record<string,any>) {
    return this.transaction(scope,data=>{
      if(data.revision!==baseRevision)throw new CatalogueError(409,'The catalogue changed elsewhere. Reload the latest version and retry.');
      const caps=catalogueCapabilities(actor);
      if(!caps.manageTests&&!caps.managePrices)throw new CatalogueError(403,'Your account cannot manage tests or prices.');
      if(!Object.keys(patch).length)throw new CatalogueError(400,'No catalogue change was supplied.');
      const clinical=['name','code','category','sampleType','container','turnaroundTimeHours','targetTatMinutes','workflow','templateReviewed','parameters','isActive','department','modality','bodySite'];
      const price=['priceNaira','priceStatus'];
      if(Object.keys(patch).some(key=>![...clinical,...price].includes(key)))throw new CatalogueError(400,'Unsupported catalogue field.');
      if(Object.keys(patch).some(key=>clinical.includes(key))&&!caps.manageTests)throw new CatalogueError(403,'Your account cannot add, remove or configure tests.');
      if(Object.keys(patch).some(key=>price.includes(key))&&!caps.managePrices)throw new CatalogueError(403,'Your account cannot change test fees.');
      if(!itemId&&!caps.manageTests)throw new CatalogueError(403,'Your account cannot add tests.');
      const existing=itemId?this.items(data).find(item=>item.id===itemId):undefined;
      if(itemId&&!existing)throw new CatalogueError(404,'Test not found.');
      if(patch.priceStatus&&!['facility','quote_required'].includes(patch.priceStatus))throw new CatalogueError(400,'Edited fees must be facility fees or quote-required.');
      const item:TestCatalogueItem={...(existing||{id:'custom-'+randomUUID(),code:'',name:'',category:'',sampleType:'',turnaroundTimeHours:0,priceNaira:0,priceStatus:'quote_required',priceObservations:[],sourceUrls:[],workflow:'laboratory',parameters:[],isActive:true,createdAt:new Date().toISOString()}),...patch,updatedAt:new Date().toISOString()};
      try { assertCatalogueItem(item); }catch(error:any){throw new CatalogueError(400,error.message);}
      if(this.items(data).some(other=>other.id!==item.id&&other.code.toLowerCase()===item.code.toLowerCase()))throw new CatalogueError(409,'A test with that code already exists.');
      data.revision++;data.updatedAt=item.updatedAt!;data.overrides[item.id]=item;
      const event={id:randomUUID(),at:data.updatedAt,actorId:actor.id,actorName:actor.name||actor.id,action:!existing?'created':item.isActive?'updated':'removed',itemId:item.id,revision:data.revision};
      data.audit.push(event);data.outbox.push({...event,entity:'test_catalogue',tenantId:scope.tenantId,branchId:scope.branchId,payload:item,state:'pending_astra_connection'});
      return this.snapshot(data,actor);
    });
  }
  async order(scope:CatalogueScope,actor:CatalogueActor,input:any) {
    if(!catalogueCapabilities(actor).orderTests)throw new CatalogueError(403,'Your account cannot order laboratory tests.');
    if(!Array.isArray(input.testIds)||input.testIds.length<1||input.testIds.length>50||new Set(input.testIds).size!==input.testIds.length)throw new CatalogueError(400,'Select between 1 and 50 different tests.');
    if(!/^[a-zA-Z0-9_-]{1,100}$/.test(input.requestId||'')||!input.patient?.id||!input.patient?.fullName?.trim()||String(input.patient.fullName).length>160)throw new CatalogueError(400,'A patient and order request identifier are required.');
    return this.transaction(scope,data=>{
      const fingerprint=createHash('sha256').update(JSON.stringify({testIds:input.testIds,patient:input.patient})).digest('hex');
      if(data.orders[input.requestId]){if(data.orders[input.requestId].fingerprint!==fingerprint)throw new CatalogueError(409,'Order request identifier already used.');return data.orders[input.requestId];}
      if(data.revision!==input.baseRevision)throw new CatalogueError(409,'Fees or tests changed. Review the updated order before submitting.');
      const available=this.items(data);const now=new Date().toISOString();
      const orders=input.testIds.map((id:string)=>{
        const item=available.find(test=>test.id===id&&test.isActive);if(!item)throw new CatalogueError(400,'A selected test is no longer available.');
        const price=displayedPrice(item);const orderId='cat-'+randomUUID();
        return {id:orderId,tenantId:scope.tenantId,facilityId:scope.branchId,patientId:String(input.patient.id),patientName:input.patient.fullName.trim(),mrn:String(input.patient.mrn||''),
          patientPhone:String(input.patient.phone||''),testId:item.id,testName:item.name,category:item.category,sampleType:item.sampleType,accessionNumber:'CAT-'+randomUUID(),
          sampleStatus:'Awaiting Collection',orderStatus:item.workflow==='imaging'?'Awaiting Scan':'ORDERED',department:item.department||'Laboratory',modality:item.modality,bodySite:item.bodySite,priceNaira:price??0,pricingStatus:price===null?'Unquoted':'Quoted',pricingBasis:item.priceStatus,billingStatus:'Pending',
          createdAt:now,source:'TEST_CATALOGUE',catalogueRevision:data.revision,catalogueSnapshot:{id:item.id,code:item.code,name:item.name,priceNaira:price,priceStatus:item.priceStatus,priceObservations:item.priceObservations,parameters:item.parameters||[],department:item.department,modality:item.modality,bodySite:item.bodySite}};
      });
      const result=this.bundle(input.requestId,orders,now);
      (result as any).fingerprint=fingerprint;data.orders[input.requestId]=result;
      for(const order of orders)data.outbox.push({id:randomUUID(),entity:'lab_order',tenantId:scope.tenantId,branchId:scope.branchId,payload:order,state:'pending_astra_connection',at:now,actorId:actor.id});
      return result;
    });
  }
  private bundle(requestId:string,orders:any[],createdAt:string) {
    const queueTickets=orders.flatMap(order=>[
      {id:'queue-'+order.id,sourceOrderId:order.id,patientId:order.patientId,patientName:order.patientName,mrn:order.mrn,ticketNumber:order.accessionNumber,tenantId:order.tenantId,facilityId:order.facilityId,orderSource:order.orderSource||'WALK_IN',department:order.department==='Radiology'?'Radiology':'Laboratory',status:['RELEASED','Released'].includes(order.orderStatus)?'Completed':'Waiting',priority:'Normal',issuedAt:createdAt,createdAt,notes:order.testName},
      ...(['RELEASED','Released'].includes(order.orderStatus)&&(!order.rapidWorkflow||order.consultationRequested===true)?[{id:'followup-'+order.id,sourceOrderId:order.id,patientId:order.patientId,patientName:order.patientName,mrn:order.mrn,ticketNumber:'REV-'+order.accessionNumber,department:'Doctor Consultation',status:'Waiting',priority:'Normal',issuedAt:createdAt,createdAt,notes:'Released result ready: '+order.testName}]:[])
    ]);
    const charges=orders.filter(order=>order.pricingStatus==='Quoted').map(order=>({...chargeForOrder(order,order.department==='Radiology'),paymentStatus:order.billingStatus==='Paid'?'Paid':'Unpaid'}));
    return {requestId,orders,charges,queueTickets,createdAt,persistence:'local-database',astraSync:'held'};
  }
  async records(scope:CatalogueScope,actor:CatalogueActor) {
    const caps=catalogueCapabilities(actor);
    if(!caps.orderTests&&!caps.managePrices&&!caps.manageTests)throw new CatalogueError(403,'Your account cannot read branch order records.');
    const data=await this.read(scope);
    const bundles=Object.values(data.orders);
    const merged={orders:bundles.flatMap((b:any)=>b.orders),charges:bundles.flatMap((b:any)=>b.charges||[]),queueTickets:bundles.flatMap((b:any)=>b.queueTickets||[])};
    return merged;
  }
  async saveRecord(scope:CatalogueScope,actor:CatalogueActor,order:any) {
    return this.transaction(scope,data=>{
      if(!order?.id||!order.patientId||!order.patientName||!order.testName||!order.accessionNumber)throw new CatalogueError(400,'An identified test order is required.');
      let key=Object.keys(data.orders).find(key=>data.orders[key].orders.some((existing:any)=>existing.id===order.id));
      const previous=key?data.orders[key].orders.find((existing:any)=>existing.id===order.id):null;
      if(previous&&(previous.patientId!==order.patientId||previous.testId!==order.testId||previous.priceNaira!==order.priceNaira))throw new CatalogueError(409,'Order identity and the agreed price cannot be changed by a result update.');
      if(previous&&['patientName','mrn','testName','accessionNumber','modality','bodySite'].some(field=>(previous[field]??'')!==(order[field]??'')))throw new CatalogueError(409,'Order identity and scan protocol cannot be changed by a result update.');
      if(previous&&(previous.department||'Laboratory')!==(order.department||'Laboratory'))throw new CatalogueError(409,'An order cannot change departments.');
      const imaging=order.department==='Radiology';
      if(imaging&&order.orderStatus==='Released'&&previous?.orderStatus==='Awaiting Scan')throw new CatalogueError(409,'Record scan completion before report approval.');
      if(['RELEASED','Released'].includes(order.orderStatus))validatePublishedReport(actor,imaging?'radiology':'laboratory',order,{id:order.patientId});
      else if(!catalogueCapabilities(actor).orderTests&&!catalogueCapabilities(actor).manageTests)throw new CatalogueError(403,'Your account cannot update diagnostic orders.');
      if(previous&&['RELEASED','Released'].includes(previous.orderStatus)){
        const clinical=(value:any)=>JSON.stringify([value.results,value.clinicalInterpretation,value.likelyIssue,value.findingsNotes,value.impressionNotes,value.techniqueNotes,value.recommendationsNotes,value.reportApproval]);
        if(clinical(previous)!==clinical(order))throw new CatalogueError(409,'Released clinical findings cannot be overwritten.');
      }
      if(order.billingStatus==='Paid'&&previous?.billingStatus!=='Paid'&&!catalogueCapabilities(actor).managePrices&&!/recept/i.test(actor.role))throw new CatalogueError(403,'Your account cannot record payment.');
      if(!previous&&!['RELEASED','Released'].includes(order.orderStatus))throw new CatalogueError(400,'Create a catalogue order before entering results.');
      if(!key)key='report-'+order.id;
      const source=data.orders[key];
      const orders=source?source.orders.map((entry:any)=>entry.id===order.id?{...order,source:'TEST_CATALOGUE',tenantId:scope.tenantId,facilityId:scope.branchId}:entry):[{...order,source:'TEST_CATALOGUE',tenantId:scope.tenantId,facilityId:scope.branchId}];
      const bundle=this.bundle(key,orders,source?.createdAt||order.createdAt||new Date().toISOString());
      // Preserve previously completed follow-up tickets when only billing changes.
      if(source)for(const ticket of bundle.queueTickets){const prior=source.queueTickets?.find((q:any)=>q.id===ticket.id);if(prior?.status==='Completed')ticket.status='Completed';}
      data.orders[key]=bundle;
      data.outbox.push({id:randomUUID(),entity:'lab_order',tenantId:scope.tenantId,branchId:scope.branchId,payload:order,state:'pending_astra_connection',at:new Date().toISOString(),actorId:actor.id});
      return bundle;
    });
  }

  async acceptBooking(scope:CatalogueScope,actor:CatalogueActor,booking:any){
    if(!catalogueCapabilities(actor).orderTests)throw new CatalogueError(403,'Your account cannot check in bookings.');
    return this.transaction(scope,data=>{
      const key=booking.id;if(data.orders[key])return data.orders[key];
      const now=new Date().toISOString();
      const orders=booking.tests.map((test:any)=>({id:'cat-'+randomUUID(),tenantId:scope.tenantId,facilityId:scope.branchId,patientId:booking.patient.id,patientName:booking.patient.fullName,mrn:booking.number,patientPhone:booking.patient.phone,testId:test.id,testName:test.name,category:test.category,sampleType:test.sampleType,accessionNumber:'CAT-'+randomUUID(),sampleStatus:'Awaiting Collection',department:test.department||'Laboratory',modality:test.modality,bodySite:test.bodySite,orderStatus:test.department==='Radiology'?'Awaiting Scan':'ORDERED',priceNaira:test.priceNaira??0,pricingStatus:test.priceNaira===null?'Unquoted':'Quoted',pricingBasis:test.priceStatus,billingStatus:booking.paymentStatus==='Paid'?'Paid':'Pending',createdAt:now,source:'TEST_CATALOGUE',orderSource:'ONLINE',bookingId:booking.id,catalogueRevision:booking.catalogueRevision,catalogueSnapshot:test}));
      const bundle=this.bundle(key,orders,now);data.orders[key]=bundle;
      data.outbox.push({id:randomUUID(),entity:'booking_orders',payload:bundle,state:'pending_astra_connection',at:now,actorId:actor.id});
      return bundle;
    });
  }

  async payment(scope:CatalogueScope,actor:CatalogueActor,orderId:string){
    if(!catalogueCapabilities(actor).managePrices&&!/recept/i.test(actor.role))throw new CatalogueError(403,'Your account cannot record payment.');
    return this.transaction(scope,data=>{
      const key=Object.keys(data.orders).find(key=>data.orders[key].orders.some((order:any)=>order.id===orderId));
      if(!key)throw new CatalogueError(404,'Order not found.');
      const bundle=data.orders[key],order=bundle.orders.find((o:any)=>o.id===orderId);
      if(order.pricingStatus!=='Quoted')throw new CatalogueError(400,'Set and confirm a fee before recording payment.');
      if(order.billingStatus==='Paid')return bundle;
      order.billingStatus='Paid';bundle.charges=bundle.orders.filter((o:any)=>o.pricingStatus==='Quoted').map((o:any)=>({...chargeForOrder(o,o.department==='Radiology'),paymentStatus:o.billingStatus==='Paid'?'Paid':'Unpaid'}));
      data.outbox.push({id:randomUUID(),entity:'order_payment',orderId,at:new Date().toISOString(),actorId:actor.id,state:'pending_astra_connection'});
      return bundle;
    });
  }

 async markBookingPaid(scope:CatalogueScope,bookingId:string,proof:any){
  return this.transaction(scope,data=>{
   const bundle=data.orders[bookingId];if(!bundle)throw new CatalogueError(404,'Checked-in booking orders not found.');
   bundle.orders.forEach((order:any)=>{order.billingStatus='Paid';order.paymentMode=proof.mode;});
   bundle.charges.forEach((charge:any)=>{charge.paymentStatus='Paid';charge.paymentMode=proof.mode;});
   data.outbox.push({entity:'booking_payment',bookingId,proof,state:'pending_astra_connection'});return bundle;
  });
 }

 async bookingPaymentState(scope:CatalogueScope,bookingId:string){
   const bundle=(await this.read(scope)).orders[bookingId];if(!bundle)return 'Unpaid';const paid=bundle.orders.filter((order:any)=>order.billingStatus==='Paid').length;return paid===bundle.orders.length?'Paid':paid?'Partly Paid':'Unpaid';
 }

}
