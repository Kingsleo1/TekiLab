import { useMemo, useState } from 'react';
import { displayedPrice, isRapidReady, searchCatalogue } from '../../lib/test-catalog';
import type { TestCatalogueItem } from '../../types/test-catalog';
const naira=(value:number)=>'₦'+value.toLocaleString('en-NG',{maximumFractionDigits:2});
export function TestOrderPicker({items,selectedIds,onChange,onManage,canManage,error,onRetry,defaultMultiple=false}:{
 defaultMultiple?:boolean;items:TestCatalogueItem[];selectedIds:string[];onChange:(ids:string[])=>void;onManage?:()=>void;canManage:boolean;error?:string;onRetry:()=>void;
}) {
 const [query,setQuery]=useState('');const [category,setCategory]=useState('ALL');const [limit,setLimit]=useState(40);const [multiple,setMultiple]=useState(defaultMultiple);
 const categories=useMemo(()=>[...new Set(items.filter(i=>i.isActive).map(i=>i.category))].sort(),[items]);
 const [department,setDepartment]=useState('All');
 const filtered=useMemo(()=>searchCatalogue(items,query,category).filter(item=>department==='All'||(department==='Radiology'?item.workflow==='imaging':item.workflow!=='imaging')),[items,query,category,department]);
 const chosen=items.filter(item=>selectedIds.includes(item.id));
 const quoteCount=chosen.filter(item=>displayedPrice(item)===null).length;
 const total=chosen.reduce((sum,item)=>sum+(displayedPrice(item)??0),0);
 const choose=(id:string)=>onChange(multiple?(selectedIds.includes(id)?selectedIds.filter(v=>v!==id):[...selectedIds,id]):[id]);
 return <section aria-label="Test order catalogue" className="rounded-xl border bg-white p-4 sm:p-5 space-y-4 min-w-0">
  <div className="flex flex-wrap justify-between items-center gap-3">
   <div><h2 className="text-lg font-bold">Choose tests</h2><p className="text-xs text-slate-500">{items.filter(i=>i.isActive).length.toLocaleString()} available catalogue entries</p></div>
   {canManage&&<button type="button" onClick={onManage} className="rounded-lg border px-3 py-2 text-sm font-semibold">Manage tests &amp; prices</button>}
  </div>
  <p className="text-xs text-slate-600">Published fees are starting references, not a nationwide tariff. Confirm the test method, availability and your facility fee. Specialist tests are ordered for the laboratory, not released as rapid results.</p>
  {error&&<div role="alert" className="rounded border border-amber-300 bg-amber-50 p-3 text-sm">The shared catalogue is unavailable: {error} <button type="button" onClick={onRetry} className="underline">Retry</button></div>}
  <div className="flex flex-wrap gap-2">{['All','Laboratory','Radiology'].map(value=><button type="button" aria-pressed={department===value} key={value} onClick={()=>{setDepartment(value);setLimit(40);}} className={'border rounded-lg px-3 py-2 text-sm '+(department===value?'bg-blue-600 text-white':'bg-white')}>{value==='Radiology'?'Radiology / Scans':value}</button>)}</div>
  <div className="grid sm:grid-cols-2 gap-2">
   <input aria-label="Search all tests" value={query} onChange={e=>{setQuery(e.target.value);setLimit(40);}} placeholder="Search test, code, category or alias…" className="border rounded-lg p-2 text-sm min-w-0" />
   <select aria-label="Filter test category" value={category} onChange={e=>{setCategory(e.target.value);setLimit(40);}} className="border rounded-lg p-2 text-sm min-w-0">
    <option value="ALL">All categories</option>{categories.map(c=><option key={c} value={c}>{c}</option>)}
   </select>
  </div>
  <label className="flex gap-2 items-center text-sm"><input type="checkbox" checked={multiple} onChange={e=>{setMultiple(e.target.checked);if(!e.target.checked&&selectedIds.length>1)onChange(selectedIds.slice(0,1));}} />Order multiple tests</label>
  <div role="group" aria-label="Available tests" className="max-h-[420px] overflow-auto divide-y rounded-lg border">
   {filtered.slice(0,limit).map(item=>{
    const price=displayedPrice(item);const selected=selectedIds.includes(item.id);const range=item.publishedRange;
    return <button key={item.id} type="button" role="checkbox" aria-checked={selected} aria-label={item.name+' — '+(price===null?'quote required':naira(price))} onClick={()=>choose(item.id)}
     className={'w-full text-left p-3 flex items-start gap-3 '+(selected?'bg-blue-50':'hover:bg-slate-50')}>
     <span aria-hidden="true" className={'mt-1 h-4 w-4 border rounded shrink-0 '+(selected?'bg-blue-600 border-blue-600':'border-slate-400')}>{selected&&<span className="block text-white text-xs text-center">✓</span>}</span>
     <span className="flex-1 min-w-0"><strong className="block text-sm break-words">{item.name}</strong><span className="text-xs text-slate-500">{item.code} · {item.category} · {item.workflow==='imaging'?'Radiology scan':isRapidReady(item)?'Rapid workflow':'Laboratory order'}</span>
      {range&&range.offers>1&&<span className="block text-xs text-slate-500">Published offers: {naira(range.min)}–{naira(range.max)} · {range.offers} references</span>}
     </span>
     <span className="text-right shrink-0 max-w-[38%]"><strong className="block text-sm">{price===null?'Quote required':naira(price)}</strong><span className="block text-[11px] text-slate-500">{item.priceStatus==='facility'?'Facility fee':item.priceStatus==='published'?'Published reference':'Fee not set'}</span></span>
    </button>;
   })}
   {!filtered.length&&<p className="p-6 text-sm text-slate-500">No matching tests. Authorized staff can add an unlisted test.</p>}
  </div>
  {filtered.length>limit&&<button type="button" className="border rounded px-3 py-2 text-sm" onClick={()=>setLimit(n=>n+40)}>Show 40 more ({filtered.length-limit} remaining)</button>}
  <div aria-live="polite" className="rounded-lg bg-slate-50 border p-3 flex flex-wrap justify-between gap-2 text-sm">
   <strong>{chosen.length} test{chosen.length===1?'':'s'} selected</strong><strong>{naira(total)}{quoteCount>0?' + '+quoteCount+' quote required':''}</strong>
   <p className="w-full text-xs text-slate-500">Each selected test is ordered once. Removed tests cannot be included in new orders.</p>
  </div>
 </section>;
}
