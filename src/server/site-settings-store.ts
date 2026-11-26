import fs from 'node:fs/promises';
import path from 'node:path';
import {timingSafeEqual,randomUUID} from 'node:crypto';
import {DEFAULT_SITE_SETTINGS,validateSiteSettings,type SiteSettingsSnapshot} from '../lib/site-settings';
import {CatalogueError} from './catalogue-errors';
export const SITE_SETTINGS_ID='tekilab-site-settings-v1';
export function authorizeSiteSettings(headers:Record<string,any>,preview:boolean,env:Record<string,string|undefined>){
 if(preview){try{const actor=JSON.parse(decodeURIComponent(String(headers['x-tekilab-preview-actor']||'')));if(actor.id&&/^(kernel admin|super admin|admin)$/i.test(actor.role))return;}catch{}throw new CatalogueError(403,'Only the platform super administrator can change site settings.');}
 const expected=env.TEKILAB_ADMIN_ACCESS_KEY||'',provided=String(headers.authorization||'').replace(/^Bearer /,'');
 if(expected.length<32||Buffer.byteLength(expected)!==Buffer.byteLength(provided)||!timingSafeEqual(Buffer.from(expected),Buffer.from(provided)))throw new CatalogueError(401,'Enter the server administrator access key configured in Vercel.');
}
export class SiteSettingsStore {
 private pending:Promise<unknown>=Promise.resolve();
 constructor(private root:string,private preview:boolean,private env:Record<string,string|undefined>,private transport:typeof fetch=fetch){}
 private file(){return path.join(this.root,'data/local-preview/site-settings','0'.repeat(64)+'.json');}
 private async request(command:any){
  const endpoint=this.env.ASTRA_DB_API_ENDPOINT,token=this.env.ASTRA_DB_APPLICATION_TOKEN,keyspace=this.env.ASTRA_DB_KEYSPACE||'default_keyspace',collection=this.env.TEKILAB_ASTRA_RECORDS_COLLECTION||'tekilab_records';
  if(!endpoint||!token)throw new CatalogueError(503,'Configure server-side Astra credentials before saving shared site settings.');
  let url:URL;try{url=new URL(endpoint);}catch{throw new CatalogueError(503,'Invalid server-side Astra endpoint.');}
  if(url.protocol!=='https:'||!/^[-a-z0-9]+\.apps\.astra\.datastax\.com$/.test(url.hostname)||url.port||url.username||url.password||!['','/'].includes(url.pathname)||url.search||url.hash||![keyspace,collection].every(v=>/^[a-z][a-z0-9_]{0,47}$/.test(v)))throw new CatalogueError(503,'Invalid server-side Astra configuration.');
  try{const response=await this.transport(url.origin+'/api/json/v1/'+keyspace+'/'+collection,{method:'POST',headers:{Token:token,'Content-Type':'application/json'},body:JSON.stringify(command),redirect:'error',signal:AbortSignal.timeout(12000)});const value=await response.json();if(!response.ok||value.errors?.length)throw new Error('provider rejected');return value;}catch{throw new CatalogueError(503,'Astra did not confirm this operation. No shared settings change was confirmed.');}
 }
 async read():Promise<SiteSettingsSnapshot>{
  if(this.preview){try{const data=JSON.parse(await fs.readFile(this.file(),'utf8'));return {...data.snapshot,settings:validateSiteSettings(data.snapshot.settings),storage:'local-server'};}catch(error:any){if(error.code!=='ENOENT')throw error;}}
  else if(this.env.ASTRA_DB_API_ENDPOINT&&this.env.ASTRA_DB_APPLICATION_TOKEN){const value=await this.request({findOne:{filter:{_id:SITE_SETTINGS_ID}}});if(!value.data||!('document' in value.data))throw new CatalogueError(503,'Astra did not confirm the settings lookup.');if(value.data.document){const payload=value.data.document.payload;return {settings:validateSiteSettings(payload.settings),revision:payload.revision,updatedAt:payload.updatedAt,storage:'astra'};}}
  return {settings:{...DEFAULT_SITE_SETTINGS},revision:0,updatedAt:null,storage:'defaults'};
 }
 async save(input:any):Promise<SiteSettingsSnapshot>{
  let settings;try{settings=validateSiteSettings(input?.settings);}catch(error:any){throw new CatalogueError(400,error.message);}
  if(!Number.isSafeInteger(input?.revision)||input.revision<0)throw new CatalogueError(400,'A valid settings revision is required.');
  const save=async()=>{
   if(!this.preview&&this.env.TEKILAB_ENABLE_ASTRA_WRITES!=='true')throw new CatalogueError(423,'Shared settings writes are held. Enable TEKILAB_ENABLE_ASTRA_WRITES after reviewing the database setup.');
   const current=await this.read();if(current.revision!==input.revision)throw new CatalogueError(409,'Settings changed in another session. Reload saved settings before editing again.');
   const snapshot:SiteSettingsSnapshot={settings,revision:current.revision+1,updatedAt:new Date().toISOString(),storage:this.preview?'local-server':'astra'};
   if(this.preview){let outbox:any[]=[];try{outbox=JSON.parse(await fs.readFile(this.file(),'utf8')).outbox||[];}catch(error:any){if(error.code!=='ENOENT')throw error;}
    outbox.push({id:randomUUID(),entity:'system_settings',payload:{id:SITE_SETTINGS_ID,...snapshot,entity:'system_settings_revision_'+snapshot.revision},at:snapshot.updatedAt,state:'pending_astra_connection'});
    await fs.mkdir(path.dirname(this.file()),{recursive:true});const temp=this.file()+'.'+randomUUID()+'.tmp';await fs.writeFile(temp,JSON.stringify({snapshot,outbox}),{mode:0o600});await fs.rename(temp,this.file());
   }else{
    const document={_id:SITE_SETTINGS_ID,entity:'system_settings',payload:{id:SITE_SETTINGS_ID,...snapshot,entity:'system_settings_revision_'+snapshot.revision},updated_at:snapshot.updatedAt};
    const result=await this.request(current.revision===0?{insertOne:{document}}:{findOneAndReplace:{filter:{_id:SITE_SETTINGS_ID,'payload.entity':current.revision ? 'system_settings_revision_'+current.revision : {$exists:false}},replacement:document,options:{returnDocument:'after'}}});
    if(current.revision===0?!result.status?.insertedIds?.length:!result.data?.document)throw new CatalogueError(409,'Settings save was not confirmed. Reload saved settings before retrying.');
   }return snapshot;
  };const action=this.pending.catch(()=>{}).then(save);this.pending=action;return action;
 }
}
