import type { CatalogueActor, CatalogueScope, CatalogueSnapshot } from '../types/test-catalog';
const events='tekilab_test_catalogue_changed';
const url=(scope:CatalogueScope,suffix='')=>'/api/lims/test-catalog'+suffix+'?'+new URLSearchParams(scope as any);
function headers(actor:CatalogueActor) { return {'Content-Type':'application/json','X-TekiLab-Preview-Actor':encodeURIComponent(JSON.stringify({id:actor.id,name:actor.name,role:actor.role,permissions:actor.permissions||[]}))}; }
async function result(response:Response) {
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw Object.assign(Error(data.error||'The catalogue change was not saved.'),{status:response.status});return data;
}
export async function fetchTestCatalogue(scope:CatalogueScope,actor:CatalogueActor,revision?:number):Promise<CatalogueSnapshot|null>{
  const response=await fetch(url(scope),{headers:{...headers(actor),...(revision!==undefined?{'If-None-Match':'"'+revision+'"'}:{})}});
  if(response.status===304)return null;return result(response);
}
export async function mutateTestCatalogue(scope:CatalogueScope,actor:CatalogueActor,baseRevision:number,id:string|null,patch:Record<string,unknown>):Promise<CatalogueSnapshot>{
  const data=await result(await fetch(url(scope,id?'/items/'+encodeURIComponent(id):'/items'),{method:id?'PATCH':'POST',headers:headers(actor),body:JSON.stringify({baseRevision,patch})}));
  window.dispatchEvent(new CustomEvent(events,{detail:{scope,data}}));return data;
}
export async function createCatalogueOrder(scope:CatalogueScope,actor:CatalogueActor,baseRevision:number,testIds:string[],patient:any,requestId:string){
  return result(await fetch(url(scope,'/orders'),{method:'POST',headers:headers(actor),body:JSON.stringify({baseRevision,testIds,patient,requestId})}));
}
export const catalogueChangedEvent=events;

export const fetchCatalogueOrders=(scope:CatalogueScope,actor:CatalogueActor)=>fetch(url(scope,'/orders'),{headers:headers(actor)}).then(result);
export const saveCatalogueRecord=(scope:CatalogueScope,actor:CatalogueActor,order:any)=>fetch(url(scope,'/records'),{method:'POST',headers:headers(actor),body:JSON.stringify({order})}).then(result);

export const confirmCataloguePayment=(scope:CatalogueScope,actor:CatalogueActor,id:string)=>fetch(url(scope,'/orders/'+encodeURIComponent(id)+'/payment'),{method:'POST',headers:headers(actor),body:'{}'}).then(result);
