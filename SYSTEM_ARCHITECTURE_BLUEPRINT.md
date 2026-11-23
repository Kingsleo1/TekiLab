# Enterprise Pharmacy Core System Architecture Blueprint
## Inventory, Sales & Global Activity Monitoring Pipeline

This document defines the production-grade architectural specifications, database schema, transactional pricing logic, and telemetry pipelines for our e-commerce and POS platform.

---

### 1. Database Schema Design (SQL DDL)

An index-optimized, ACID-compliant relational schema compatible with PostgreSQL (v12+). It models staff roles, variant-level flexible pricing tiers (Retail, Wholesale, Volume), and an immutable transaction logging system.

```sql
-- Create custom ENUM types for activity classifications and severities
CREATE TYPE severity_level_enum AS ENUM ('INFO', 'SUCCESS', 'WARNING', 'CRITICAL');
CREATE TYPE activity_type_enum AS ENUM (
    'PRODUCT_CREATED', 
    'PRODUCT_UPDATED', 
    'PRODUCT_DELETED', 
    'SALE_COMPLETED', 
    'STOCK_ADJUSTMENT', 
    'SYSTEM_ERROR', 
    'LOW_STOCK'
);
CREATE TYPE sale_type_enum AS ENUM ('RETAIL', 'WHOLESALE', 'VOLUME');
CREATE TYPE order_status_enum AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED', 'VOIDED');

-- 1. Users / Staff Table
CREATE TABLE users (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL, -- e.g., 'ADMIN', 'MANAGER', 'CASHIER'
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Products Table
CREATE TABLE products (
    id VARCHAR(50) PRIMARY KEY,
    sku VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    generic_name VARCHAR(255),
    description TEXT,
    base_unit VARCHAR(20) DEFAULT 'pcs', -- e.g., 'tablets', 'bottles'
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Product Attributes / Packaging Variants
-- Supports Full Pack, Half Pack, Quarter Pack conversions
CREATE TABLE product_packaging_variants (
    id VARCHAR(50) PRIMARY KEY,
    product_id VARCHAR(50) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_name VARCHAR(50) NOT NULL, -- 'Full Pack', 'Half Pack', 'Quarter Pack'
    unit_ratio INT NOT NULL DEFAULT 1,  -- e.g., Full = 100 tablets, Half = 50, Quarter = 25
    sku_suffix VARCHAR(20) NOT NULL,
    current_stock INT NOT NULL DEFAULT 0,
    reorder_threshold INT NOT NULL DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_product_variant FOREIGN KEY (product_id) REFERENCES products(id),
    CONSTRAINT uq_product_variant UNIQUE (product_id, variant_name)
);

-- 4. Pricing Tiers Table
-- Maps packaging variants to Retail, Wholesale, and Volume price tiers
CREATE TABLE product_pricing_tiers (
    id VARCHAR(50) PRIMARY KEY,
    variant_id VARCHAR(50) NOT NULL REFERENCES product_packaging_variants(id) ON DELETE CASCADE,
    retail_unit_price DECIMAL(15, 2) NOT NULL,
    wholesale_unit_price DECIMAL(15, 2) NOT NULL,
    volume_threshold INT NOT NULL DEFAULT 10, -- qty required to trigger volume pricing
    volume_unit_price DECIMAL(15, 2) NOT NULL, -- price when quantity >= volume_threshold
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_variant_pricing UNIQUE (variant_id)
);

-- 5. Sales Orders Table
CREATE TABLE orders (
    id VARCHAR(50) PRIMARY KEY,
    staff_id VARCHAR(50) NOT NULL REFERENCES users(id),
    customer_name VARCHAR(150) DEFAULT 'General Consumer',
    checkout_mode sale_type_enum NOT NULL DEFAULT 'RETAIL',
    subtotal DECIMAL(15, 2) NOT NULL,
    discount DECIMAL(15, 2) DEFAULT 0.00,
    tax DECIMAL(15, 2) NOT NULL,
    total DECIMAL(15, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL, -- 'CASH', 'POS_TERMINAL', 'BANK_TRANSFER'
    status order_status_enum DEFAULT 'COMPLETED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Order Line Items Table
CREATE TABLE order_items (
    id BIGSERIAL PRIMARY KEY,
    order_id VARCHAR(50) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id VARCHAR(50) NOT NULL REFERENCES products(id),
    variant_id VARCHAR(50) NOT NULL REFERENCES product_packaging_variants(id),
    quantity INT NOT NULL,
    unit_price DECIMAL(15, 2) NOT NULL,
    line_total DECIMAL(15, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. System Activities & Notification Ledger
-- Holds historical platform activities, transactions, system errors, and alerts
CREATE TABLE system_activities (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL, -- Nullable for system-triggered events
    activity_type activity_type_enum NOT NULL,
    severity_level severity_level_enum NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb, -- dynamic details like items sold, fields changed, trace logs
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Optimization Indexes
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_variants_product_id ON product_packaging_variants(product_id);
CREATE INDEX idx_orders_staff_id ON orders(staff_id);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_activities_type_severity ON system_activities(activity_type, severity_level);
CREATE INDEX idx_activities_created_at ON system_activities(created_at DESC);
```

