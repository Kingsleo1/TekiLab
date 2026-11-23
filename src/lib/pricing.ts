import { Product } from '../types/pharmacy';

/**
 * Calculates correct unit and total price for a cart item based on:
 * - Packaging unit (Full Pack, Half Pack, Quarter Pack)
 * - Checkout mode (Retail vs. Wholesale)
 * - Bulk volume discount quantity thresholds
 */
export function calculateItemPrice(item: {
  productId: string;
  quantity: number;
  packageSize: 'Full Pack' | 'Half Pack' | 'Quarter Pack';
  saleType: 'Retail' | 'Wholesale';
}, product: Product): {
  unitPrice: number;
  totalPrice: number;
  retailUnitPrice: number;
  wholesaleUnitPrice: number;
  appliedTier: 'Retail' | 'Wholesale' | 'Volume Price';
} {
  const sizeKey = item.packageSize === 'Full Pack' 
    ? 'fullPack' 
    : item.packageSize === 'Half Pack' 
      ? 'halfPack' 
      : 'quarterPack';
  
  let retailPrice = 0;
  let wholesalePrice = 0;
  let volumePrice = 0;
  let volumeThreshold = 10;

  // Evaluate explicit pricing configs if set on the product
  if (product.packagingPricing && product.packagingPricing[sizeKey]) {
    const config = product.packagingPricing[sizeKey]!;
    retailPrice = Number(config.retailPrice) || product.price;
    wholesalePrice = Number(config.wholesalePrice) || (product.wholesalePrice ? Number(product.wholesalePrice) : retailPrice * 0.85);
    volumePrice = Number(config.volumePrice) || wholesalePrice * 0.9;
    volumeThreshold = Number(config.volumeThreshold) || 10;
  } else {
    const basePrice = Number(product.price) || 0;
    const baseWholesale =
      product.wholesalePrice && Number(product.wholesalePrice) > 0
        ? Number(product.wholesalePrice)
        : basePrice * 0.85;

    if (item.packageSize === 'Full Pack') {
      retailPrice = basePrice;
      wholesalePrice = baseWholesale;
      volumePrice = baseWholesale * 0.9;
      volumeThreshold = 10;
    } else if (item.packageSize === 'Half Pack') {
      retailPrice = basePrice * 0.55;
      wholesalePrice = baseWholesale * 0.55;
      volumePrice = baseWholesale * 0.48;
      volumeThreshold = 15;
    } else { // Quarter Pack
      retailPrice = basePrice * 0.30;
      wholesalePrice = baseWholesale * 0.30;
      volumePrice = baseWholesale * 0.25;
      volumeThreshold = 20;
    }
  }

  retailPrice = Math.round(retailPrice * 100) / 100;
  wholesalePrice = Math.round(wholesalePrice * 100) / 100;

  // Determine initial pricing based on saleType
  let finalUnitPrice = item.saleType === 'Wholesale' ? wholesalePrice : retailPrice;
  let appliedTier: 'Retail' | 'Wholesale' | 'Volume Price' = item.saleType === 'Wholesale' ? 'Wholesale' : 'Retail';

  // Apply volume discount if quantity meets or exceeds threshold
  if (item.quantity >= volumeThreshold && volumePrice > 0) {
    if (volumePrice < finalUnitPrice) {
      finalUnitPrice = volumePrice;
      appliedTier = 'Volume Price';
    }
  }

  // Round values nicely
  finalUnitPrice = Math.round(finalUnitPrice * 100) / 100;
  const totalPrice = Math.round((finalUnitPrice * item.quantity) * 100) / 100;

  return {
    unitPrice: finalUnitPrice,
    totalPrice,
    retailUnitPrice: retailPrice,
    wholesaleUnitPrice: wholesalePrice,
    appliedTier
  };
}
