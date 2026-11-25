import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const tenant='SYNTH-MANAGEMENT-'+Date.now(),passed=[],failures=[];
const browser=await chromium.launch({channel:'msedge',headless:true}),context=await browser.newContext({viewport:{width:1440,height:1000}});
await context.route('**/*',r=>['localhost','127.0.0.1'].includes(new URL(r.request().url()).hostname)?r.continue():r.abort());
await context.route('**/api/lims/tenant-config/**',r=>r.fulfill({json:{config:{tenantId:tenant,modules:{lims:true,emr:true,hospital_management:true,pharmacy:true,billing:true,ai_analytics:true}}}}));
await context.addInitScript(tenant=>{if(sessionStorage.getItem('management_seeded'))return;localStorage.clear();const user={id:'SYNTH-MANAGER',name:'Synthetic Manager',role:'Kernel Admin',branchId:'pharma-1',tenantId:tenant,permissions:[]};localStorage.setItem('ph_current_user',JSON.stringify(user));localStorage.setItem('ph_staff_list',JSON.stringify([user]));localStorage.setItem('ph_real_data_initialized_v6','true');for(const key of ['tm_patients','tm_lab_orders','tm_imaging_orders','tm_queue_tickets','tm_encounters'])localStorage.setItem(key,'[]');localStorage.setItem('tm_charges',JSON.stringify([{id:'SYNTH-C1',description:'Synthetic paid laboratory charge',patientPayableNaira:2500,paymentStatus:'Paid',category:'Lab Investigation',createdAt:new Date().toISOString()},{id:'SYNTH-C2',description:'Synthetic outstanding scan',patientPayableNaira:1500,paymentStatus:'Unpaid',category:'Radiology Scan',createdAt:new Date().toISOString()},{id:'SYNTH-C3',description:'Synthetic waived charge',patientPayableNaira:1000,paymentStatus:'Waived',category:'Lab Investigation',createdAt:new Date().toISOString()}]));sessionStorage.setItem('management_seeded','true');sessionStorage.setItem('tekipharm_welcome_splash_shown','true');localStorage.setItem('tekipharm_pwa_dismissed','true');},tenant);
const page=await context.newPage();page.on('pageerror',e=>failures.push(e.message));page.setDefaultTimeout(20000);
const check=(value,label)=>{assert.ok(value,label);passed.push(label);console.log('PASS',label);};
const overview=async()=>{await page.getByRole('button',{name:'Lab Overview',exact:true}).click();await page.getByRole('heading',{name:'Lab Overview',exact:true}).waitFor();};
try{
 await page.goto('http://localhost:3000/admin');await page.getByRole('heading',{name:'Lab Overview',exact:true}).waitFor();
 check(true,'administrator lands directly on Lab Overview');
 await page.getByRole('heading',{name:'Business financials',exact:true}).waitFor();
 check(await page.getByRole('img',{name:'Chart of daily charges and paid charges in NGN'}).isVisible(),'management overview displays a financial trend chart');
 check(await page.getByRole('img',{name:'Chart of charges by service'}).isVisible(),'management overview displays a service mix chart');
 const financial=page.getByRole('region',{name:'Business financial overview'});
 check((await financial.innerText()).includes('NGN 2,500')&&(await financial.innerText()).includes('NGN 1,500')&&(await financial.innerText()).includes('NGN 5,000'),'financial cards calculate collected, outstanding and invoiced amounts from ledger records');
 const links=[['New test or scan','heading','New Test'],['Laboratory worklist','button','Radiology & scan worklist'],['Radiology & scans','heading','Radiology'],['Bookings & reception','heading','Live Queue & Patient Flow'],['Patient registry','heading','Registered Patients'],['Business financials','heading','Financial overview']];
 for(const [label,role,name]of links){await page.getByRole('navigation',{name:'Lab overview shortcuts'}).getByRole('button',{name:label,exact:true}).click();await page.getByRole(role,{name,exact:true}).waitFor();check(true,'overview shortcut opens '+label);await overview();}
 const metrics=[['Active queue','heading','Live Queue & Patient Flow'],['Pending laboratory','button','Radiology & scan worklist'],['Awaiting review','button','Radiology & scan worklist'],['Pending scans','heading','Radiology'],['Released lab reports','button','Radiology & scan worklist'],['Average lab turnaround','button','Radiology & scan worklist'],['Within 10 minutes','button','Radiology & scan worklist']];
 for(const [label,role,name]of metrics){await page.getByRole('region',{name:'Clinical workflow analytics'}).getByRole('button',{name:new RegExp('^'+label)}).click();await page.getByRole(role,{name,exact:true}).waitFor();check(true,'overview card routes correctly: '+label);await overview();}
 await financial.getByRole('button',{name:/^Collected/}).click();await page.getByRole('heading',{name:'Financial overview',exact:true}).waitFor();await page.getByRole('button',{name:/^Outstanding/}).click();await page.getByRole('heading',{name:'Outstanding — ledger detail'}).waitFor();check(true,'financial cards open a dedicated page and matching ledger detail');
 await overview();await page.setViewportSize({width:390,height:844});check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'management charts and cards fit a 390px screen');
 check(failures.length===0,'management overview has no uncaught browser errors');
 await fs.mkdir('work/management-results',{recursive:true});await page.screenshot({path:'work/management-results/mobile-overview.png',fullPage:true});await fs.writeFile('work/management-results/summary.json',JSON.stringify({passed,failures},null,2));
 console.log('MANAGEMENT_CHECKS',passed.length);
}catch(error){console.error(error.stack);console.error('RUNTIME_ERRORS',JSON.stringify(failures));console.error('BODY',(await page.locator('body').innerText()).slice(-2500));process.exitCode=1;}finally{await browser.close();}
