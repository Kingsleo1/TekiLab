import {Router} from 'express';
import {SiteSettingsStore,authorizeSiteSettings} from './site-settings-store';
import {CatalogueError} from './catalogue-errors';
export function createSiteSettingsRouter(root:string,preview:boolean){
 const router=Router(),store=new SiteSettingsStore(root,preview,process.env);
 router.use((_req,res,next)=>{res.setHeader('Cache-Control','no-store');next();});
 router.get('/',async(_req,res)=>{try{res.json(await store.read());}catch{res.status(503).json({error:'Saved site settings could not be loaded. Retry before making changes.'});}});
 router.put('/',async(req,res)=>{try{authorizeSiteSettings(req.headers,preview,process.env);res.json(await store.save(req.body));}catch(error){res.status(error instanceof CatalogueError?error.status:503).json({error:error instanceof CatalogueError?error.message:'Site settings could not be saved. No save was confirmed.'});}});return router;
}
