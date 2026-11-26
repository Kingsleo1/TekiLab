import {Router} from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomUUID,timingSafeEqual} from 'node:crypto';
import {CatalogueError} from './catalogue-errors';
const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
export class AstraManagement{
 private credentials:{endpoint:string;token:string;keyspace:string}|null=null;
 private syncing=false;
 constructor(private root:string,private env:Record<string,string|undefined>,private transport:typeof fetch=fetch){}
 private validate(input:any){const endpoint=new URL(String(input.endpoint||''));if(endpoint.protocol!=='https:'||!/^[-a-z0-9]+\.apps\.astra\.datastax\.com$/.test(endpoint.hostname)||endpoint.port||endpoint.username||endpoint.password||endpoint.pathname!=='/'||endpoint.search||endpoint.hash)throw new CatalogueError(400,'Use the database HTTPS endpoint from the Astra portal.');const keyspace=String(input.keyspace||'default_keyspace');if(!/^[a-z][a-z0-9_]{0,47}$/.test(keyspace)||!/^AstraCS:[A-Za-z0-9:_+-]{10,}$/.test(input.token||''))throw new CatalogueError(400,'Enter a valid keyspace and Astra application token.');return {endpoint:endpoint.origin,keyspace,token:String(input.token)};}
 private config(){if(this.credentials)return this.credentials;if(this.env.ASTRA_DB_API_ENDPOINT&&this.env.ASTRA_DB_APPLICATION_TOKEN)return this.validate({endpoint:this.env.ASTRA_DB_API_ENDPOINT,token:this.env.ASTRA_DB_APPLICATION_TOKEN,keyspace:this.env.ASTRA_DB_KEYSPACE});return null;}
 async definitions(){const schema=JSON.parse(await fs.readFile(path.join(this.root,'src/schemas/tekilab-database-schema.json'),'utf8'));return Object.keys(schema.collections);}
 private async request(command:any,collection?:string,credentials=this.config()){
  if(!credentials)throw new CatalogueError(503,'Configure server-side Astra credentials first.');
  let response:any,value:any;try{response=await this.transport(credentials.endpoint+'/api/json/v1/'+encodeURIComponent(credentials.keyspace)+(collection?'/'+encodeURIComponent(collection):''),{method:'POST',headers:{Token:credentials.token,'Content-Type':'application/json'},body:JSON.stringify(command),redirect:'error',signal:AbortSignal.timeout(12000)});value=await response.json();}catch{throw new CatalogueError(502,'Astra could not be reached. No operation was confirmed.');}
  if(!response.ok||value.errors?.length)throw new CatalogueError(502,'Astra rejected the operation. Check the token, keyspace and database permissions.');if(command.findCollections&&!Array.isArray(value.status?.collections))throw new CatalogueError(502,'Astra did not confirm the collection list.');if(command.createCollection&&value.status?.ok!==1)throw new CatalogueError(502,'Astra did not confirm collection creation.');if(command.findOneAndReplace&&!(Number(value.status?.matchedCount)>0||value.status?.upsertedId))throw new CatalogueError(502,'Astra did not confirm the record write; it remains queued.');return value;
 }
 async configure(input:any){const credentials=this.validate(input);const result=await this.request({findCollections:{}},undefined,credentials);this.credentials=credentials;return {...await this.status(),connected:true,existingCollections:result.status.collections,message:'Astra connection verified. Credentials are held only for this server session.'};}
 async status(){const config=this.config();const pending=(await this.events()).length;return {configured:!!config,keyspace:config?.keyspace||'default_keyspace',credentialStorage:this.credentials?'server-session':'server-environment',writesEnabled:this.env.TEKILAB_ENABLE_ASTRA_WRITES==='true',pendingEvents:pending,collections:await this.definitions(),message:config?'Credentials configured. Use Test connection to verify access.':'Set server credentials or connect for this server session. No token is kept in browser storage.'};}
 async test(){const result=await this.request({findCollections:{}});return {...await this.status(),connected:true,existingCollections:result.status?.collections||[],message:'Astra connection verified.'};}
 async initialize(){if(this.env.TEKILAB_ENABLE_ASTRA_WRITES!=='true')throw new CatalogueError(423,'Astra writes are held. Enable TEKILAB_ENABLE_ASTRA_WRITES on the server after schema review.');const current=await this.request({findCollections:{}});const existing=(current.status?.collections||[]).map((x:any)=>typeof x==='string'?x:x.name);const created=[];for(const name of await this.definitions()){if(existing.includes(name))continue;await this.request({createCollection:{name}});created.push(name);}return {createdCollections:created,...await this.test()};}
 private async events(){
  const directory=path.join(this.root,'data/local-preview'),files:string[]=[];
  for(const part of ['catalogue','clinical-state']){try{for(const file of await fs.readdir(path.join(directory,part)))if(/^[a-f0-9]{64}\.json$/.test(file))files.push(part+'/'+file);}catch(error:any){if(error.code!=='ENOENT')throw error;}}
  try{await fs.access(path.join(directory,'qr-registry.json'));files.push('qr-registry.json');}catch{}
  let acknowledgements:any={};try{acknowledgements=JSON.parse(await fs.readFile(path.join(directory,'astra-sync-ack.json'),'utf8'));}catch(error:any){if(error.code!=='ENOENT')throw error;}
  const events:any[]=[];for(const file of files){const data=JSON.parse(await fs.readFile(path.join(directory,file),'utf8'));for(const [index,event] of (data.outbox||[]).entries()){const id=hash(file+'|'+index+'|'+JSON.stringify(event));if(!acknowledgements[id])events.push({id,event});}}return events;
 }
 async sync(){
  if(this.env.TEKILAB_ENABLE_ASTRA_WRITES!=='true')throw new CatalogueError(423,'Astra writes are held until enabled on the server.');if(this.syncing)throw new CatalogueError(409,'A sync is already running.');this.syncing=true;
  try{const mapping:Record<string,string>={verified_report:'approved_reports',verified_report_revocation:'audit_events',test_catalogue:'test_catalogue',lab_order:'diagnostic_orders',online_booking:'online_bookings',online_payment:'payment_transactions',clinical_state:'clinical_snapshots',result_notification:'result_notifications',patient_portal_link:'patient_portal_links'};const ackFile=path.join(this.root,'data/local-preview/astra-sync-ack.json');let acknowledgements:any={};try{acknowledgements=JSON.parse(await fs.readFile(ackFile,'utf8'));}catch(error:any){if(error.code!=='ENOENT')throw error;}let synced=0;
   for(const {id,event} of (await this.events()).slice(0,200)){
    const payload=event.payload||event,scope=payload.scope||event;
    const clinicalCollections:Record<string,string>={patients:'patients',encounters:'encounters',charges:'charges',queueTickets:'queue_tickets',labOrders:'diagnostic_orders',imagingOrders:'diagnostic_orders'};
    const collection=event.entity==='clinical_state'?(clinicalCollections[payload.kind]||'clinical_snapshots'):(mapping[event.entity]||'audit_events');
    const documents=event.entity==='clinical_state'&&Array.isArray(payload.records)?[...payload.records,...(payload.deletedIds||[]).map((id:string)=>({id,deletedAt:event.at}))]:[payload];
    for(const document of documents){
      const recordId=hash(collection+'|'+String(scope.tenantId||'')+'|'+String(scope.branchId||'')+'|'+String(document.id||event.key||id));
      await this.request({findOneAndReplace:{filter:{_id:recordId},replacement:{event_id:id,tenant_id:scope.tenantId||null,branch_id:scope.branchId||null,payload:document,updated_at:event.at||new Date().toISOString()},options:{upsert:true,returnDocument:'after'}}},collection);
    }
    acknowledgements[id]=new Date().toISOString();await fs.mkdir(path.dirname(ackFile),{recursive:true});const temporary=ackFile+'.'+randomUUID()+'.tmp';await fs.writeFile(temporary,JSON.stringify(acknowledgements),{mode:0o600});await fs.rename(temporary,ackFile);synced++;
   }
   return {synced,...await this.status()};
  }finally{this.syncing=false;}
 }
 start(){if(this.env.TEKILAB_ENABLE_ASTRA_WRITES!=='true')return;const timer=setInterval(()=>{if(this.config())this.sync().catch(()=>{});},5000);timer.unref();return timer;}
}
export function createAstraManagementRouter(root:string,preview:boolean){
 const router=Router(),manager=new AstraManagement(root,process.env);manager.start();
 router.use((req,res,next)=>{res.setHeader('Cache-Control','no-store');try{
  if(preview){const actor=JSON.parse(decodeURIComponent(String(req.headers['x-tekilab-preview-actor']||'')));if(!actor.id||!/^kernel admin$|^super admin$/i.test(actor.role))return res.status(403).json({error:'Only the platform super administrator can manage Astra.'});}
  else{const expected=process.env.TEKILAB_ADMIN_ACCESS_KEY||'',provided=String(req.headers.authorization||'').replace(/^Bearer /,'');if(expected.length<32||Buffer.byteLength(expected)!==Buffer.byteLength(provided)||!timingSafeEqual(Buffer.from(expected),Buffer.from(provided)))return res.status(401).json({error:'A valid server administrator access key is required.'});}next();
 }catch{return res.status(401).json({error:'Sign in as the platform super administrator.'});}});
 const run=(fn:any)=>async(req:any,res:any)=>{try{res.json(await fn(req));}catch(error){res.status(error instanceof CatalogueError?error.status:503).json({error:error instanceof CatalogueError?error.message:'Astra management is unavailable. No operation was confirmed.'});}};
 router.get('/status',run(()=>manager.status()));router.post('/configure',run((req:any)=>manager.configure(req.body)));router.post('/test',run(()=>manager.test()));router.post('/initialize',run(()=>manager.initialize()));router.post('/sync',run(()=>manager.sync()));return router;
}
