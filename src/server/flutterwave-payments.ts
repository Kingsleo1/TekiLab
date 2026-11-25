import { CatalogueError } from './catalogue-errors';
export class FlutterwaveBookingPayments {
  constructor(private secret: string | undefined, private preview: boolean, private transport: typeof fetch = fetch) {}
  get enabled() { return Boolean(this.secret && (!this.preview || this.secret.includes('_TEST'))); }
  private async request(path: string, body?: any) {
    if (!this.enabled) throw new CatalogueError(503, 'Flutterwave is not configured. Contact reception.');
    const response = await this.transport('https://api.flutterwave.com/v3' + path, { method: body ? 'POST' : 'GET', headers: { Authorization: 'Bearer ' + this.secret, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(15000) });
    const result = await response.json();
    if (!response.ok || result.status !== 'success' || !result.data) throw new CatalogueError(502, 'Flutterwave could not confirm this request. No payment was recorded.');
    return result.data;
  }
  async initialize(payment: any, callbackUrl: string) {
    const data = await this.request('/payments', { tx_ref: payment.reference, amount: payment.amountMinor / 100, currency: 'NGN', redirect_url: callbackUrl, customer: { email: payment.email }, meta: { bookingId: payment.bookingId } });
    const url = new URL(data.link);
    if (url.protocol !== 'https:' || url.hostname !== 'checkout.flutterwave.com') throw new CatalogueError(502, 'Invalid Flutterwave checkout address.');
    return { url: url.toString(), reference: payment.reference, testMode: this.preview };
  }
  async verify(payment: any, reference: string) {
    if (reference !== payment.reference) throw new CatalogueError(409, 'Payment reference does not match.');
    const data = await this.request('/transactions/verify_by_reference?tx_ref=' + encodeURIComponent(reference));
    if (data.status !== 'successful' || data.tx_ref !== reference || data.currency !== 'NGN' || Math.round(Number(data.amount) * 100) !== payment.amountMinor || data.meta?.bookingId !== payment.bookingId) throw new CatalogueError(409, 'Payment details do not match this booking.');
    return { reference, provider: 'flutterwave', providerTransactionId: String(data.id), verifiedAt: new Date().toISOString(), mode: this.preview ? 'test' : 'live' };
  }
}
