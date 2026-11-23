# Comprehensive Multi-Unit Packaging, Tiered Pricing & Audit Log System
## Enterprise POS / E-Commerce Database, Payload, and Software Blueprint

This blueprint outlines a production-grade relational database schema, API communication contracts, and complete TypeScript business logic implementations designed to support multi-packaging sales models, complex tiered pricing algorithms, and automated audit logging of product addition events within an enterprise POS ecosystem.

---

## 1. Relational Database Schema Design (PostgreSQL DDL)

This design maintains full normalization while employing a **Variants/Attributes model** mapped to dynamic pricing tables, ensuring flexible pricing tiers across multiple packaging definitions. An immutable audit trail table tracks product addition history with complete attribution to the respective staff member.

```sql
-- Enable standard UUID generation extension for primary keys if required
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================================
-- 1. USERS & STAFF MANAGEMENT
-- =========================================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'POS Operator', -- 'Kernel Admin', 'Store Manager', 'Terminal Manager', etc.
    security_level INT NOT NULL DEFAULT 1,
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- 'active', 'dormant', 'offline'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for authentication and operational lookups
CREATE INDEX idx_users_email ON users(email);

-- =========================================================================
-- 2. PRODUCTS CORE DEFINITION
-- =========================================================================
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    generic_name VARCHAR(255),
    barcode VARCHAR(100) UNIQUE,
    category VARCHAR(100) NOT NULL,
    base_unit VARCHAR(50) NOT NULL, -- e.g., 'tablet', 'capsule', 'vial'
    price DECIMAL(15, 4) NOT NULL, -- Core reference base price
    cost_price DECIMAL(15, 4) NOT NULL, -- Purchasing or production cost price
    stock INT NOT NULL DEFAULT 0,
    min_stock_level INT NOT NULL DEFAULT 10,
    requires_prescription BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_category ON products(category);

-- =========================================================================
-- 3. PACKAGING SIZES & TIERED PRICING STRATEGIES (Scaling Attributes Pattern)
-- =========================================================================
-- Allows each product to independently configure distinct pricing for Full Pack,
-- Half Pack, and Quarter Pack units, handling Retail, Wholesale, and Volume levels.
CREATE TABLE product_packaging_pricing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    package_size VARCHAR(50) NOT NULL, -- 'Full Pack', 'Half Pack', 'Quarter Pack'
    retail_price DECIMAL(15, 4) NOT NULL, -- Price tier for single/low-count retail buyers
    wholesale_price DECIMAL(15, 4) NOT NULL, -- Price tier for wholesale buyers
    volume_price DECIMAL(15, 4) NOT NULL, -- Deep discount bulk/volume tier
    volume_threshold INT NOT NULL DEFAULT 10, -- Quantity threshold to trigger volume tier
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_product_package UNIQUE(product_id, package_size)
);

CREATE INDEX idx_packaging_pricing_lookup ON product_packaging_pricing(product_id, package_size);

-- =========================================================================
-- 4. PRODUCT ADDITION AUDIT LOG (Immutable History)
-- =========================================================================
CREATE TABLE product_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    product_name VARCHAR(255) NOT NULL, -- Captured at time of event to remain immutable
    action VARCHAR(50) NOT NULL DEFAULT 'CREATED', -- 'CREATED', 'UPDATED', 'DELETED'
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB -- Flexible slot for storing audit snapshots (e.g. initial stock or prices)
);

CREATE INDEX idx_product_logs_created_at ON product_logs(created_at);
CREATE INDEX idx_product_logs_creator ON product_logs(created_by);
```

---

## 2. API Communication Contracts (JSON Payloads)

### A. Create Product Endpoint Payload (`POST /api/products`)
Registers a new stock item with explicit pricing strategies configured across all package size units, attributing the action to a valid active user session.

```json
{
  "name": "Amoxicillin 500mg",
  "genericName": "Amoxicillin",
  "barcode": "5012345678901",
  "category": "Antibiotics",
  "price": 5000.00,
  "costPrice": 3200.00,
  "stock": 500,
  "baseUnit": "tablet",
  "minStockLevel": 50,
  "requiresPrescription": true,
  "creatorId": "8b5f3a02-c94e-4e4b-9706-e78453be93c2",
  "packagingPricing": {
    "fullPack": {
      "retailPrice": 5000.00,
      "wholesalePrice": 4250.00,
      "volumePrice": 3750.00,
      "volumeThreshold": 10
    },
    "halfPack": {
      "retailPrice": 2750.00,
      "wholesalePrice": 2350.00,
      "volumePrice": 2000.00,
      "volumeThreshold": 15
    },
    "quarterPack": {
      "retailPrice": 1500.00,
      "wholesalePrice": 1250.00,
      "volumePrice": 1000.00,
      "volumeThreshold": 20
    }
  }
}
```

