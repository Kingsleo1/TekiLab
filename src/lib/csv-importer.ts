import Papa from 'papaparse';
import { Product, Category, Attribute } from '../types/pharmacy';

// Normalizes a string key: removes non-alphanumeric characters, converts to lowercase
const norm = (str: string): string => str.toLowerCase().replace(/[^a-z0-9]/g, '');

// Clean number parser: handles currency symbols (₦, $, €, £), commas, whitespace
export const parseCleanNumber = (val: any, fallback = 0): number => {
  if (val === undefined || val === null) return fallback;
  if (typeof val === 'number') return isNaN(val) ? fallback : val;
  const str = String(val).trim();
  if (!str) return fallback;
  const cleaned = str.replace(/[^0-9.-]+/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? fallback : num;
};

// Clean date parser: supports ISO (YYYY-MM-DD), DD/MM/YYYY, MM/DD/YYYY, and DD-MM-YYYY
export const parseCleanDate = (val: any): string => {
  const defaultFuture = () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split('T')[0];
  };

  if (!val) return defaultFuture();
  const str = String(val).trim();
  if (!str) return defaultFuture();

  // 1. Direct standard format YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = str.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (ymdMatch) {
    const [, y, m, d] = ymdMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // 2. Day/Month/Year or Month/Day/Year (e.g., 31/12/2026 or 12/31/2026)
  const dmyMatch = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmyMatch) {
    const [, p1, p2, y] = dmyMatch;
    const n1 = parseInt(p1, 10);
    const n2 = parseInt(p2, 10);
    // If first part > 12, it must be DD/MM/YYYY
    if (n1 > 12 && n2 <= 12) {
      return `${y}-${String(n2).padStart(2, '0')}-${String(n1).padStart(2, '0')}`;
    }
    // If second part > 12, it must be MM/DD/YYYY
    if (n2 > 12 && n1 <= 12) {
      return `${y}-${String(n1).padStart(2, '0')}-${String(p2).padStart(2, '0')}`;
    }
    // Default assuming DD/MM/YYYY
    return `${y}-${String(n2).padStart(2, '0')}-${String(n1).padStart(2, '0')}`;
  }

  // 3. Fallback to native Date parser
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return defaultFuture();
};

// Clean boolean parser
export const parseCleanBoolean = (val: any): boolean => {
  if (val === undefined || val === null) return false;
  if (typeof val === 'boolean') return val;
  const s = String(val).toLowerCase().trim();
  return s === 'true' || s === '1' || s === 'yes' || s === 'y' || s === 'rx' || s === 'required';
};

// Flexible lookup across a normalized row dictionary
export const getRowField = (row: Record<string, any>, ...candidateAliases: string[]): string | undefined => {
  // First, check raw keys
  for (const alias of candidateAliases) {
    if (row[alias] !== undefined && row[alias] !== null && String(row[alias]).trim() !== '') {
      return String(row[alias]).trim();
    }
  }
  // Second, check normalized keys
  const normMap: Record<string, string> = {};
  for (const [key, val] of Object.entries(row)) {
    normMap[norm(key)] = String(val ?? '').trim();
  }
  for (const alias of candidateAliases) {
    const nAlias = norm(alias);
    if (normMap[nAlias] !== undefined && normMap[nAlias] !== '') {
      return normMap[nAlias];
    }
  }
  return undefined;
};

// Parse raw CSV text or File into rows with auto-detected delimiter & stripped BOM
export const parseRawCSV = (fileOrText: File | string): Promise<Record<string, any>[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(fileOrText as any, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (h: string) => h.trim(),
      complete: (results) => {
        if (results.errors && results.errors.length > 0 && results.data.length === 0) {
          reject(new Error(results.errors[0].message || 'Unable to parse CSV file'));
        } else {
          resolve(results.data as Record<string, any>[]);
        }
      },
      error: (error) => reject(error)
    });
  });
};

export interface BulkProductsParseResult {
  valid: Product[];
  invalidCount: number;
  totalParsed: number;
  warnings: string[];
}

