import type { LabTestCatalogItem } from './pharmacy';
export interface PriceObservation {
  provider: string; amountNaira: number; url: string; retrievedAt: string;
  publishedDate?: string; context: 'published-retail' | 'published-specialist';
}
export interface TestCatalogueItem extends LabTestCatalogItem {
  workflow: 'rapid' | 'laboratory' | 'referral' | 'imaging';
  department?:'Laboratory'|'Radiology'; modality?:string; bodySite?:string;
  priceStatus: 'published' | 'facility' | 'quote_required';
  priceObservations: PriceObservation[];
  publishedRange?: { min: number; max: number; offers: number };
  aliases?: string[]; sourceUrls?: string[]; targetTatMinutes?: number;
  priceNote?: string; templateReviewed?: boolean; isQualitative?: boolean;
}
export interface CatalogueScope { tenantId: string; branchId: string }
export interface CatalogueActor { id: string; name?: string; role: string; permissions?: string[] }
export interface CatalogueAudit { id: string; at: string; actorId: string; actorName: string; action: string; itemId: string; revision: number }
export interface CatalogueSnapshot {
  revision: number; items: TestCatalogueItem[]; audit?: CatalogueAudit[];
  persistence: 'local-database'; astraSync: 'held'; updatedAt: string | null;
}
