import {SiteSettingsStore,authorizeSiteSettings} from '../src/server/site-settings-store';
import {CatalogueError} from '../src/server/catalogue-errors';
const store=new SiteSettingsStore('',false,process.env);
export default async function handler(req:any,res:any){
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 if(!['GET','PUT'].includes(req.method)){res.setHeader('Allow','GET, PUT');return res.status(405).json({error:'Method not supported.'});}
 try{if(req.method==='GET')return res.status(200).json(await store.read());authorizeSiteSettings(req.headers,false,process.env);return res.status(200).json(await store.save(req.body));}
 catch(error){return res.status(error instanceof CatalogueError?error.status:503).json({error:error instanceof CatalogueError?error.message:'Site settings are unavailable. No change was confirmed.'});}
}
