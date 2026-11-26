import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import unavailable from '../api/demo-unavailable.ts';
const originalFetch=globalThis.fetch,key='synthetic-hosted-administrator-key-for-tests-only',token='AstraCS:synthetic-hosted-token-not-real';
Object.assign(process.env,{ASTRA_DB_API_ENDPOINT:'https://synthetic-region.apps.astra.datastax.com',ASTRA_DB_APPLICATION_TOKEN:token,ASTRA_DB_KEYSPACE:'default_keyspace',TEKILAB_ADMIN_ACCESS_KEY:key,TEKILAB_ENABLE_ASTRA_WRITES:'true'});
let document=null,providerWrites=0;
globalThis.fetch=async(url,options)=>{
 if(String(url).startsWith('https://synthetic-region.apps.astra.datastax.com/')){
  const command=JSON.parse(options.body);if(command.findOne)return Response.json({data:{document}});
  if(command.insertOne){document=command.insertOne.document;providerWrites++;return Response.json({status:{insertedIds:[document._id]}});}
  if(command.findOneAndReplace){if(command.findOneAndReplace.filter['payload.entity']!==document.payload.entity)return Response.json({data:{document:null}});document=command.findOneAndReplace.replacement;providerWrites++;return Response.json({data:{document},status:{matchedCount:1}});}
  throw Error('Unexpected synthetic provider operation');
 }return originalFetch(url,options);
};
const {default:handler}=await import('../api/platform-settings.ts');
const root=path.resolve('dist'),server=http.createServer(async(req,res)=>{
 try{res.status=code=>{res.statusCode=code;return res;};res.json=value=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(value));};
 const pathname=new URL(req.url,'http://localhost').pathname;
 if(pathname==='/api/site-settings'){if(req.method==='PUT'){let body='';for await(const chunk of req)body+=chunk;req.body=JSON.parse(body);}return handler(req,res);}
 if(pathname.startsWith('/api/'))return unavailable(req,res);
 const asset=path.resolve(root,'.'+pathname);if(!asset.startsWith(root+path.sep)&&asset!==root){res.writeHead(403);return res.end();}let file=asset;try{if(!(await fs.stat(file)).isFile())file=path.join(root,'index.html');}catch{file=path.join(root,'index.html');}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.json')?'application/json':file.endsWith('.png')?'image/png':'text/html');res.end(await fs.readFile(file));
 }catch{res.writeHead(500);res.end();}
});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({channel:'msedge',headless:true}),context=await browser.newContext({viewport:{width:1360,height:950},serviceWorkers:'block'}),checks=[],errors=[];
const check=(v,label)=>{assert.ok(v,label);checks.push(label);console.log('PASS',label);};
await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
await context.addInitScript(()=>{if(sessionStorage.getItem('hosted-settings-seeded'))return;localStorage.clear();const user={id:'SYNTH-HOSTED-ADMIN',name:'Synthetic Hosted Administrator',role:'Kernel Admin',branchId:'pharma-1',tenantId:'SYNTH-HOSTED-SETTINGS',permissions:[]};localStorage.setItem('ph_current_user',JSON.stringify(user));localStorage.setItem('ph_staff_list',JSON.stringify([user]));localStorage.setItem('ph_real_data_initialized_v6','true');for(const name of ['tm_patients','tm_lab_orders','tm_imaging_orders','tm_queue_tickets','tm_charges','tm_encounters'])localStorage.setItem(name,'[]');sessionStorage.setItem('hosted-settings-seeded','true');sessionStorage.setItem('tekipharm_welcome_splash_shown','true');localStorage.setItem('tekipharm_pwa_dismissed','true');});
const page=await context.newPage();page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));
try{
 const wrongMethod=await fetch(base+'/api/site-settings',{method:'DELETE'});check(wrongMethod.status===405,'hosted settings endpoint rejects unsupported methods');
 const anonymous=await fetch(base+'/api/site-settings',{method:'PUT',headers:{'Content-Type':'application/json'},body:'{}'});check(anonymous.status===401&&providerWrites===0,'hosted settings reject anonymous writes before reaching Astra');
 const publicRead=await(await fetch(base+'/api/site-settings')).json();check(publicRead.settings.facilityName==='TekiLab'&&!JSON.stringify(publicRead).includes(token),'public configuration lookup excludes server credentials');
 await page.goto(base+'/admin');const demo=page.getByRole('button',{name:'Continue demo',exact:true});if(await demo.isVisible())await demo.click();await page.getByRole('button',{name:'System Settings',exact:true}).click();await page.getByLabel('Laboratory name',{exact:true}).fill('Synthetic Hosted Diagnostics');await page.getByRole('button',{name:'Save settings',exact:true}).click();await page.getByRole('alert').filter({hasText:'administrator access key'}).waitFor();check(providerWrites===0,'hosted UI cannot save using the browser role alone');
 await page.getByRole('navigation',{name:'System settings sections'}).getByRole('button',{name:'Database & deployment',exact:true}).click();await page.getByLabel('Site settings administrator access key',{exact:true}).fill(key);await page.getByRole('button',{name:'Save settings',exact:true}).click();await page.getByText('Saved revision 1',{exact:true}).waitFor();check(document.payload.settings.facilityName==='Synthetic Hosted Diagnostics'&&providerWrites===1,'hosted UI saves through the actual serverless handler and confirmed mock Astra write');check(await page.getByLabel('Site settings administrator access key',{exact:true}).inputValue()===''&&!(await page.evaluate(()=>JSON.stringify(localStorage))).includes(key),'administrator key clears after save and never enters localStorage');
 const second=await context.newPage();await second.goto(base+'/book');await second.getByRole('link',{name:'Synthetic Hosted Diagnostics',exact:true}).waitFor();check((await second.locator('body').innerText()).includes('Hosted demo: shared bookings'),'fresh hosted public page receives shared branding while unfinished booking API stays explicit');await second.close();check(errors.length===0,'hosted settings build has no uncaught browser errors');console.log('HOSTED_SETTINGS_CHECKS',checks.length);
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));globalThis.fetch=originalFetch;}
