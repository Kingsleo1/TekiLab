import { getRoleDefinition } from '../config/roles';
import type { CatalogueActor, TestCatalogueItem } from '../types/test-catalog';
export function catalogueCapabilities(actor?: CatalogueActor | null) {
  if (!actor?.id) return { manageTests: false, managePrices: false, orderTests: false };
  const role = getRoleDefinition(actor.role).id;
  const permissions = new Set(actor.permissions || []);
  const admin = ['ceo','branch_manager'].includes(role);
  return {
    manageTests: admin || role === 'lead_lab_scientist' || permissions.has('canManageTestCatalogue'),
    managePrices: admin || role === 'billing' || permissions.has('canManageTestPrices'),
    orderTests: admin || ['lead_lab_scientist','lab_scientist','phlebotomist','receptionist','doctor','radiologist'].includes(role) || permissions.has('canRunRapidLab') || permissions.has('canConsultPatients')
  };
}
export const normalizedTestName = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export function displayedPrice(item: TestCatalogueItem): number | null {
  return item.priceStatus === 'quote_required' ? null : item.priceNaira;
}
export function searchCatalogue(items: TestCatalogueItem[], query: string, category = 'ALL') {
  const terms=normalizedTestName(query).split(' ').filter(Boolean);
  return items.filter(item=>item.isActive && (category==='ALL'||item.category===category) && terms.every(term=>
    normalizedTestName([item.name,item.code,item.category,...(item.aliases||[])].join(' ')).includes(term)));
}
export function catalogueToRapidPanel(item: TestCatalogueItem) {
  return { id:item.id,code:item.code,name:item.name,category:item.category,sampleType:item.sampleType,
    tubeColor:item.container || 'Confirm container with laboratory',targetTatMinutes:item.targetTatMinutes || 10,
    isQualitative:item.isQualitative || item.parameters?.every(p=>p.fieldType==='select') || false,
    parameters:(item.parameters||[]).map(p=>({name:p.name,value:'',unit:p.unit||'',referenceRange:p.referenceRange||'',flag:'Normal' as const})) };
}
export function isRapidReady(item: TestCatalogueItem) {
  return item.isActive && item.workflow==='rapid' && item.templateReviewed===true && Boolean(item.parameters?.length) && (item.targetTatMinutes||0)>0 && item.targetTatMinutes!<=10;
}
export function assertCatalogueItem(item: TestCatalogueItem) {
  if (!item.id || !item.name?.trim() || !item.code?.trim() || !item.category?.trim()) throw Error('Test name, code and category are required.');
  if (item.name.length>240 || item.code.length>80 || item.category.length>100 || !item.sampleType?.trim() || item.sampleType.length>160) throw Error('Invalid test details.');
  if (!['rapid','laboratory','referral','imaging'].includes(item.workflow) || !['published','facility','quote_required'].includes(item.priceStatus)) throw Error('Invalid workflow or pricing status.');
  if(item.workflow==='imaging'&&(!item.modality?.trim()||!item.bodySite?.trim()||item.department!=='Radiology'))throw Error('Imaging tests require Radiology, a modality and body site.');
  if (item.priceStatus!=='quote_required' && (!Number.isFinite(item.priceNaira)||item.priceNaira<0||item.priceNaira>100000000)) throw Error('Enter a valid non-negative price.');
  if (!Number.isFinite(item.turnaroundTimeHours)||item.turnaroundTimeHours<0) throw Error('Invalid turnaround time.');
  if(typeof item.isActive!=='boolean'||(item.templateReviewed!==undefined&&typeof item.templateReviewed!=='boolean')||!Array.isArray(item.parameters))throw Error('Invalid catalogue flags or result template.');
  if(item.targetTatMinutes!==undefined&&(!Number.isFinite(item.targetTatMinutes)||item.targetTatMinutes<0||item.targetTatMinutes>525600))throw Error('Invalid turnaround time.');
  if(new Set(item.parameters.map(p=>p.name?.trim().toLowerCase())).size!==item.parameters.length)throw Error('Parameter names must be unique.');
  if(item.parameters.some(p=>p.fieldType==='select'&&(!Array.isArray(p.options)||!p.options.length||p.options.length>100||p.options.some(value=>typeof value!=='string'||value.length>160))))throw Error('Select fields need valid choices.');
  if ((item.parameters?.length||0)>40 || item.parameters?.some(p=>!p.name?.trim()||p.name.length>120||!['number','text','select'].includes(p.fieldType))) throw Error('Invalid result template.');
  if(item.workflow==='rapid'&&!isRapidReady({...item,isActive:true})) throw Error('Rapid tests require a reviewed result template and a stated turnaround of 1–10 minutes.');
}