### B. Audit Log Feed Endpoint Response (`GET /api/products/logs`)
A structured paginated feed representing the immutable log entries. Includes detailed nested context about the user who carried out each operation.

```json
{
  "status": "success",
  "pagination": {
    "totalCount": 142,
    "limit": 10,
    "offset": 0,
    "hasMore": true
  },
  "data": [
    {
      "id": "f5b82e11-e63c-4b55-bc24-8182cd939105",
      "productId": "3a0b93d7-46ef-46be-a764-77db8b21ca0e",
      "productName": "Amoxicillin 500mg",
      "action": "CREATED",
      "createdAt": "2026-07-14T08:00:00Z",
      "metadata": {
        "initialStock": 500,
        "basePrice": 5000.00,
        "requiresPrescription": true
      },
      "creator": {
        "id": "8b5f3a02-c94e-4e4b-9706-e78453be93c2",
        "name": "Dr. Sarah Adebayo",
        "email": "sarah.adebayo@pharmacy.net",
        "role": "Kernel Admin",
        "securityLevel": 5
      }
    }
  ]
}
```

---

## 3. Reference Software Architectures (TypeScript)

### A. Price Calculation Engine (`calculateItemPrice`)
A production-grade, pure, error-controlled calculation module. It resolves pricing priority and applies volume pricing automatically when items cross the threshold.

```typescript
export interface PricingStrategy {
  retailPrice: number;
  wholesalePrice: number;
  volumePrice: number;
  volumeThreshold: number;
}

export interface PackageUnits {
  fullPack?: PricingStrategy;
  halfPack?: PricingStrategy;
  quarterPack?: PricingStrategy;
}

export interface ProductData {
  id: string;
  name: string;
  price: number;
  packagingPricing?: PackageUnits;
}

export interface CartItem {
  productId: string;
  quantity: number;
  packageSize: 'Full Pack' | 'Half Pack' | 'Quarter Pack';
  saleType: 'Retail' | 'Wholesale';
}

export interface PricingResult {
  unitPrice: number;
  subtotal: number;
  appliedTier: 'Retail' | 'Wholesale' | 'Volume Price';
}

/**
 * Calculates correct unit and subtotal pricing for a cart line item.
 * Supports fallback pricing models if custom values are omitted.
 */
export function calculateItemPrice(item: CartItem, product: ProductData): PricingResult {
  if (item.quantity <= 0) {
    throw new Error(`Invalid item quantity: ${item.quantity}. Must be greater than 0.`);
  }

  const sizeKey = item.packageSize === 'Full Pack' 
    ? 'fullPack' 
    : item.packageSize === 'Half Pack' 
      ? 'halfPack' 
      : 'quarterPack';

  let retailPrice = 0;
  let wholesalePrice = 0;
  let volumePrice = 0;
  let volumeThreshold = 10;

  // Retrieve pricing configurations
  if (product.packagingPricing && product.packagingPricing[sizeKey]) {
    const config = product.packagingPricing[sizeKey]!;
    retailPrice = config.retailPrice;
    wholesalePrice = config.wholesalePrice;
    volumePrice = config.volumePrice;
    volumeThreshold = config.volumeThreshold;
  } else {
    // Elegant fallbacks if pricing configuration isn't defined explicitly:
    // Full Pack: retail = 100%, wholesale = 85%, volume = 75% (>=10 items)
    // Half Pack: retail = 55%, wholesale = 47%, volume = 40% (>=15 items)
    // Quarter Pack: retail = 30%, wholesale = 25%, volume = 20% (>=20 items)
    const basePrice = product.price;
    if (item.packageSize === 'Full Pack') {
      retailPrice = basePrice;
      wholesalePrice = basePrice * 0.85;
      volumePrice = basePrice * 0.75;
      volumeThreshold = 10;
    } else if (item.packageSize === 'Half Pack') {
      retailPrice = basePrice * 0.55;
      wholesalePrice = basePrice * 0.47;
      volumePrice = basePrice * 0.40;
      volumeThreshold = 15;
    } else { // Quarter Pack
      retailPrice = basePrice * 0.30;
      wholesalePrice = basePrice * 0.25;
      volumePrice = basePrice * 0.20;
      volumeThreshold = 20;
    }
  }

  // Base pricing resolution on requested sale type
  let finalUnitPrice = item.saleType === 'Wholesale' ? wholesalePrice : retailPrice;
  let appliedTier: 'Retail' | 'Wholesale' | 'Volume Price' = item.saleType === 'Wholesale' ? 'Wholesale' : 'Retail';

  // Apply volume discount if quantity meets or exceeds threshold
  if (item.quantity >= volumeThreshold && volumePrice > 0) {
    if (volumePrice < finalUnitPrice) {
      finalUnitPrice = volumePrice;
      appliedTier = 'Volume Price';
    }
  }

  // Round values nicely to avoid floating-point math issues
  const roundedUnitPrice = Math.round(finalUnitPrice * 100) / 100;
  const subtotal = Math.round((roundedUnitPrice * item.quantity) * 100) / 100;

  return {
    unitPrice: roundedUnitPrice,
    subtotal,
    appliedTier
  };
}
```

