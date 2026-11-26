import {CatalogueError} from './catalogue-errors';
import {validateReportContents} from './report-validation';
const tokenPattern=/^[A-Za-z0-9_-]{43}$/;
export class PublicResultVerifier{
 constructor(private env:Record<string,string|undefined>,private transport:typeof fetch=fetch){}
 private config(){
  const endpoint=this.env.ASTRA_DB_API_ENDPOINT,token=this.env.ASTRA_VERIFICATION_APPLICATION_TOKEN||this.env.ASTRA_DB_APPLICATION_TOKEN,keyspace=this.env.ASTRA_DB_KEYSPACE||'default_keyspace',collection=this.env.TEKILAB_ASTRA_RECORDS_COLLECTION||'tekilab_records';
  if(!endpoint||!token)throw new CatalogueError(503,'Public verification awaits the configured Astra connection and synchronized approved records.');
  let url:URL;try{url=new URL(endpoint);}catch{throw new CatalogueError(503,'Public verification is not configured. Contact the issuing facility.');}
  if(url.protocol!=='https:'||!/^[-a-z0-9]+\.apps\.astra\.datastax\.com$/.test(url.hostname)||url.port||url.username||url.password||url.pathname!=='/'||url.search||url.hash||(!/^[a-z][a-z0-9_]{0,47}$/.test(keyspace)||!/^[a-z][a-z0-9_]{0,47}$/.test(collection)))throw new CatalogueError(503,'Public verification is not configured. Contact the issuing facility.');
  return {endpoint:url.origin,token,keyspace,collection};
 }
 private async find(collection:string,filter:any){
  const config=this.config();let response:Response,value:any;
  try{response=await this.transport(config.endpoint+'/api/json/v1/'+encodeURIComponent(config.keyspace)+'/'+encodeURIComponent(config.collection),{method:'POST',headers:{Token:config.token,'Content-Type':'application/json'},redirect:'error',signal:AbortSignal.timeout(5000),body:JSON.stringify({findOne:{filter:{entity:collection,...filter},projection:{payload:1,_id:0}}})});value=await response.json();}catch{throw new CatalogueError(503,'The verification registry could not be reached. Retry or contact the issuing facility.');}
  if(!response.ok||value.errors?.length||!value.data||!Object.prototype.hasOwnProperty.call(value.data,'document'))throw new CatalogueError(503,'The verification registry did not confirm this lookup. Contact the issuing facility.');
  return value.data.document?.payload||null;
 }
 async verify(token:string){
  if(!tokenPattern.test(token))throw new CatalogueError(404,'Report not found.');
  const record=await this.find('approved_reports',{'payload.token':token});
  if(!record||record.token!==token)throw new CatalogueError(404,'Report not found.');
  if(record.revokedAt)throw new CatalogueError(410,'This report was withdrawn and is no longer valid.');
  // A withdrawal must have reached Astra before public lookup can observe it.
  const withdrawal=await this.find('audit_events',{'payload.entity':'verified_report_revocation','payload.token':token});
  if(withdrawal)throw new CatalogueError(410,'This report was withdrawn and is no longer valid.');
  let signed:any;try{signed=JSON.parse(record.order.reportApproval.reportSnapshot);}catch{throw new CatalogueError(409,'The stored approved result could not be validated. Contact the issuing facility.');}
  const order={...record.order};
  // Early local records omitted these display fields; recover them only from the signed snapshot.
  for(const field of ['testId','findingCode','referenceSource','assayMethod','referenceReviewed'])if(order[field]===undefined&&signed[field]!==undefined)order[field]=signed[field];
  try{validateReportContents(record.kind,order,record.patient);}catch{throw new CatalogueError(409,'The stored approved result could not be validated. Contact the issuing facility.');}
  return {kind:record.kind,order,patient:record.patient,token:record.token,publishedAt:record.publishedAt,contentDigest:record.contentDigest,revokedAt:null};
 }
}