---

### 2. Fully Formatted JSON Payloads

#### `GET /api/admin/activities`
A paginated JSON response showing mixed platform alerts ranging from inventory transactions to systems warnings and high-value checkouts.

```json
{
  "status": "success",
  "data": {
    "activities": [
      {
        "id": "ACT-9081",
        "userId": "ST-01",
        "activityType": "PRODUCT_CREATED",
        "severityLevel": "INFO",
        "title": "New Product Packaging Variant Registered",
        "description": "Amoxicillin & Clavulanate Potassium 1000mg Pack of 100s added to Catalog.",
        "createdBy": {
          "id": "ST-01",
          "name": "James Wilson",
          "role": "Store Manager",
          "email": "james@manesolpharmacy.com"
        },
        "metadata": {
          "productId": "PRD-7721",
          "packagingVariants": ["Full Pack (100s)", "Half Pack (50s)", "Quarter Pack (25s)"],
          "pricingTiers": {
            "retail_unit_price": 12500.00,
            "wholesale_unit_price": 11000.00,
            "volume_threshold": 10,
            "volume_unit_price": 10500.00
          },
          "baseStock": 250
        },
        "createdAt": "2026-07-14T16:59:11Z"
      },
      {
        "id": "ACT-9082",
        "userId": "ST-04",
        "activityType": "SALE_COMPLETED",
        "severityLevel": "SUCCESS",
        "title": "High-Value Wholesale Completed",
        "description": "Completed wholesale checkout of Amoxicillin (30 packs) to patient Dr. David Okafor.",
        "createdBy": {
          "id": "ST-04",
          "name": "Elena Rodriguez",
          "role": "POS Cashier",
          "email": "elena@manesolpharmacy.com"
        },
        "metadata": {
          "orderId": "ORD-5542",
          "customerName": "Dr. David Okafor",
          "checkoutMode": "WHOLESALE",
          "subtotal": 330000.00,
          "discount": 0.00,
          "tax": 33000.00,
          "total": 363000.00,
          "paymentMethod": "POS_TERMINAL"
        },
        "createdAt": "2026-07-14T16:47:00Z"
      },
      {
        "id": "ACT-9083",
        "userId": null,
        "activityType": "LOW_STOCK",
        "severityLevel": "WARNING",
        "title": "Inventory Alert: Stock Threshold Breached",
        "description": "Paracetamol 500mg Rapid Action (SKU-101) stock fell below safe threshold of 50 units (Current: 14 units).",
        "createdBy": null,
        "metadata": {
          "productId": "SKU-101",
          "variantId": "VAR-0019",
          "currentStock": 14,
          "reorderThreshold": 50,
          "recommendedAction": "Initiate immediate warehouse transfer request"
        },
        "createdAt": "2026-07-14T16:15:30Z"
      },
      {
        "id": "ACT-9084",
        "userId": "system",
        "activityType": "SYSTEM_ERROR",
        "severityLevel": "CRITICAL",
        "title": "Checkout Transaction Aborted: Database Deadlock",
        "description": "An unexpected isolation timeout error occurred during high-concurrency stock deduct transaction.",
        "createdBy": {
          "id": "system",
          "name": "System Engine",
          "role": "Core Daemon",
          "email": "telemetry@manesolpharmacy.com"
        },
        "metadata": {
          "errorCode": "ERR_DATABASE_DEADLOCK",
          "endpoint": "/api/v1/checkout",
          "transactionId": "TX-90291-BA",
          "retryCount": 3,
          "criticality": "HIGH_PRIORITY",
          "stackTrace": "DatabaseError: deadlock detected at transaction isolation. lock acquired by PID 921"
        },
        "createdAt": "2026-07-14T15:02:11Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 8,
      "totalRecords": 31,
      "pageSize": 4
    }
  }
}
```

---

### 3. Core Engine & Transactional Middleware (TypeScript)

#### A. Price Calculation Engine
Below is the highly reliable TypeScript function `calculateItemPrice` implementing precise pricing calculations. It determines prices according to checkout modes, packaging structures, and bulk discounts.

