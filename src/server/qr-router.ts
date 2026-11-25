import {FlutterwaveBookingPayments} from './flutterwave-payments';
import {Router} from 'express';
import path from 'node:path';
import {QRRegistry} from './qr-registry';
import {CatalogueError,TestCatalogueStore} from './test-catalog-store';
import {catalogueCapabilities} from '../lib/test-catalog';
import type {CatalogueActor,CatalogueScope} from '../types/test-catalog';
export function createQRRouter(root:string,previewMode:boolean,catalogue:TestCatalogueStore){
 const router=Router(),registry=new QRRegistry(path.join(root,'data/local-preview/qr-registry.json'),catalogue);
 const publicScope={tenantId:process.env.TEKILAB_BOOKING_TENANT_ID||'tenant-tekilab-01',branchId:process.env.TEKILAB_BOOKING_BRANCH_ID||'pharma-1'};
 const payments=new FlutterwaveBookingPayments(process.env.FLW_SECRET_KEY,previewMode);
 const configuredOrigin=process.env.PUBLIC_SITE_URL;
 const siteOrigin=configuredOrigin?new URL(configuredOrigin).origin:'http://localhost:3000';
 if(configuredOrigin&&!siteOrigin.startsWith('https://')&&!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(siteOrigin))throw Error('PUBLIC_SITE_URL requires HTTPS.');
 const wrap=(fn:any)=>async(req:any,res:any)=>{try{await fn(req,res);}catch(error){res.status(error instanceof CatalogueError?error.status:503).json({error:error instanceof CatalogueError?error.message:'The local QR registry is unavailable. No changes were confirmed.'});}};
 router.use((req,res,next)=>{res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Robots-Tag','noindex, nofollow');next();});
 // Reads expose only deliberately published bearer-link records. No report listing exists.
 router.get('/results/:token',wrap(async(req:any,res:any)=>res.json(await registry.verify(req.params.token))));
 router.get('/booking/:token',wrap(async(req:any,res:any)=>{const b=await registry.booking(req.params.token);res.json({number:b.number,status:b.status,paymentStatus:b.status==='Checked In'?await catalogue.bookingPaymentState(b.scope,b.id):b.paymentStatus,paymentMode:b.paymentMode,onlineCheckoutAvailable:payments.enabled,appointmentDate:b.appointmentDate,appointmentTime:b.appointmentTime});}));
 router.get('/booking-config',wrap(async(req:any,res:any)=>{if(!previewMode)throw new CatalogueError(503,'Online booking requires a configured production backend.');const snapshot=await catalogue.get(publicScope);res.json({...snapshot,items:snapshot.items.filter(item=>item.isActive),scope:publicScope,siteOrigin,localOnly:/localhost|127\.0\.0\.1/.test(new URL(siteOrigin).hostname)});}));
 const rates=new Map<string,{at:number,count:number}>();
 router.post('/book',wrap(async(req:any,res:any)=>{
   if(!previewMode)throw new CatalogueError(503,'Online booking requires a configured production backend.');
   const key=req.ip||'local',now=Date.now(),bucket=rates.get(key);if(!bucket||now-bucket.at>60000)rates.set(key,{at:now,count:1});else if(++bucket.count>20)throw new CatalogueError(429,'Please wait before submitting more bookings.');
   const booking=await registry.book(publicScope,req.body);res.status(201).json({...booking,receiptUrl:siteOrigin+'/booking/'+booking.token,onlineCheckoutAvailable:payments.enabled,localOnly:/localhost|127\.0\.0\.1/.test(new URL(siteOrigin).hostname)});
 }));
 router.post('/booking/:token/payment/initialize',wrap(async(req:any,res:any)=>{if(!previewMode)throw new CatalogueError(503,'Production checkout requires the approved backend.');if(!payments.enabled)throw new CatalogueError(503,'Online checkout is not configured. Please arrange payment with reception.');const payment=await registry.preparePayment(req.params.token);res.json(await payments.initialize(payment,siteOrigin+'/booking/'+req.params.token));}));
 router.post('/booking/:token/payment/verify',wrap(async(req:any,res:any)=>{if(!previewMode)throw new CatalogueError(503,'Production checkout requires the approved backend.');const booking=await registry.booking(req.params.token);if(booking.paymentStatus==='Paid'){if(booking.payment?.reference!==String(req.body?.reference||''))throw new CatalogueError(409,'Payment reference does not match.');return res.json({paymentStatus:'Paid',paymentMode:booking.paymentMode});}const payment=await registry.preparePayment(req.params.token);const proof=await payments.verify(payment,String(req.body?.reference||''));res.json(await registry.confirmOnlinePayment(req.params.token,proof));}));
 router.use((req,res,next)=>{
   if(!previewMode)return res.status(503).json({error:'Trusted server authentication must be configured before staff QR actions can be enabled.'});
   try{const actor=JSON.parse(decodeURIComponent(String(req.headers['x-tekilab-preview-actor']||''))) as CatalogueActor;
     if(!actor.id||!actor.name||typeof actor.role!=='string'||!Array.isArray(actor.permissions||[]))throw Error();
     res.locals.actor=actor;res.locals.scope={tenantId:String(req.query.tenantId||''),branchId:String(req.query.branchId||'')};next();
   }catch{return res.status(401).json({error:'Sign in to validate a booking or publish a report.'});}
 });
 router.post('/results',wrap(async(req:any,res:any)=>{const published:any=await registry.publish(res.locals.scope,res.locals.actor,req.body);res.status(201).json({...published,url:siteOrigin+'/verify/'+published.token,localOnly:/localhost|127\.0\.0\.1/.test(new URL(siteOrigin).hostname)});}));
 router.post('/results/:token/revoke',wrap(async(req:any,res:any)=>res.json(await registry.revoke(res.locals.scope,res.locals.actor,req.params.token))));
 router.post('/scan',wrap(async(req:any,res:any)=>{
   if(!catalogueCapabilities(res.locals.actor).orderTests)throw new CatalogueError(403,'Your account cannot validate bookings.');
   let token=String(req.body?.code||'').trim();
   if(token.startsWith('http')){let url;try{url=new URL(token);}catch{throw new CatalogueError(400,'Invalid QR address.');}if(![siteOrigin,'http://localhost:3000'].includes(url.origin)||!/^\/booking\/[A-Za-z0-9_-]{43}$/.test(url.pathname))throw new CatalogueError(400,'Scan a TekiLab booking QR for this site.');token=url.pathname.split('/')[2];}
   const booking=await registry.booking(token,res.locals.scope);res.json({token,booking});
 }));
 router.post('/booking/:token/check-in',wrap(async(req:any,res:any)=>{
   if(!catalogueCapabilities(res.locals.actor).orderTests)throw new CatalogueError(403,'Your account cannot check in bookings.');
   if(req.body?.identityConfirmed!==true)throw new CatalogueError(400,'Confirm the client identity before check-in.');
   res.json(await registry.checkIn(req.params.token,res.locals.scope,res.locals.actor));
 }));
 return router;
}
