import {useEffect,useState} from 'react';
import {DEFAULT_SITE_SETTINGS,validateSiteSettings,type SiteSettings,type SiteSettingsSnapshot} from '../lib/site-settings';
let snapshot:SiteSettingsSnapshot={settings:{...DEFAULT_SITE_SETTINGS},revision:0,updatedAt:null,storage:'defaults'};
let request:Promise<void>|undefined;
const listeners=new Set<()=>void>();
export function applySiteSettings(value:SiteSettingsSnapshot){snapshot={...value,settings:validateSiteSettings(value.settings)};document.documentElement.style.setProperty('--tekilab-accent',snapshot.settings.accentColor);listeners.forEach(fn=>fn());}
export async function refreshSiteSettings(){const response=await fetch('/api/site-settings',{cache:'no-store'});const value=await response.json();if(!response.ok)throw new Error(value.error||'Site settings could not be loaded.');applySiteSettings(value);return value as SiteSettingsSnapshot;}
export function useSiteSettings(){const [value,setValue]=useState(snapshot);useEffect(()=>{const update=()=>setValue(snapshot);listeners.add(update);update();if(!request)request=refreshSiteSettings().then(()=>{}).catch(()=>{});return()=>{listeners.delete(update);};},[]);return value;}
