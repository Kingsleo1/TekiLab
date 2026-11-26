import {Router} from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {catalogueCapabilities} from '../lib/test-catalog';
export function createClinicalStateRouter(root:string,preview:boolean){
 const router=Router();let writes=Promise.resolve();
 router.post('/',async(req,res)=>{
  if(!preview)return res.status(503).json({error:'Configure trusted clinical authentication and production storage before shared clinical sync.'});
  try{const actor=JSON.parse(decodeURIComponent(String(req.headers['x-tekilab-preview-actor']||'')));if(!catalogueCapabilities(actor).orderTests&&!catalogueCapabilities(actor).managePrices)return res.status(403).json({error:'Your account cannot synchronize clinical records.'});
   const scope={tenantId:String(req.query.tenantId||''),branchId:String(req.query.branchId||'')};if(!/^[a-zA-Z0-9_-]{1,100}$/.test(scope.tenantId)||!/^[a-zA-Z0-9_-]{1,100}$/.test(scope.branchId)||scope.branchId==='all')return res.status(400).json({error:'Choose a specific facility branch.'});
   const allowed=['patients','encounters','charges','queueTickets','labOrders','imagingOrders'];const snapshot=req.body?.snapshot;if(!snapshot||Object.keys(snapshot).some(key=>!allowed.includes(key))||Object.values(snapshot).some(value=>!Array.isArray(value)||(value as any[]).length>10000))return res.status(400).json({error:'Unsupported clinical snapshot.'});
   const safe=JSON.parse(JSON.stringify(snapshot,(key,value)=>/^(password|passwordHash|secret|accessToken|refreshToken|applicationToken)$/i.test(key)?undefined:value));
   const directory=path.join(root,'data/local-preview/clinical-state'),id=createHash('sha256').update(scope.tenantId+'|'+scope.branchId).digest('hex'),file=path.join(directory,id+'.json');
   const action=writes.catch(()=>{}).then(async()=>{let previous:any={snapshot:{},outbox:[]};try{previous=JSON.parse(await fs.readFile(file,'utf8'));}catch(error:any){if(error.code!=='ENOENT')throw error;}let changed=0;for(const [key,value] of Object.entries(safe)){if(JSON.stringify(previous.snapshot[key])===JSON.stringify(value))continue;const removed=(previous.snapshot[key]||[]).map((record:any)=>record.id).filter((id:string)=>!(value as any[]).some(record=>record.id===id));previous.snapshot[key]=value;previous.outbox.push({id:randomUUID(),entity:'clinical_state',...scope,actorId:actor.id,payload:{id:scope.tenantId+'|'+scope.branchId+'|'+key,scope,kind:key,records:value,deletedIds:removed},at:new Date().toISOString(),state:'pending_astra_connection'});changed++;}await fs.mkdir(directory,{recursive:true});const temporary=file+'.'+randomUUID()+'.tmp';await fs.writeFile(temporary,JSON.stringify(previous),{mode:0o600});await fs.rename(temporary,file);return changed;});writes=action.then(()=>{});const changed=await action;res.json({saved:true,changed,astraSync:'pending_or_held'});
  }catch{return res.status(503).json({error:'Clinical synchronization was not confirmed. Your browser records remain available.'});}
 });return router;
}
