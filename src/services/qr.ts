import type {CatalogueScope} from '../types/test-catalog';
export function activeClinicalIdentity(){
 const user=JSON.parse(localStorage.getItem('ph_current_user')||'null');
 const scope=JSON.parse(sessionStorage.getItem('tekilab_active_scope')||'null')||{tenantId:user?.tenantId||'tenant-tekilab-01',branchId:user?.branchId||'pharma-1'};
 return {user,scope};
}
export async function qrRequest(path:string,body?:any,scope?:CatalogueScope,actor?:any){
 const identity=activeClinicalIdentity();scope=scope||identity.scope;actor=actor||identity.user;
 const query=new URLSearchParams(scope as any);
 const response=await fetch('/api/lims/qr'+path+(path.includes('?')?'&':'?')+query,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(actor?{'X-TekiLab-Preview-Actor':encodeURIComponent(JSON.stringify({id:actor.id,name:actor.name||actor.displayName,role:actor.role,permissions:actor.permissions||[]}))}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
 const data=await response.json();if(!response.ok)throw Object.assign(Error(data.error||'Request failed.'),{status:response.status});return data;
}
export async function ensureResultVerification(order:any,patient:any,kind:'laboratory'|'radiology',scope?:CatalogueScope,actor?:any){
 if(order.verification?.token){const record=await qrRequest('/results/'+encodeURIComponent(order.verification.token));if(record.order.reportApproval.reportDigest!==order.reportApproval?.reportDigest)throw Error('Published result does not match this report.');const fields=['id','patientId','patientName','testName','results','clinicalInterpretation','findingsNotes','impressionNotes','techniqueNotes','recommendationsNotes','clinicalIndication'];if(fields.some(field=>JSON.stringify(record.order[field])!==JSON.stringify(order[field])))throw Error('This report differs from the published result.');return {...order.verification,publishedRecord:record};}
 return qrRequest('/results',{order,patient,kind},scope,actor);
}
