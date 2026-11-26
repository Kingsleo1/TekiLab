import {useMemo,useState} from 'react';
import {CLINICAL_FINDINGS} from '../../data/clinical-findings';
export function ClinicalFindingPicker({value,onSelect,disabled=false}:{value:string;onSelect:(label:string,code:string)=>void;disabled?:boolean}){
 const [search,setSearch]=useState(''),[category,setCategory]=useState('All categories');
 const categories=[...new Set(CLINICAL_FINDINGS.map(item=>item.category))];
 const matches=useMemo(()=>CLINICAL_FINDINGS.filter(item=>(category==='All categories'||item.category===category)&&[item.label,item.code,item.category].join(' ').toLowerCase().includes(search.trim().toLowerCase())),[search,category]);
 return <div className="space-y-2"><div className="grid gap-2 sm:grid-cols-2"><input disabled={disabled} aria-label="Search clinical findings" placeholder="Search positive, reactive, high, resistant…" value={search} onChange={e=>setSearch(e.target.value)} className="w-full rounded border bg-white p-2 text-sm"/><select disabled={disabled} aria-label="Finding category" value={category} onChange={e=>setCategory(e.target.value)} className="rounded border bg-white p-2 text-sm"><option>All categories</option>{categories.map(name=><option key={name}>{name}</option>)}</select></div>
 <select disabled={disabled} aria-label="Clinical finding" value={value} onChange={e=>{const selected=CLINICAL_FINDINGS.find(item=>item.label===e.target.value);onSelect(e.target.value,selected?.code||'');}} className="w-full rounded border bg-white p-2 text-sm"><option value="">Select a finding (optional)</option>{value&&!CLINICAL_FINDINGS.some(item=>item.label===value)&&<option value={value}>{value}</option>}{categories.map(name=>{const items=matches.filter(item=>item.category===name);return items.length?<optgroup label={name} key={name}>{items.map(item=><option key={item.id} value={item.label}>{item.label} ({item.code})</option>)}</optgroup>:null;})}</select>
 <p className="text-xs text-slate-600">{matches.length} matching interpretations. HL7 terminology provides wording, not a diagnosis or a reference interval. Use susceptibility and trend categories only for applicable tests. Custom findings remain available.</p>
 <a className="text-xs underline" href="https://terminology.hl7.org/CodeSystem-v3-ObservationInterpretation.html" target="_blank" rel="noopener noreferrer">Terminology source</a>
 </div>;
}