// Convert CSV rows into validated, typed Product models
export const convertRowsToProducts = (
  rows: Record<string, any>[], 
  defaultBranchId = 'pharma-1'
): BulkProductsParseResult => {
  const valid: Product[] = [];
  const warnings: string[] = [];
  let invalidCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // +1 for 0-index, +1 for header line

    const name = getRowField(
      row, 
      'name', 'product_name', 'productName', 'item_name', 'itemName', 'product', 'item', 'title', 'description'
    );

    if (!name) {
      invalidCount++;
      warnings.push(`Row ${rowNum}: Skipped due to missing Product Name.`);
      continue;
    }

    const id = getRowField(row, 'id', 'product_id', 'productId', 'sku', 'code') 
      || `P-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    const genericName = getRowField(
      row, 
      'generic_name', 'genericName', 'generic', 'formula', 'composition', 'salt'
    ) || 'Formula Reference';

    const barcode = getRowField(
      row, 
      'barcode', 'upc', 'ean', 'sku_code', 'bar_code'
    ) || Math.random().toString().slice(2, 14);

    const category = getRowField(
      row, 
      'category', 'category_name', 'categoryName', 'department', 'group', 'class'
    ) || 'Antibiotics';

    const price = parseCleanNumber(
      getRowField(row, 'price', 'selling_price', 'sellingPrice', 'retail_price', 'retailPrice', 'rate', 'unit_price', 'amount'), 
      0
    );

    const costPrice = parseCleanNumber(
      getRowField(row, 'cost_price', 'costPrice', 'cost', 'purchase_price', 'purchasePrice', 'buy_price', 'unit_cost'), 
      0
    );

    const stock = parseCleanNumber(
      getRowField(row, 'stock', 'quantity', 'qty', 'units', 'balance', 'count'), 
      0
    );

    const minStockLevel = parseCleanNumber(
      getRowField(row, 'min_stock_level', 'minStockLevel', 'min_stock', 'reorder_level', 'min_qty', 'alert_level'), 
      10
    );

    const baseUnit = (getRowField(
      row, 
      'base_unit', 'baseUnit', 'unit', 'dosage_form', 'dosageForm', 'presentation', 'form'
    ) || 'tablet') as any;

    const conversionFactor = Math.max(1, parseCleanNumber(
      getRowField(row, 'conversion_factor', 'conversionFactor', 'pack_size', 'packSize', 'units_per_pack'), 
      1
    ));

    const rawExpiry = getRowField(
      row, 
      'expiry_date', 'expiryDate', 'exp_date', 'expiry', 'expiration_date', 'expirationDate'
    );
    const expiryDate = parseCleanDate(rawExpiry);

    const requiresPrescription = parseCleanBoolean(
      getRowField(row, 'requires_prescription', 'requiresPrescription', 'prescription', 'rx', 'controlled')
    );

    const branchId = getRowField(
      row, 
      'pharmacy_id', 'pharmacyId', 'branch_id', 'branchId', 'store_id'
    ) || (defaultBranchId !== 'all' ? defaultBranchId : 'pharma-1');

    const batchNumber = getRowField(
      row, 
      'batch_number', 'batchNumber', 'batch', 'lot', 'lot_number'
    ) || `BAT-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const product: Product = {
      id,
      name,
      genericName,
      barcode,
      category,
      price,
      costPrice,
      stock,
      minStockLevel,
      baseUnit,
      conversionFactor,
      expiryDate,
      requiresPrescription,
      pharmacyId: branchId,
      batches: [
        {
          id: `B-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
          batchNumber,
          manufactureDate: new Date().toISOString().split('T')[0],
          expiryDate,
          quantity: stock,
          costPrice
        }
      ],
      attributes: {}
    };

    valid.push(product);
  }

  return {
    valid,
    invalidCount,
    totalParsed: rows.length,
    warnings
  };
};

export interface BulkCategoriesParseResult {
  valid: Category[];
  invalidCount: number;
  totalParsed: number;
  warnings: string[];
}

export const convertRowsToCategories = (rows: Record<string, any>[]): BulkCategoriesParseResult => {
  const valid: Category[] = [];
  const warnings: string[] = [];
  let invalidCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    const name = getRowField(row, 'name', 'category_name', 'categoryName', 'category', 'title');
    if (!name) {
      invalidCount++;
      warnings.push(`Row ${rowNum}: Missing Category Name`);
      continue;
    }

    const id = getRowField(row, 'id', 'category_id', 'categoryId', 'code')
      || `CAT-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    const description = getRowField(row, 'description', 'desc', 'notes', 'details') || `${name} medications`;

    valid.push({ id, name, description });
  }

  return { valid, invalidCount, totalParsed: rows.length, warnings };
};

export interface BulkAttributesParseResult {
  valid: Attribute[];
  invalidCount: number;
  totalParsed: number;
  warnings: string[];
}

export const convertRowsToAttributes = (rows: Record<string, any>[]): BulkAttributesParseResult => {
  const valid: Attribute[] = [];
  const warnings: string[] = [];
  let invalidCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    const name = getRowField(row, 'name', 'attribute_name', 'attributeName', 'attribute', 'title');
    if (!name) {
      invalidCount++;
      warnings.push(`Row ${rowNum}: Missing Attribute Name`);
      continue;
    }

    const id = getRowField(row, 'id', 'attribute_id', 'attributeId', 'code')
      || `ATTR-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    const rawType = (getRowField(row, 'type', 'field_type', 'format') || 'text').toLowerCase();
    const type: 'text' | 'select' = rawType === 'select' || rawType === 'dropdown' ? 'select' : 'text';

    const rawOptions = getRowField(row, 'options', 'choices', 'values', 'dropdown_options') || '';
    const options = rawOptions
      ? rawOptions.split(/[;,|]/).map(o => o.trim()).filter(Boolean)
      : [];

    valid.push({ id, name, type, options });
  }

  return { valid, invalidCount, totalParsed: rows.length, warnings };
};

// Generate standard ready-to-use CSV template strings
export const generateSampleCSV = (type: 'products' | 'categories' | 'attributes'): { filename: string; content: string } => {
  if (type === 'products') {
    return {
      filename: 'teki_pharm_products_sample.csv',
      content: 
`id,name,genericName,barcode,category,price,costPrice,stock,baseUnit,conversionFactor,expiryDate,requiresPrescription,minStockLevel
P-001,Amoxicillin 500mg,Amoxicillin,7501234567891,Antibiotics,1500.00,900.00,100,capsule,1,2027-08-31,true,20
P-002,Ibuprofen 400mg,Ibuprofen,7501234567892,Pain Relief,850.00,450.00,250,tablet,1,2027-06-15,false,30
P-003,Multivitamin Drops,Vitamins & Minerals,7501234567893,Vitamins & Supplements,2400.00,1600.00,60,bottle,1,2026-11-20,false,15
P-004,Ciprofloxacin 500mg,Ciprofloxacin,7501234567894,Antibiotics,1800.00,1100.00,120,tablet,1,2027-10-15,true,25
P-005,Paracetamol 500mg,Acetaminophen,7501234567895,Pain Relief,500.00,280.00,500,tablet,1,2028-01-30,false,50`
    };
  } else if (type === 'categories') {
    return {
      filename: 'teki_pharm_categories_sample.csv',
      content:
`id,name,description
CAT-001,Antibiotics,Antimicrobial agents for bacterial infections
CAT-002,Pain Relief,Analgesics, antipyretics and anti-inflammatory drugs
CAT-003,Cardiovascular,Blood pressure regulators and heart health
CAT-004,Vitamins & Supplements,Nutritional supplements and dietary formulas
CAT-005,Dermatology,Topical skin treatments and ointments`
    };
  } else {
    return {
      filename: 'teki_pharm_attributes_sample.csv',
      content:
`id,name,type,options
ATTR-001,Dosage Form,select,"Tablet; Capsule; Syrup; Suspension; Injection; Cream"
ATTR-002,Strength,text,
ATTR-003,Storage Temperature,select,"2-8°C (Refrigerated); 15-25°C (Cool/Dry); Below 30°C"
ATTR-004,Manufacturer,text,`
    };
  }
};
