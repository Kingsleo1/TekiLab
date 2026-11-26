import React,{useState,useEffect} from 'react';
import {activeClinicalIdentity} from '../../../services/qr';
interface Props{isOpen?:boolean;onClose?:()=>void;embedded?:boolean;defaultTab?:'guide'|'cql'|'env'}
export function AstraDatabaseSetupModal({isOpen=true,onClose,embedded=false}:Props){
 const [status,setStatus]=useState<any>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [endpoint,setEndpoint]=useState(''),[keyspace,setKeyspace]=useState('default_keyspace'),[token,setToken]=useState(''),[accessKey,setAccessKey]=useState(''),[confirmed,setConfirmed]=useState(false);
 const call=async(action:string,body?:any)=>{setBusy(true);setError('');try{const {user}=activeClinicalIdentity();const response=await fetch('/api/lims/admin/astra/'+action,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(accessKey?{Authorization:'Bearer '+accessKey}:{}),...(user?{'X-TekiLab-Preview-Actor':encodeURIComponent(JSON.stringify({id:user.id,name:user.name,role:user.role}))}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});const data=await response.json();if(!response.ok)throw Error(data.error||'Operation was not confirmed.');setStatus(data);if(action==='configure')setToken('');}catch(error:any){setError(error.message);}finally{setBusy(false);}};
 useEffect(()=>{call('status');},[]);
 if(!embedded&&!isOpen)return null;
 const content=<section aria-label="TekiLab Astra management" className="rounded-xl border bg-white p-5 space-y-4 max-h-[85dvh] overflow-y-auto">
  <div className="flex justify-between gap-3"><h2 className="text-xl font-black">TekiLab database and synchronization</h2>{!embedded&&<button onClick={onClose}>Close</button>}</div>
  <p className="text-sm">Manage the laboratory schema, connection and clinical sync outbox. Database application tokens stay on the server. Configure server environment variables for a connection that survives restarts.</p>
  <label className="block text-sm">Server administrator access key (hosted setup)<input aria-label="Server administrator access key" type="password" autoComplete="off" className="block w-full border rounded p-2" value={accessKey} onChange={e=>setAccessKey(e.target.value)}/></label>
  <form onSubmit={e=>{e.preventDefault();call('configure',{endpoint,keyspace,token});}} className="grid gap-3">
   <label>Database HTTPS endpoint<input aria-label="Astra HTTPS endpoint" className="block w-full border rounded p-2" value={endpoint} onChange={e=>setEndpoint(e.target.value)} placeholder="https://database-region.apps.astra.datastax.com" required/></label>
   <label>Keyspace<input aria-label="Astra keyspace" className="block w-full border rounded p-2" value={keyspace} onChange={e=>setKeyspace(e.target.value)} required/></label>
   <label>Application token (server session only)<input aria-label="Astra application token" type="password" autoComplete="off" className="block w-full border rounded p-2" value={token} onChange={e=>setToken(e.target.value)} required/></label>
   <button disabled={busy} className="rounded bg-blue-700 px-4 py-2 text-white">Connect and test</button>
  </form>
  <p className="text-sm">{status?.message||'Connection status unavailable.'}</p>
  {status&&<dl className="grid grid-cols-2 gap-2 text-sm"><dt>Configured</dt><dd>{status.configured?'Yes':'No'}</dd><dt>Connection tested</dt><dd>{status.connected?'Connected':'Not confirmed'}</dd><dt>Writes enabled</dt><dd>{status.writesEnabled?'Yes':'Held'}</dd><dt>Pending sync events</dt><dd>{status.pendingEvents??'Unknown'}</dd></dl>}
  <div className="flex flex-wrap gap-2"><button disabled={busy} onClick={()=>call('status')} className="border rounded p-2">Refresh status</button><button disabled={busy} onClick={()=>call('test',{})} className="border rounded p-2">Test connection</button><a className="border rounded p-2 underline" href="/schemas/tekilab-database-schema.json" download>Download laboratory schema</a></div>
  <details><summary>Laboratory collections</summary><ul className="list-disc pl-5 text-sm">{status?.collections?.map((name:string)=><li key={name}>{name}</li>)}</ul></details>
  <label className="flex gap-2 text-sm"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>I reviewed the laboratory schema and approve creating missing collections or synchronizing clinical records.</label>
  <div className="flex flex-wrap gap-2"><button disabled={busy||!confirmed||!status?.writesEnabled} onClick={()=>call('initialize',{})} className="border rounded p-2 disabled:opacity-40">Create missing laboratory collections</button><button disabled={busy||!confirmed||!status?.writesEnabled} onClick={()=>call('sync',{})} className="border rounded p-2 disabled:opacity-40">Sync pending clinical records</button></div>
  <p className="text-xs">Writes remain held until TEKILAB_ENABLE_ASTRA_WRITES=true is set on the server. The local server retries its outbox every five seconds when enabled. This prepares one-way sync; production shared reads and trusted clinical authentication still require the hosted backend. Source code and credentials are excluded from sync.</p>
  {error&&<p role="alert" className="text-red-700 break-words">{error}</p>}
 </section>;
 return embedded?content:<div className="fixed inset-0 z-[100] bg-black/50 p-4 overflow-y-auto"><div className="max-w-3xl mx-auto">{content}</div></div>;
}
