import test from 'node:test';
import assert from 'node:assert/strict';
import {FlutterwaveBookingPayments} from '../src/server/flutterwave-payments';
const payment={bookingId:'SYNTH-BOOKING',reference:'SYNTH-REF',amountMinor:123400,email:'test@example.invalid'};
const data={id:123,tx_ref:payment.reference,amount:1234,currency:'NGN',status:'successful',meta:{bookingId:payment.bookingId}};
const client=(value:any)=>new FlutterwaveBookingPayments('FLWSECK_TEST-synthetic',true,(async()=>new Response(JSON.stringify({status:'success',data:value}),{headers:{'Content-Type':'application/json'}})) as any);
test('Flutterwave is disabled without credentials and rejects live credentials in preview',()=>{assert.equal(new FlutterwaveBookingPayments(undefined,true).enabled,false);assert.equal(new FlutterwaveBookingPayments('FLWSECK-live',true).enabled,false);});
test('Flutterwave initializes with a trusted hosted checkout URL',async()=>{const result=await client({link:'https://checkout.flutterwave.com/v3/hosted/pay'}).initialize(payment,'http://localhost:3000/booking/synthetic');assert.equal(result.reference,payment.reference);assert.equal(result.testMode,true);await assert.rejects(client({link:'https://evil.invalid'}).initialize(payment,'http://localhost:3000'),{status:502});});
test('Flutterwave verifies the expected reference, amount, currency, status and booking',async()=>{const proof=await client(data).verify(payment,payment.reference);assert.equal(proof.provider,'flutterwave');for(const patch of [{amount:1},{currency:'USD'},{status:'failed'},{meta:{bookingId:'OTHER'}},{tx_ref:'OTHER'}])await assert.rejects(client({...data,...patch}).verify(payment,payment.reference),{status:409});});