### B. Database Transaction Log Middleware
Ensures atomicity when creating new products. Using a node transaction structure, it rolls back all updates if writing to either `products` or `product_logs` fails.

```typescript
import { Client } from 'pg';

export interface CreateProductInput {
  name: string;
  genericName?: string;
  barcode: string;
  category: string;
  price: number;
  costPrice: number;
  stock: number;
  baseUnit: string;
  minStockLevel?: number;
  requiresPrescription?: boolean;
  creatorId: string;
  packagingPricing?: PackageUnits;
}

/**
 * Creates a product, establishes packaging pricing strategies, and records
 * an immutable database audit log in a single atomic database transaction.
 */
export async function createProductTransaction(dbClient: Client, input: CreateProductInput): Promise<string> {
  // Start Atomic Transaction Block
  await dbClient.query('BEGIN');

  try {
    // 1. Insert base product record
    const productInsertQuery = `
      INSERT INTO products (name, generic_name, barcode, category, base_unit, price, cost_price, stock, min_stock_level, requires_prescription)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id;
    `;
    const productValues = [
      input.name,
      input.genericName || null,
      input.barcode,
      input.category,
      input.baseUnit,
      input.price,
      input.costPrice,
      input.stock,
      input.minStockLevel ?? 10,
      input.requiresPrescription ?? false
    ];
    
    const productResult = await dbClient.query(productInsertQuery, productValues);
    const productId = productResult.rows[0].id;

    // 2. Insert package-based tiered pricing models if supplied
    if (input.packagingPricing) {
      const packagingPricingInsertQuery = `
        INSERT INTO product_packaging_pricing (product_id, package_size, retail_price, wholesale_price, volume_price, volume_threshold)
        VALUES ($1, $2, $3, $4, $5, $6);
      `;

      const sizes: ('fullPack' | 'halfPack' | 'quarterPack')[] = ['fullPack', 'halfPack', 'quarterPack'];
      const displayNames = {
        fullPack: 'Full Pack',
        halfPack: 'Half Pack',
        quarterPack: 'Quarter Pack'
      };

      for (const size of sizes) {
        const config = input.packagingPricing[size];
        if (config) {
          await dbClient.query(packagingPricingInsertQuery, [
            productId,
            displayNames[size],
            config.retailPrice,
            config.wholesalePrice,
            config.volumePrice,
            config.volumeThreshold
          ]);
        }
      }
    }

    // 3. Write immutable record creation event to the audit logs
    const auditLogInsertQuery = `
      INSERT INTO product_logs (product_id, product_name, action, created_by, metadata)
      VALUES ($1, $2, 'CREATED', $3, $4);
    `;
    const auditMetadata = {
      initialStock: input.stock,
      basePrice: input.price,
      requiresPrescription: input.requiresPrescription ?? false,
      costPrice: input.costPrice
    };

    await dbClient.query(auditLogInsertQuery, [
      productId,
      input.name,
      input.creatorId,
      JSON.stringify(auditMetadata)
    ]);

    // Commit Transaction safely as all database operations succeeded
    await dbClient.query('COMMIT');
    return productId;

  } catch (error) {
    // Roll back changes completely to retain consistency in case of any exceptions
    await dbClient.query('ROLLBACK');
    console.error('Database transaction aborted. Rolling back changes. Error:', error);
    throw error;
  }
}
```
