import {useEffect,useRef,useState} from 'react';
import QRCode from 'qrcode';
import {qrRequest} from '../services/qr';
import {TestOrderPicker} from './dashboard/TestOrderPicker';
import {downloadBookingReceipt,downloadVerifiedReport} from '../lib/reporting-utils';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
function QRImage({value}:{value:string}){
 const [src,setSrc]=useState('');
 useEffect(()=>{let active=true;QRCode.toDataURL(value,{width:256,margin:4,errorCorrectionLevel:'M'}).then(src=>{if(active)setSrc(src);});return()=>{active=false;};},[value]);
 return src?<img src={src} alt="Scannable TekiLab QR code" width="200" height="200"/>:null;
}
export function OnlineBooking({initialPatient}:{initialPatient?:any}){
 const [config,setConfig]=useState<any>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [ids,setIds]=useState<string[]>([]),[name,setName]=useState(initialPatient?.fullName||''),[phone,setPhone]=useState(initialPatient?.phone||''),[email,setEmail]=useState(initialPatient?.email||'');
 const [date,setDate]=useState(new Date().toISOString().slice(0,10)),[time,setTime]=useState('10:00'),[receipt,setReceipt]=useState<any>(null);
 const request=useRef(crypto.randomUUID());
 const refresh=()=>qrRequest('/booking-config').then(data=>{setConfig(data);setError('');}).catch(error=>setError(error.message));
 useEffect(()=>{refresh();},[]);
 const changed=()=>{request.current=crypto.randomUUID();};
 const book=async(e:any)=>{
  e.preventDefault();if(busy||!config)return;setBusy(true);setError('');
  try{setReceipt(await qrRequest('/book',{requestId:request.current,testIds:ids,baseRevision:config.revision,patient:{fullName:name.trim(),phone:phone.trim(),email:email.trim()},appointmentDate:date,appointmentTime:time}));}
  catch(error:any){setError(error.message);if(error.status===409)refresh();}finally{setBusy(false);}
 };
 if(receipt)return <section className="space-y-4 bg-white p-5 rounded-xl border" aria-label="Booking receipt">
  <h1 className="text-2xl font-black">Booking receipt</h1><p className="font-bold">{receipt.number}</p><p>{receipt.patient.fullName} · {receipt.appointmentDate} {receipt.appointmentTime}</p>
  <p>Booked · Payment pending. Your appointment request needs facility confirmation.</p>
  <ul>{receipt.tests.map((test:any)=><li key={test.id} className="flex justify-between gap-4 py-1"><span>{test.name}</span><strong>{test.priceNaira===null?'Quote required':'NGN '+test.priceNaira.toLocaleString()}</strong></li>)}</ul>
  <p>Listed total: NGN {receipt.totalNaira.toLocaleString()}{receipt.unquoted?' plus tests awaiting a quote':''}</p>
  <QRImage value={receipt.receiptUrl}/><p className="text-sm">Show this QR at reception to validate your order. This receipt confirms a booking request, not payment.</p>
  {!receipt.onlineCheckoutAvailable&&<p className="text-sm">Online checkout needs facility payment-provider setup. No payment has been taken.</p>}
  {receipt.localOnly&&<p className="text-sm text-amber-800">Local preview link: this QR works on this computer. Public access requires the approved site deployment.</p>}
  <div className="flex flex-wrap gap-3 print:hidden"><Button variant="outline" disabled={!receipt.onlineCheckoutAvailable} onClick={async()=>{try{const checkout=await qrRequest('/booking/'+receipt.token+'/payment/initialize',{});window.location.assign(checkout.url);}catch(error:any){setError(error.message);}}}>Pay online {receipt.localOnly?'(test checkout)':''}</Button><Button onClick={()=>downloadBookingReceipt(receipt).catch(e=>setError(e.message))}>Download receipt PDF</Button><Button variant="outline" onClick={()=>window.print()}>Print receipt</Button><Button variant="outline" onClick={()=>{setReceipt(null);changed();}}>New booking</Button></div>
  {error&&<p role="alert">{error}</p>}
 </section>;
 return <form onSubmit={book} className="space-y-5 bg-white p-4 sm:p-6 rounded-xl border">
  <h1 className="text-3xl font-black">Book laboratory tests</h1>
  <p className="text-sm text-slate-600">Select one or more tests. Provider fees are references; confirm the facility fee, test method and availability. Payment is handled separately.</p>
  {error&&<p role="alert" className="text-red-700">{error}</p>}
  <div className="grid sm:grid-cols-2 gap-3">
   <label>Full name<Input required maxLength={160} value={name} onChange={e=>{setName(e.target.value);changed();}} autoComplete="name"/></label>
   <label>Phone<Input required type="tel" maxLength={40} value={phone} onChange={e=>{setPhone(e.target.value);changed();}} autoComplete="tel"/></label>
   <label>Email (optional)<Input type="email" maxLength={180} value={email} onChange={e=>{setEmail(e.target.value);changed();}}/></label>
   <label>Appointment date<Input required type="date" min={new Date().toISOString().slice(0,10)} value={date} onChange={e=>{setDate(e.target.value);changed();}}/></label>
   <label>Preferred time<Input required type="time" value={time} onChange={e=>{setTime(e.target.value);changed();}}/></label>
  </div>
  <TestOrderPicker items={config?.items||[]} selectedIds={ids} onChange={next=>{setIds(next);changed();}} canManage={false} error={error} onRetry={refresh} defaultMultiple/>
  <Button type="submit" disabled={busy||!config||!ids.length}>{busy?'Saving booking…':'Confirm booking & get QR receipt'}</Button>
 </form>;
}
export function ClinicalPublicPages(){
 const path=window.location.pathname,token=path.split('/')[2],isResult=path.startsWith('/verify/');
 const [record,setRecord]=useState<any>(null),[error,setError]=useState(''),[downloadError,setDownloadError]=useState('');
 useEffect(()=>{
  const meta=document.createElement('meta');meta.name='referrer';meta.content='no-referrer';document.head.appendChild(meta);
  const reference=new URLSearchParams(window.location.search).get('reference')||new URLSearchParams(window.location.search).get('trxref');
  if(token&&!isResult&&reference)qrRequest('/booking/'+encodeURIComponent(token)+'/payment/verify',{reference}).then(()=>qrRequest('/booking/'+encodeURIComponent(token))).then(setRecord).catch(error=>setError(error.message));
  else if(token)qrRequest((isResult?'/results/':'/booking/')+encodeURIComponent(token)).then(setRecord).catch(error=>setError(error.message));
  return()=>{meta.remove();};
 },[path]);
 return <main className="max-w-4xl mx-auto px-3 py-6 sm:py-10 space-y-5">
  <header className="flex justify-between items-center print:hidden"><a href="/" className="font-black text-2xl text-blue-700">TekiLab</a><a href="/book" className="text-blue-700">Book tests</a></header>
  {path.replace(/\/$/,'')==='/book'?<OnlineBooking/>:error?<section role="alert" className="border border-red-300 p-6 rounded-xl"><h1 className="text-2xl font-black">Verification unavailable</h1><p>{error}</p></section>:!record?<p role="status">Checking this record…</p>:isResult?<article className="bg-white border rounded-xl p-4 sm:p-7 space-y-4">
   <h1 className="text-2xl font-black text-emerald-800">Authentic approved result</h1><p>This is the report published by this facility. Authenticity confirms the recorded approval; clinical interpretation remains the reviewing professional’s responsibility.</p>
   <dl className="grid sm:grid-cols-2 gap-2">{[['Patient',record.patient.fullName],['MRN',record.patient.mrn||'Not recorded'],['Test',record.order.testName],['Report',record.order.reportNumber||record.order.accessionNumber||record.order.id]].map(([label,value])=><div key={label}><dt>{label}</dt><dd className="font-bold">{value}</dd></div>)}</dl>
   {record.kind==='laboratory'?<div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr>{['Parameter','Result','Unit','Reference','Flag'].map(x=><th key={x} className="text-left p-2">{x}</th>)}</tr></thead><tbody>{Object.entries(record.order.results||{}).map(([name,r]:[string,any])=><tr key={name} className="border-t"><td className="p-2">{name}</td><td className="font-bold p-2">{r.value}</td><td>{r.unit}</td><td>{r.referenceRange}</td><td>{r.flag}</td></tr>)}</tbody></table></div>:['clinicalIndication','techniqueNotes','findingsNotes','impressionNotes','recommendationsNotes'].map(key=><section key={key}><h2 className="font-bold">{key.replace(/([A-Z])/g,' $1')}</h2><p className="whitespace-pre-wrap">{record.order[key]||'Not recorded'}</p></section>)}
   <section><h2 className="font-bold">Reviewer impression</h2><p>{record.order.likelyIssue||'Not recorded'}</p></section><section><h2 className="font-bold">Professional findings</h2><p className="whitespace-pre-wrap">{record.order.clinicalInterpretation||'Not recorded'}</p></section>
   <p>Approved by {record.order.reportApproval.signerName} · {record.order.reportApproval.signedAt}</p>
   <img src={record.order.reportApproval.signaturePng} alt="Approving professional signature" className="max-w-56 max-h-24"/>
   <p className="text-xs break-all">Published content SHA-256: {record.contentDigest}</p><QRImage value={window.location.href.split('?')[0]}/>
   <p className="text-sm text-slate-600">Anyone possessing this link can view the full result. Share it only with intended recipients.</p>
   <div className="flex flex-wrap gap-3 print:hidden"><Button onClick={()=>downloadVerifiedReport(record).catch(e=>setDownloadError(e.message))}>Download verified result PDF</Button><Button variant="outline" onClick={()=>window.print()}>Print verified result</Button></div>{downloadError&&<p role="alert">{downloadError}</p>}
  </article>:<section className="p-6 bg-white rounded-xl border space-y-3"><h1 className="text-2xl font-black">Valid TekiLab booking</h1><p>{record.number}</p><p>{record.status} · {record.paymentStatus}{record.paymentMode==='test'?' (test transaction — not a real payment)':''}</p><p>{record.appointmentDate} {record.appointmentTime}</p><p>Present this QR at reception. Staff will confirm your identity and validate the tests.</p>{record.paymentStatus!=='Paid'&&record.onlineCheckoutAvailable&&<Button onClick={async()=>{try{const checkout=await qrRequest('/booking/'+token+'/payment/initialize',{});window.location.assign(checkout.url);}catch(error:any){setDownloadError(error.message);}}}>Pay online (test checkout)</Button>}{downloadError&&<p role="alert">{downloadError}</p>}<QRImage value={window.location.href.split('?')[0]}/></section>}
 </main>;
}
