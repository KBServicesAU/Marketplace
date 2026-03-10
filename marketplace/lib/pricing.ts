/**
 * Calculate the selling price from cost price and a margin percentage.
 * Result is rounded up to the nearest cent.
 *
 * @example calculateSellingPrice(10.00, 30) // → 13.00
 */
export function calculateSellingPrice(costPrice: number, marginPct: number): number {
  const raw = costPrice * (1 + marginPct / 100)
  return Math.ceil(raw * 100) / 100
}

/**
 * Format a number as AUD currency string.
 */
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
  }).format(amount)
}

/**
 * Calculate total shipping for a cart.
 * Each unique supplier contributes its flat shipping rate once.
 */
export function calculateShipping(
  supplierShippingRates: Record<string, number>
): number {
  return Object.values(supplierShippingRates).reduce((sum, rate) => sum + rate, 0)
}
