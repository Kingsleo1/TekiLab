import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { catalogueCapabilities, normalizedTestName } from '../../lib/test-catalog';
import { mutateTestCatalogue } from '../../services/test-catalog';
import type { CatalogueActor, CatalogueScope, CatalogueSnapshot, TestCatalogueItem } from '../../types/test-catalog';
import type { LabTestParameter } from '../../types/pharmacy';
type Form={id:string|null;name:string;code:string;category:string;sampleType:string;workflow:'rapid'|'laboratory'|'referral'|'imaging';minutes:number;price:string;quote:boolean;reviewed:boolean;modality:string;bodySite:string;parameters:LabTestParameter[]};
const blank=():Form=>({id:null,name:'',code:'',category:'General laboratory',sampleType:'',workflow:'laboratory',minutes:0,price:'',quote:true,reviewed:false,modality:'',bodySite:'',parameters:[]});
export function TestCatalogueManager({open,onClose,scope,actor,snapshot,onRefresh}:{
 open:boolean;onClose:()=>void;scope:CatalogueScope;actor:CatalogueActor;snapshot:CatalogueSnapshot;onRefresh:()=>void;
}) {
 const caps=catalogueCapabilities(actor);const [query,setQuery]=useState('');const [removed,setRemoved]=useState(false);
 const [form,setForm]=useState<Form|null>(null);const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 const items=useMemo(()=>snapshot.items.filter(item=>(removed||item.isActive)&&normalizedTestName(item.name+' '+item.code).includes(normalizedTestName(query))).slice(0,50),[snapshot,query,removed]);
 const edit=(item:TestCatalogueItem)=>{setError('');setForm({id:item.id,name:item.name,code:item.code,category:item.category,sampleType:item.sampleType,workflow:item.workflow,minutes:item.targetTatMinutes||item.turnaroundTimeHours*60,price:String(item.priceNaira),quote:item.priceStatus==='quote_required',reviewed:item.templateReviewed===true,modality:item.modality||'',bodySite:item.bodySite||'',parameters:structuredClone(item.parameters||[])});};
 const change=(key:keyof Form,value:any)=>setForm(current=>current?{...current,[key]:value}:current);
 const submit=async(event:any)=>{
  event.preventDefault();if(!form||busy)return;setBusy(true);setError('');
  const patch:Record<string,unknown>={};
  if(caps.manageTests)Object.assign(patch,{name:form.name.trim(),code:form.code.trim().toUpperCase(),category:form.category.trim(),sampleType:form.sampleType.trim()||(form.workflow==='imaging'?'Not applicable — imaging examination':''),workflow:form.workflow,department:form.workflow==='imaging'?'Radiology':'Laboratory',modality:form.modality,bodySite:form.bodySite,
   turnaroundTimeHours:Number(form.minutes)/60,targetTatMinutes:Number(form.minutes),templateReviewed:form.reviewed,parameters:form.parameters,isActive:true});
  if(caps.managePrices)Object.assign(patch,{priceNaira:form.quote?0:Number(form.price),priceStatus:form.quote?'quote_required':'facility'});
  try{await mutateTestCatalogue(scope,actor,snapshot.revision,form.id,patch);setQuery(form.code);setForm(null);toast.success('Test catalogue saved on this device.');}
  catch(error:any){setError(error.message);if(error.status===409){setForm(null);onRefresh();}}finally{setBusy(false);}
 };
 const archive=async(item:TestCatalogueItem)=>{
  if(busy)return;setBusy(true);setError('');
  try{await mutateTestCatalogue(scope,actor,snapshot.revision,item.id,{isActive:!item.isActive});toast.success(item.isActive?'Test removed from new orders. Existing records are preserved.':'Test restored.');}
  catch(error:any){setError(error.message);if(error.status===409)onRefresh();}finally{setBusy(false);}
 };
 const parameter=(index:number,key:string,value:any)=>change('parameters',form!.parameters.map((p,i)=>i===index?{...p,[key]:value}:p));
 return <Dialog open={open} onOpenChange={value=>{if(!value&&!busy){setForm(null);onClose();}}}>
  <DialogContent className="sm:max-w-5xl max-h-[90dvh] overflow-auto bg-white">
   <DialogHeader><DialogTitle>Manage tests &amp; prices</DialogTitle><DialogDescription>Changes apply to this facility branch and are saved on this device. Astra synchronization is pending connection. Removed tests remain in historical records.</DialogDescription></DialogHeader>
   <p className="text-xs text-slate-600">{caps.manageTests?'You can add, configure and remove tests.':'Clinical test details are read-only for your role.'} {caps.managePrices?'You can set facility fees.':'Fee changes require a price manager.'}</p>
   {error&&<p role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
   {!form?<div className="space-y-3">
    <div className="flex flex-wrap gap-3 items-center"><input aria-label="Search managed tests" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search name or code" className="border rounded p-2 flex-1 min-w-0" />
     {caps.manageTests&&<button type="button" onClick={()=>{setForm(blank());setError('');}} className="bg-blue-600 text-white rounded px-3 py-2">Add test</button>}
     <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={removed} onChange={e=>setRemoved(e.target.checked)} />Show removed tests</label>
    </div>
    <div className="divide-y border rounded-lg max-h-[45dvh] overflow-auto">{items.map(item=><div key={item.id} className="p-3 flex flex-wrap gap-3 items-center justify-between">
     <div className="min-w-0 flex-1"><strong className="block text-sm break-words">{item.name}</strong><p className="text-xs text-slate-500">{item.code} · {item.category}{!item.isActive?' · Removed':''}</p>
      <p className="text-sm">{item.priceStatus==='quote_required'?'Quote required':'₦'+item.priceNaira.toLocaleString('en-NG')} · {item.priceStatus==='published'?'Published reference':item.priceStatus==='facility'?'Facility fee':'Fee not set'}</p>
      {item.priceObservations.slice(0,3).map((observation,i)=><a key={i} className="inline-block mr-3 text-xs text-blue-700 underline" href={observation.url} target="_blank" rel="noreferrer">{observation.provider}: ₦{observation.amountNaira.toLocaleString('en-NG')}{observation.publishedDate?' ('+observation.publishedDate+')':''}</a>)}
     </div>
     <div className="flex gap-2"><button type="button" disabled={busy} onClick={()=>edit(item)} className="border rounded px-3 py-2 text-sm">{caps.manageTests?'Edit test':'Set fee'}</button>
      {caps.manageTests&&<button type="button" disabled={busy} onClick={()=>archive(item)} className="border rounded px-3 py-2 text-sm">{item.isActive?'Remove':'Restore'}</button>}</div>
    </div>)}</div>
    <p className="text-xs text-slate-500">Showing up to 50 matches. Search to narrow the list.</p>
    {!!snapshot.audit?.length&&<details className="text-xs border rounded p-3"><summary>Recent catalogue changes</summary>{snapshot.audit.slice(0,10).map(event=><p key={event.id} className="mt-2">{new Date(event.at).toLocaleString()} · {event.actorName} · {event.action} · revision {event.revision}</p>)}</details>}
   </div>:<form onSubmit={submit} className="space-y-4">
    <fieldset disabled={!caps.manageTests||busy} className="grid sm:grid-cols-2 gap-3">
     <label className="text-sm">Test name<input aria-label="Test name" value={form.name} onChange={e=>change('name',e.target.value)} required className="w-full border rounded p-2 mt-1" /></label>
     <label className="text-sm">Test code<input aria-label="Test code" value={form.code} onChange={e=>change('code',e.target.value)} required className="w-full border rounded p-2 mt-1" /></label>
     <label className="text-sm">Category<input aria-label="Test category" value={form.category} onChange={e=>change('category',e.target.value)} required className="w-full border rounded p-2 mt-1" /></label>
     <label className="text-sm">Specimen requirements<input aria-label="Specimen requirements" value={form.sampleType} onChange={e=>change('sampleType',e.target.value)} required className="w-full border rounded p-2 mt-1" /></label>
     <label className="text-sm">Workflow<select aria-label="Test workflow" value={form.workflow} onChange={e=>change('workflow',e.target.value)} className="w-full border rounded p-2 mt-1"><option value="laboratory">Laboratory order</option><option value="imaging">Radiology / imaging scan</option><option value="referral">Referral / send-out</option><option value="rapid">Rapid (reviewed 1–10 minute test)</option></select></label>
     <label className="text-sm">Expected turnaround (minutes, 0 if not confirmed)<input aria-label="Expected turnaround minutes" type="number" min="0" step="1" value={form.minutes} onChange={e=>change('minutes',Number(e.target.value))} className="w-full border rounded p-2 mt-1" /></label>
     {form.workflow==='imaging'&&<><label>Modality<input aria-label="Scan modality" required value={form.modality} onChange={e=>change('modality',e.target.value)} className="border rounded p-2 w-full"/></label><label>Body site / protocol<input aria-label="Scan body site" required value={form.bodySite} onChange={e=>change('bodySite',e.target.value)} className="border rounded p-2 w-full"/></label></>}
    </fieldset>
    <fieldset disabled={!caps.managePrices||busy} className="rounded border p-3 space-y-2">
     <legend className="text-sm font-semibold px-1">Facility price</legend>
     <label className="flex gap-2 text-sm"><input aria-label="Price requires quote" type="checkbox" checked={form.quote} onChange={e=>change('quote',e.target.checked)} />Quote required — do not treat an unknown fee as free</label>
     <label className="block text-sm">Price (NGN)<input aria-label="Facility price NGN" type="number" min="0" step="0.01" disabled={form.quote||!caps.managePrices||busy} required={!form.quote} value={form.price} onChange={e=>change('price',e.target.value)} className="w-full border rounded p-2 mt-1" /></label>
    </fieldset>
    {caps.manageTests&&<fieldset disabled={busy} className="rounded border p-3 space-y-3">
     <legend className="text-sm font-semibold px-1">Result template</legend><p className="text-xs text-slate-500">Use your laboratory's validated SOP. Reference intervals and clinical findings are never inferred from a test name. A template is required for rapid result entry.</p>
     {form.parameters.map((p,index)=><div key={p.id} className="grid sm:grid-cols-5 gap-2 border-b pb-2">
      <input aria-label={'Parameter name '+(index+1)} value={p.name} onChange={e=>parameter(index,'name',e.target.value)} placeholder="Parameter name" className="border rounded p-2 min-w-0 text-sm" />
      <input aria-label={'Parameter unit '+(index+1)} value={p.unit||''} onChange={e=>parameter(index,'unit',e.target.value)} placeholder="Unit" className="border rounded p-2 min-w-0 text-sm" />
      <input aria-label={'Reference interval '+(index+1)} value={p.referenceRange} onChange={e=>parameter(index,'referenceRange',e.target.value)} placeholder="Reference interval" className="border rounded p-2 min-w-0 text-sm" />
      <select aria-label={'Result type '+(index+1)} value={p.fieldType} onChange={e=>parameter(index,'fieldType',e.target.value)} className="border rounded p-2 text-sm"><option value="text">Text</option><option value="number">Number</option><option value="select">Choice</option></select>
      <button type="button" onClick={()=>change('parameters',form.parameters.filter((_,i)=>i!==index))} className="border rounded p-2 text-sm">Remove parameter</button>
      {p.fieldType==='select'&&<input aria-label={'Result options '+(index+1)} value={(p.options||[]).join(', ')} onChange={e=>parameter(index,'options',e.target.value.split(',').map(v=>v.trim()).filter(Boolean))} placeholder="Choices, separated by commas" className="border rounded p-2 sm:col-span-5 text-sm" />}
     </div>)}
     <button type="button" disabled={form.parameters.length>=40} onClick={()=>change('parameters',[...form.parameters,{id:crypto.randomUUID(),name:'',unit:'',referenceRange:'',fieldType:'text'}])} className="border rounded px-3 py-2 text-sm">Add result parameter</button>
     <label className="flex gap-2 text-sm"><input aria-label="Template reviewed" type="checkbox" checked={form.reviewed} onChange={e=>change('reviewed',e.target.checked)} />An authorized laboratory professional has reviewed this result template and turnaround.</label>
    </fieldset>}
    <div className="flex justify-end gap-2"><button type="button" disabled={busy} onClick={()=>setForm(null)} className="border rounded px-3 py-2">Cancel editing</button><button disabled={busy} className="rounded bg-blue-600 text-white px-4 py-2">{busy?'Saving…':'Save test'}</button></div>
   </form>}
  </DialogContent>
 </Dialog>;
}
