import {CatalogueError} from './catalogue-errors';
export class BookingPayments {
 constructor(private secret:string|undefined,private preview:boolean,private transport:typeof fetch=fetch){}
 get enabled(){return Boolean(this.secret&&(!this.preview||this.secret.startsWith('sk_test_')));}
 private async request(path:string,body?:any){
  if(!this.enabled)throw new CatalogueError(503,'Online checkout is not configured. Please arrange payment with reception.');
  const response=await this.transport('https://api.paystack.co'+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+this.secret,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000)});
  const data=await response.json();if(!response.ok||!data.status||!data.data)throw new CatalogueError(502,'The payment provider could not confirm this request. No payment was recorded.');return data.data;
 }
 async initialize(payment:any,callbackUrl:string){
  const result=await this.request('/transaction/initialize',{email:payment.email,amount:payment.amountMinor,currency:'NGN',reference:payment.reference,callback_url:callbackUrl,metadata:{bookingId:payment.bookingId}});
  const url=new URL(result.authorization_url);if(url.protocol!=='https:'||!['checkout.paystack.com','paystack.com'].includes(url.hostname))throw new CatalogueError(502,'Invalid checkout address returned by the provider.');return {url:url.toString(),reference:payment.reference,testMode:this.preview};
 }
 async verify(payment:any,reference:string){
  if(reference!==payment.reference)throw new CatalogueError(409,'Payment reference does not match this booking.');
  const data=await this.request('/transaction/verify/'+encodeURIComponent(reference));
  if(data.status!=='success'||data.reference!==payment.reference||data.currency!=='NGN'||data.amount!==payment.amountMinor||data.metadata?.bookingId!==payment.bookingId||(this.preview&&data.domain!=='test'))throw new CatalogueError(409,'Payment amount, currency, booking or status could not be verified.');
  return {reference:data.reference,providerTransactionId:String(data.id),verifiedAt:new Date().toISOString(),mode:this.preview?'test':'live'};
 }
}