```typescript
export interface PricingTier {
  retailUnitPrice: number;
  wholesaleUnitPrice: number;
  volumeThreshold: number;
  volumeUnitPrice: number;
}

export interface CartItem {
  productId: string;
  variantId: string;
  variantName: 'Full Pack' | 'Half Pack' | 'Quarter Pack';
  unitRatio: number; // e.g. Full = 1, Half = 0.5, Quarter = 0.25
  quantity: number;  // Number of units purchased
  pricingTiers: PricingTier;
}

export interface PriceCalculationResult {
  unitPrice: number;
  subtotal: number;
  appliedPricingMode: 'RETAIL' | 'WHOLESALE' | 'VOLUME';
  discountApplied: number;
}

/**
 * Calculates itemized unit prices and totals dynamically based on checkout profiles
 * @param item Complete metadata of the Cart item including pricing tiers
 * @param checkoutMode Selected checkout profile ('RETAIL' | 'WHOLESALE')
 */
export function calculateItemPrice(
  item: CartItem,
  checkoutMode: 'RETAIL' | 'WHOLESALE'
): PriceCalculationResult {
  if (item.quantity <= 0) {
    throw new Error('Quantity must be greater than zero.');
  }

  const { pricingTiers, unitRatio } = item;
  let unitPrice = 0;
  let appliedPricingMode: 'RETAIL' | 'WHOLESALE' | 'VOLUME' = 'RETAIL';
  let discountApplied = 0;

  // 1. Evaluate Volume Tier Threshold Eligibility
  if (item.quantity >= pricingTiers.volumeThreshold) {
    unitPrice = pricingTiers.volumeUnitPrice;
    appliedPricingMode = 'VOLUME';
    
    // Calculate difference vs retail baseline
    const baselinePrice = checkoutMode === 'WHOLESALE' 
      ? pricingTiers.wholesaleUnitPrice 
      : pricingTiers.retailUnitPrice;
    discountApplied = Math.max(0, baselinePrice - unitPrice) * item.quantity;
  } 
  // 2. Evaluate Wholesale Eligibility
  else if (checkoutMode === 'WHOLESALE') {
    unitPrice = pricingTiers.wholesaleUnitPrice;
    appliedPricingMode = 'WHOLESALE';
  } 
  // 3. Fallback to standard Retail price tier
  else {
    unitPrice = pricingTiers.retailUnitPrice;
    appliedPricingMode = 'RETAIL';
  }

  // Adjust unit pricing dynamically by unit ratios for fractional sizing conversions
  // Full Pack ratio = 1.0, Half Pack ratio = 0.5, Quarter Pack ratio = 0.25
  const scaledUnitPrice = unitPrice * unitRatio;
  const rawSubtotal = scaledUnitPrice * item.quantity;

  return {
    unitPrice: Number(scaledUnitPrice.toFixed(2)),
    subtotal: Number(rawSubtotal.toFixed(2)),
    appliedPricingMode,
    discountApplied: Number(discountApplied.toFixed(2))
  };
}
```

#### B. Transactional Logging Service
A Node.js service ensuring ACID durability for activities. It integrates within Postgres database transaction operations (using a typical Knex.js or Prisma client transaction framework) to enforce that state modifications never succeed without their corresponding system events being recorded.

```typescript
import { SystemActivity } from '@/components/dashboard/AdminNotificationFeed';

export interface DbTransactionClient {
  query: (sql: string, params: any[]) => Promise<any>;
}

export class TransactionalLoggingService {
  /**
   * Safe transaction-level logger executing within active database locks
   * @param tx Transaction client object
   * @param log Record details to log
   */
  public static async logActivity(
    tx: DbTransactionClient,
    log: Omit<SystemActivity, 'id' | 'createdAt'>
  ): Promise<string> {
    const logId = `ACT-${Math.floor(100000 + Math.random() * 900000)}`;
    const createdAt = new Date().toISOString();

    const sql = `
      INSERT INTO system_activities (
        id, 
        user_id, 
        activity_type, 
        severity_level, 
        title, 
        description, 
        metadata, 
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id;
    `;

    const params = [
      logId,
      log.userId,
      log.activityType,
      log.severityLevel,
      log.title,
      log.description,
      JSON.stringify(log.metadata || {}),
      createdAt
    ];

    try {
      const result = await tx.query(sql, params);
      return result.rows[0].id;
    } catch (error) {
      console.error(`[CRITICAL] Transaction logging failed for action: ${log.activityType}`, error);
      // Re-throw inside active transaction block to trigger automatic rollbacks on failure!
      throw new Error(`Failed to commit transactional audit activity trace: ${(error as Error).message}`);
    }
  }
}
```

---

### 4. Interactive Frontend Admin Notification UI (React + Tailwind)

This system is live and fully integrated inside the application environment. It features:
* **Severity Alerts Grid**: Color-coded borders (`INFO` = Blue, `SUCCESS` = Green, `WARNING` = Amber, `CRITICAL` = Red).
* **Live Telemetry controls**: Built-in "Simulate Event" and manual synchronous database-polling controls.
* **Expanded Inspect Mode**: Displays rich dynamic context payloads in human-readable JSON formats.
* **Filter Toggles**: Real-time filtering across "All", "Sales", "Inventory", and "System Alerts".

You can open the **Reports** section of the live workspace to play interactively with this component.
