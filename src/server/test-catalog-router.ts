import { Router } from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { TestCatalogueStore, CatalogueError } from './test-catalog-store';
import type { CatalogueActor, CatalogueScope } from '../types/test-catalog';
export async function createTestCatalogueRouter(root:string,previewMode:boolean) {
  const seed=JSON.parse(await fs.readFile(path.join(root,'public/catalogue/test-catalogue.json'),'utf8'));
  const store=new TestCatalogueStore(path.join(root,'data/local-preview/catalogue'),seed.items);
  const router=Router();
  router.use((req,res,next)=>{
    // Client role metadata is permitted only for the isolated local preview.
    // Production must supply a trusted session resolver before these routes can be enabled.
    if(!previewMode)return res.status(503).json({error:'Catalogue access requires configured server authentication.'});
    try {
      const actor=JSON.parse(decodeURIComponent(String(req.headers['x-tekilab-preview-actor']||''))) as CatalogueActor;
      if(!actor.id||typeof actor.role!=='string'||actor.role.length>100||String(actor.id).length>160||!Array.isArray(actor.permissions||[])||(actor.permissions||[]).length>80)throw Error();
      res.locals.catalogueActor=actor;next();
    }catch{return res.status(401).json({error:'Sign in to access the test catalogue.'});}
  });
  const scope=(req:any):CatalogueScope=>({tenantId:String(req.query.tenantId||''),branchId:String(req.query.branchId||'')});
  const fail=(res:any,error:any)=>res.status(error instanceof CatalogueError?error.status:503).json({error:error instanceof CatalogueError?error.message:'The local catalogue database is unavailable. No changes were confirmed.'});
  router.get('/',async(req,res)=>{
    try {const value=await store.get(scope(req),res.locals.catalogueActor);const tag='"'+value.revision+'"';res.setHeader('ETag',tag);res.setHeader('Cache-Control','private, no-cache');
      if(req.headers['if-none-match']===tag)return res.status(304).end();
      return res.json(value);
    }catch(error){return fail(res,error);}
  });
  router.post('/items',async(req,res)=>{
    try{return res.status(201).json(await store.mutate(scope(req),res.locals.catalogueActor,Number(req.body?.baseRevision),null,req.body?.patch||{}));}catch(error){return fail(res,error);}
  });
  router.patch('/items/:id',async(req,res)=>{
    try{return res.json(await store.mutate(scope(req),res.locals.catalogueActor,Number(req.body?.baseRevision),String(req.params.id),req.body?.patch||{}));}catch(error){return fail(res,error);}
  });
  router.post('/orders',async(req,res)=>{
    try{return res.status(201).json(await store.order(scope(req),res.locals.catalogueActor,req.body));}catch(error){return fail(res,error);}
  });
  router.get('/orders',async(req,res)=>{try{return res.json(await store.records(scope(req),res.locals.catalogueActor));}catch(error){return fail(res,error);}});
  router.post('/records',async(req,res)=>{try{return res.json(await store.saveRecord(scope(req),res.locals.catalogueActor,req.body?.order));}catch(error){return fail(res,error);}});
  router.post('/orders/:id/payment',async(req,res)=>{try{return res.json(await store.payment(scope(req),res.locals.catalogueActor,String(req.params.id)));}catch(error){return fail(res,error);}});
  (router as any).catalogueStore=store;
  return router;
}
