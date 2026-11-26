export interface SiteSettings {
  facilityName: string; tagline: string; logoUrl: string; accentColor: string;
  supportEmail: string; supportPhone: string; address: string; openingHours: string;
  bookingTitle: string; bookingNotice: string; footerText: string;
}
export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  facilityName: 'TekiLab', tagline: 'Laboratory & diagnostic services', logoUrl: '/logo.png', accentColor: '#2563eb',
  supportEmail: '', supportPhone: '', address: '', openingHours: '',
  bookingTitle: 'Book tests & scans', bookingNotice: 'Choose your laboratory tests or radiology scans. Appointment requests and payment require facility confirmation.',
  footerText: 'Laboratory information management'
};
export const SITE_SETTINGS_LIMITS: Record<keyof SiteSettings,number> = {facilityName:100,tagline:180,logoUrl:280000,accentColor:7,supportEmail:180,supportPhone:40,address:400,openingHours:250,bookingTitle:120,bookingNotice:1200,footerText:250};
export function validateSiteSettings(input: unknown): SiteSettings {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Provide a settings object.');
  const source=input as Record<string,unknown>, output={} as SiteSettings;
  if(Object.keys(source).some(key=>!Object.hasOwn(SITE_SETTINGS_LIMITS,key)))throw new Error('Unsupported settings field. Credentials and clinical records are not site settings.');
  for(const key of Object.keys(DEFAULT_SITE_SETTINGS) as (keyof SiteSettings)[]){
    if(typeof source[key]!=='string')throw new Error('Complete all settings fields.');
    const value=(source[key] as string).trim();if(value.length>SITE_SETTINGS_LIMITS[key] || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value))throw new Error('Invalid or overlong '+key+'.');output[key]=value;
  }
  if(!output.facilityName || !output.bookingTitle)throw new Error('Facility name and booking title are required.');
  if(!/^#[a-f0-9]{6}$/i.test(output.accentColor))throw new Error('Choose a valid six-digit brand colour.');
  if(output.supportEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(output.supportEmail))throw new Error('Enter a valid support email.');
  if(output.logoUrl){
    const relative=/^\/(?!\/)[a-z0-9_./?=&%-]+$/i.test(output.logoUrl);
    const data=/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(output.logoUrl);
    let remote=false;try{const url=new URL(output.logoUrl);remote=url.protocol==='https:'&&!url.username&&!url.password;}catch{}
    if(!relative&&!data&&!remote)throw new Error('Use a site image path, HTTPS logo or PNG, JPEG or WebP upload.');
  }
  return output;
}
export interface SiteSettingsSnapshot {settings:SiteSettings; revision:number; updatedAt:string|null; storage:'local-server'|'astra'|'defaults';}
