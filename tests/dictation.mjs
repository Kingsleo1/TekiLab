import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const artifacts=path.join(root,'work','browser-results'); await fs.mkdir(artifacts,{recursive:true});
const browser=await chromium.launch({channel:process.env.TEST_BROWSER_CHANNEL || 'msedge',headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
const failures=[]; const passed=[]; const check=(ok,label)=>{assert.ok(ok,label);passed.push(label);console.log('PASS',label)};
await context.route('**/*',r=>['localhost','127.0.0.1'].includes(new URL(r.request().url()).hostname)?r.continue():r.abort());
await context.addInitScript(()=>{
 if(!sessionStorage.getItem('synthetic_seeded')){
  const user={id:'SYNTH-REVIEWER',name:'Synthetic Reviewer',email:'synthetic@example.invalid',role:'Kernel Admin',branchId:'pharma-1',permissions:[]};
  localStorage.clear();localStorage.setItem('ph_current_user',JSON.stringify(user));localStorage.setItem('ph_staff_list',JSON.stringify([user]));localStorage.setItem('ph_real_data_initialized_v6','true');
  localStorage.setItem('tm_patients',JSON.stringify([{id:'SYNTH-P1',fullName:'Synthetic Patient One',mrn:'SYNTH-MRN1',phone:'',allergies:[],chronicConditions:[],dob:'1990-01-01',createdAt:new Date().toISOString()}]));
  ['tm_lab_orders','tm_imaging_orders','tm_queue_tickets','tm_charges','tm_encounters','tekilab_rapid_dispatches_v2','tekilab_pharmacy_handoff_queue_v2'].forEach(k=>localStorage.setItem(k,'[]'));
  sessionStorage.setItem('synthetic_seeded','true');
  sessionStorage.setItem('tekipharm_welcome_splash_shown','true');
  localStorage.setItem('tekipharm_pwa_dismissed','true');
 }
 Object.defineProperty(window,'SpeechRecognition',{value:undefined,configurable:true});
 Object.defineProperty(window,'webkitSpeechRecognition',{value:undefined,configurable:true});
});
const page=await context.newPage();page.on('pageerror',e=>failures.push(e.message));
page.setDefaultTimeout(20000);

const integrationTenant = 'SYNTH-INTEGRATION-' + Date.now();
await context.route('**/api/lims/tenant-config/**',r=>r.fulfill({json:{config:{tenantId:integrationTenant,modules:{lims:true,emr:true,hospital_management:true,pharmacy:true,billing:true,ai_analytics:true}}}}));
await context.addInitScript(()=>{
 localStorage.setItem('ph_products',JSON.stringify([{id:'SYNTH-PRODUCT1',name:'Synthetic Inventory Item',genericName:'Test only',category:'Test',price:100,wholesalePrice:100,stock:50,baseUnit:'tablet',conversionFactor:1,expiryDate:'2028-12-31',requiresPrescription:true,pharmacyId:'pharma-1',batches:[],minStockLevel:1}]));
});
try {
 await page.goto('http://localhost:3000/admin');await page.waitForTimeout(2000);
 await page.getByRole('button',{name:/Clinical & EMR Suite/}).click();
 await page.getByRole('button',{name:'Doctor EMR & Consultations',exact:true}).click();
 await page.getByPlaceholder('e.g. High grade fever, rigors, joint weakness and headache x 3 days.').fill('Synthetic consultation for software testing only.');
 await page.getByPlaceholder('Search by ailment name, ICD-10 code (e.g. K35, E11, B50), or keyword...').fill('Acute Bronchitis');
 await page.getByRole('button',{name:/Acute Bronchitis/}).click();
 const labs=page.locator('[data-slot="card"]').filter({has:page.getByText('Order Laboratory Investigations',{exact:true})});
 await labs.getByRole('checkbox').nth(0).check();await labs.getByRole('checkbox').nth(1).check();
 const imaging=page.locator('[data-slot="card"]').filter({has:page.getByText('Order Diagnostic Imaging & Scans',{exact:true})});
 await imaging.getByRole('checkbox').nth(0).check();
 const drugs=page.locator('select').filter({has:page.locator('option[value="SYNTH-PRODUCT1"]')});
 await drugs.selectOption('SYNTH-PRODUCT1');
 await page.getByPlaceholder('e.g. 1 tablet').fill('Synthetic dose - test only');
 await page.getByPlaceholder('e.g. TDS (3x daily)').fill('Synthetic schedule - test only');
 await page.getByLabel('Prescription quantity').fill('2');
 await page.getByRole('button',{name:'Add to Rx',exact:true}).click();
 check(await page.getByRole('cell',{name:'Synthetic Inventory Item',exact:true}).isVisible(),'consultation uses branch inventory');
 await page.getByRole('button',{name:'Sign & Finalize (PDF)',exact:true}).click();
 check(await page.evaluate(()=>JSON.parse(localStorage.getItem('tm_lab_orders')||'[]').length===0),'unsigned consultation cannot create clinical orders');
 const canvas=page.getByLabel('Draw report signature');await canvas.scrollIntoViewIfNeeded();const box=await canvas.boundingBox();
 await page.mouse.move(box.x+15,box.y+40);await page.mouse.down();await page.mouse.move(box.x+100,box.y+55,{steps:12});await page.mouse.up();
 await page.getByLabel(/I reviewed this patient/).check();await page.getByRole('button',{name:'Sign this report',exact:true}).click();await page.waitForTimeout(200);
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Sign & Finalize (PDF)',exact:true}).click();await download;
 await page.waitForTimeout(500);
 const state=await page.evaluate(()=>({labs:JSON.parse(localStorage.getItem('tm_lab_orders')||'[]'),images:JSON.parse(localStorage.getItem('tm_imaging_orders')||'[]'),charges:JSON.parse(localStorage.getItem('tm_charges')||'[]'),queue:JSON.parse(localStorage.getItem('tm_queue_tickets')||'[]'),encounters:JSON.parse(localStorage.getItem('tm_encounters')||'[]'),rx:JSON.parse(localStorage.getItem('tekilab_pharmacy_handoff_queue_v2')||'[]')}));
 check(state.labs.length===2&&new Set(state.labs.map(o=>o.testId)).size===2,'one consultation retains both lab orders');
 check(state.images.length===1&&state.images[0].encounterId===state.encounters[0].id,'imaging order links to the same encounter');
 check(state.charges.length===3&&state.charges.every(c=>c.paymentStatus==='Unpaid'),'all diagnostic orders create unpaid charges');
 check(state.queue.filter(q=>q.department==='Laboratory').length===2&&state.queue.filter(q=>q.department==='Radiology').length===1,'each diagnostic order enters its department queue');
 check(state.rx.length===1&&state.rx[0].source==='CLINICIAN_PRESCRIPTION'&&state.rx[0].aiSuggestedDrug.quantity===2,'signed consultation creates the exact prescribed pharmacy quantity');
 await page.getByRole('button',{name:/Finance & Billing/}).click();
 await page.getByRole('button',{name:'POS Cashier Checkout',exact:true}).click();
 await page.getByRole('button',{name:'Load POS',exact:true}).waitFor();await page.getByRole('button',{name:'Load POS',exact:true}).click();await page.waitForTimeout(300);
 const loaded=await page.evaluate(()=>JSON.parse(localStorage.getItem('tekilab_pharmacy_handoff_queue_v2')||'[]'));
 check(loaded[0].status==='LOADED_IN_POS','pharmacy receives and loads the clinician prescription');

 await page.getByRole('button',{name:/^Initiate Sale/}).first().click();
 await page.getByRole('button',{name:/^Proceed to Payment/}).click();
 await page.getByRole('button',{name:'Approve & Execute Transaction',exact:true}).click();
 await page.waitForTimeout(700);
 const sold=await page.evaluate(()=>({rx:JSON.parse(localStorage.getItem('tekilab_pharmacy_handoff_queue_v2')||'[]'),orders:JSON.parse(localStorage.getItem('ph_orders')||'[]')}));
 check(sold.rx[0].status==='DISPENSED'&&sold.orders.some(o=>o.items?.some(i=>i.productId==='SYNTH-PRODUCT1'&&i.quantity===2)),'successful checkout records the sale and completes prescription dispensing');
 const reconciled=await page.evaluate(()=>({encounters:JSON.parse(localStorage.getItem('tm_encounters')||'[]'),queue:JSON.parse(localStorage.getItem('tm_queue_tickets')||'[]')}));
 check(reconciled.encounters[0].prescriptions[0].status==='Dispensed'&&reconciled.queue.some(q=>q.department==='Pharmacy'&&q.sourceOrderId===reconciled.encounters[0].id&&q.status==='Completed'),'dispensing updates the clinical prescription and completes the pharmacy queue ticket');
 await page.keyboard.press('Escape');
 if(!await page.getByRole('button',{name:'Radiology & Medical Imaging',exact:true}).isVisible()) await page.getByRole('button',{name:/Clinical & EMR Suite/}).click();
 await page.getByRole('button',{name:'Radiology & Medical Imaging',exact:true}).click();
 await page.getByText(state.images[0].testName,{exact:true}).first().click();
 await page.getByRole('button',{name:'Preview PDF Report',exact:true}).click();
 check(await page.getByRole('button',{name:'Download Official PDF Report',exact:true}).isDisabled(),'radiology blocks official report download before approval');
 await page.keyboard.press('Escape');
 await page.getByRole('checkbox',{name:/requested scan has been performed/}).check();await page.getByRole('button',{name:'Record scan completed',exact:true}).click();
 await page.getByRole('textbox',{name:'Radiology findings',exact:true}).fill('Synthetic imaging findings for software testing.');
 await page.locator('textarea').fill('Synthetic imaging impression for software testing.');
 await page.evaluate(()=>{window.SpeechRecognition=class {start(){window.__speech=this;}stop(){this.onend?.();}abort(){}};});
 await page.getByRole('textbox',{name:'Radiology findings',exact:true}).fill('Synthetic initial findings.');
 await page.getByRole('button',{name:'Dictate',exact:true}).click();
 await page.evaluate(()=>{const result=Object.assign([{transcript:'Synthetic dictated findings.'}],{isFinal:true});window.__speech.onresult({resultIndex:0,results:[result]});window.__speech.onresult({resultIndex:0,results:[result]});});
 check((await page.getByRole('textbox',{name:'Radiology findings',exact:true}).innerText()).includes('Synthetic dictated findings.'),'dictation inserts recognized text into the findings field');
 check((await page.getByRole('textbox',{name:'Radiology findings',exact:true}).innerText()).split('Synthetic dictated findings.').length===2,'repeated recognition events do not duplicate transcript');
 await page.evaluate(()=>window.__speech.onerror({error:'not-allowed'}));
 check((await page.locator('body').innerText()).includes('Allow microphone access'),'microphone permission failure displays an actionable message');

 const radCanvas=page.getByLabel('Draw report signature');await radCanvas.scrollIntoViewIfNeeded();const radBox=await radCanvas.boundingBox();
 await page.mouse.move(radBox.x+20,radBox.y+40);await page.mouse.down();await page.mouse.move(radBox.x+130,radBox.y+60,{steps:12});await page.mouse.up();
 await page.getByLabel(/I reviewed this patient/).check();await page.getByRole('button',{name:'Sign this report',exact:true}).click();await page.waitForTimeout(200);
 await page.getByRole('button',{name:'Approve Report',exact:true}).click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('tm_imaging_orders')||'[]').some(o=>o.orderStatus==='Released'));
 check(await page.evaluate(()=>JSON.parse(localStorage.getItem('tm_imaging_orders')||'[]')[0].orderStatus==='Released'),'signed imaging findings release and persist');
 await page.getByRole('button',{name:'Lab Worklist & Samples',exact:true}).click();
 await page.getByText(state.labs[0].accessionNumber,{exact:true}).first().click();
 await page.getByRole('button',{name:'Collect Sample',exact:true}).click();
 const measured=page.locator('tbody tr input[placeholder="Enter value..."]');
 for(let i=0;i<await measured.count();i++)await measured.nth(i).fill('1');
 const valueSelects=page.locator('tbody tr select');
 for(let i=0;i<await valueSelects.count();i++){
  const options=await valueSelects.nth(i).locator('option').evaluateAll(els=>els.map(o=>o.value));
  if(!options.includes('Normal'))await valueSelects.nth(i).selectOption(options.find(v=>v));
 }
 await page.getByLabel('Reference interval source',{exact:true}).fill('Synthetic laboratory SOP');await page.getByLabel('Assay method',{exact:true}).fill('Synthetic method');await page.getByLabel(/I confirmed the reference intervals/).check();
 await page.getByRole('textbox',{name:'Laboratory findings',exact:true}).fill('Synthetic laboratory interpretation for software testing.');
 const labCanvas=page.getByLabel('Draw report signature');await labCanvas.scrollIntoViewIfNeeded();const labBox=await labCanvas.boundingBox();
 await page.mouse.move(labBox.x+20,labBox.y+40);await page.mouse.down();await page.mouse.move(labBox.x+130,labBox.y+60,{steps:12});await page.mouse.up();
 await page.getByLabel(/I reviewed this patient/).check();await page.getByRole('button',{name:'Sign this report',exact:true}).click();await page.waitForTimeout(200);
 await page.getByRole('button',{name:'Approve Result',exact:true}).click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('tm_lab_orders')||'[]').some(o=>o.orderStatus==='RELEASED'));
 const releasedLabs=await page.evaluate(()=>JSON.parse(localStorage.getItem('tm_lab_orders')||'[]'));
 check(releasedLabs.find(o=>o.id===state.labs[0].id)?.orderStatus==='RELEASED','collected and signed standard laboratory order releases');
 if(!await page.getByRole('button',{name:'Unified Charge Capture & HMO',exact:true}).isVisible()) await page.getByRole('button',{name:/Finance & Billing/}).click();
 await page.getByRole('button',{name:'Unified Charge Capture & HMO',exact:true}).click();
 await page.getByRole('button',{name:'Collect Payment',exact:true}).first().click();
 const paid=await page.evaluate(()=>({charges:JSON.parse(localStorage.getItem('tm_charges')||'[]'),images:JSON.parse(localStorage.getItem('tm_imaging_orders')||'[]')}));
 check(paid.charges.filter(c=>c.paymentStatus==='Paid').length===1&&paid.images[0].billingStatus==='Paid','billing payment updates the linked diagnostic order');
 await page.getByRole('button',{name:'Lab Overview',exact:true}).click();await page.getByRole('region',{name:'Clinical workflow analytics'}).waitFor();
 check(await page.getByRole('heading',{name:'Lab Overview',exact:true}).isVisible(),'role dashboard shows operational analytics from current records');

 check(failures.length===0,'no uncaught integration browser errors');
 console.log('INTEGRATION_CHECKS_PASSED',passed.length);
 await fs.writeFile(path.join(artifacts,'integration-results.json'),JSON.stringify({passed,failures},null,2));
} catch(error) {console.error('INTEGRATION_FAILED',error.message);console.error('RUNTIME_ERRORS',JSON.stringify(failures));console.error('BODY',(await page.locator('body').innerText()).slice(-5000));await page.screenshot({path:path.join(artifacts,'integration-failure.png'),fullPage:true}).catch(()=>{});process.exitCode=1;}
finally {await browser.close();}
