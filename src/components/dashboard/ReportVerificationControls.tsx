import {PatientPortalLink} from './PatientPortalLink';
import {useState} from 'react';
import {ensureResultVerification,qrRequest} from '../../services/qr';
import {Button} from '@/components/ui/button';
export function ReportVerificationControls({order,patient,kind}:{order:any;patient?:any;kind:'laboratory'|'radiology'}){
 const [link,setLink]=useState<any>(order.verification||null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[confirmed,setConfirmed]=useState(false),[withdrawn,setWithdrawn]=useState(false);
 if(!order.reportApproval||!['RELEASED','Released'].includes(order.orderStatus))return null;
 const create=async()=>{setBusy(true);setError('');try{setLink(await ensureResultVerification(order,patient,kind));}catch(error:any){setError(error.message);}finally{setBusy(false);}};
 const revoke=async()=>{if(!link||!confirmed)return;setBusy(true);try{await qrRequest('/results/'+link.token+'/revoke',{});setWithdrawn(true);setConfirmed(false);}catch(error:any){setError(error.message);}finally{setBusy(false);}};
 return <section className="border rounded-lg p-3 space-y-2 text-sm print:hidden"><h3 className="font-bold">Result verification</h3><PatientPortalLink patientId={order.patientId}/><p>Anyone with this report’s QR link can view the full result.</p>{withdrawn?<p role="status">Report withdrawn. The public QR link no longer validates or displays the result.</p>:<>{link?<a className="text-blue-700 underline break-all" href={link.url} target="_blank" rel="noopener noreferrer">Open verified result</a>:<Button variant="outline" disabled={busy} onClick={create}>Get result verification link</Button>}{link&&<><label className="flex gap-2"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>I confirm withdrawing this published report</label><Button variant="outline" disabled={!confirmed||busy} onClick={revoke}>Withdraw report</Button></>}</>}{error&&<p role="alert">{error}</p>}</section>;
}
