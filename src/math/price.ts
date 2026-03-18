/**
 * Price conversion utilities for CipherDLMM.
 *
 * Q64.64 fixed-point format: price = (quoteAtoms << 64) / baseAtoms
 */

/** Q64.64 fixed-point price (bigint) */
export type PriceQ64_64 = bigint;

/**
 * Convert decimal price to Q64.64 fixed-point format.
 *
 * @param price - Decimal price (e.g., 6.35 for "6.35 USDC per CIPHER")
 * @param baseDecimals - Base token decimals (e.g., 9 for CIPHER)
 * @param quoteDecimals - Quote token decimals (e.g., 6 for USDC)
 *
 * @example
 * calculatePriceQ64_64(6.35, 9, 6) // => 117187505469792690n
 */
export function calculatePriceQ64_64(
  price: number,
  baseDecimals: number,
  quoteDecimals: number
): PriceQ64_64 {
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error(`Price must be positive, got ${price}`);
  }
  if (baseDecimals < 0 || baseDecimals > 18) {
    throw new Error(`baseDecimals must be 0-18, got ${baseDecimals}`);
  }
  if (quoteDecimals < 0 || quoteDecimals > 18) {
    throw new Error(`quoteDecimals must be 0-18, got ${quoteDecimals}`);
  }

  const quoteAtoms = BigInt(Math.floor(price * 10 ** quoteDecimals));
  const baseAtoms = BigInt(10 ** baseDecimals);
  return (quoteAtoms << 64n) / baseAtoms;
}

/**
 * Convert Q64.64 fixed-point price back to decimal.
 *
 * @example
 * q64_64ToDecimal(117187505469792690n, 9, 6) // => ~6.35
 */
export function q64_64ToDecimal(
  priceQ64_64: PriceQ64_64,
  baseDecimals: number,
  quoteDecimals: number
): number {
  const baseAtoms = BigInt(10 ** baseDecimals);
  const quoteAtomsPerUnit = BigInt(10 ** quoteDecimals);
  const shiftedQuote = priceQ64_64 * baseAtoms;
  const quoteAtoms = shiftedQuote >> 64n;
  return Number(quoteAtoms) / Number(quoteAtomsPerUnit);
}

/**
 * Calculate relative price between two tokens using USD prices.
 *
 * @returns quote tokens per 1 base token
 *
 * @example
 * calculateRelativePrice(6.35, 100) // => 0.0635 (CIPHER/SOL)
 */
export function calculateRelativePrice(
  basePriceUsd: number,
  quotePriceUsd: number
): number {
  if (!Number.isFinite(basePriceUsd) || basePriceUsd <= 0) {
    throw new Error(`basePriceUsd must be positive, got ${basePriceUsd}`);
  }
  if (!Number.isFinite(quotePriceUsd) || quotePriceUsd <= 0) {
    throw new Error(`quotePriceUsd must be positive, got ${quotePriceUsd}`);
  }
  return basePriceUsd / quotePriceUsd;
}

/**
 * Calculate price from bin ID and bin step.
 *
 * @param binId - Signed bin index
 * @param binStepBps - Bin step in basis points
 * @returns Price multiplier relative to bin 0
 *
 * @example
 * binIdToPrice(100, 10) // => ~1.01005 (100 bins at 0.1% each)
 */
export function binIdToPrice(binId: number, binStepBps: number): number {
  const stepFactor = 1 + binStepBps / 10_000;
  return Math.pow(stepFactor, binId);
}

/**
 * Calculate bin ID from price and bin step.
 *
 * @param price - Price relative to bin 0
 * @param binStepBps - Bin step in basis points
 * @returns Nearest bin ID (signed integer)
 */
export function priceToBinId(price: number, binStepBps: number): number {
  if (price <= 0) throw new Error("Price must be positive");
  const stepFactor = 1 + binStepBps / 10_000;
  return Math.round(Math.log(price) / Math.log(stepFactor));
}

/**
 * Estimate price range from bin configuration.
 *
 * @param initialPrice - Starting price (decimal)
 * @param binStepBps - Bin step in basis points
 * @param numBins - Total number of bins in range
 */
export function estimatePriceRange(
  initialPrice: number,
  binStepBps: number,
  numBins: number
): { minPrice: number; maxPrice: number } {
  if (initialPrice <= 0 || binStepBps <= 0 || numBins <= 0) {
    throw new Error("All parameters must be positive");
  }
  const multiplier = 1 + binStepBps / 10_000;
  const halfBins = Math.floor(numBins / 2);
  return {
    minPrice: initialPrice * Math.pow(multiplier, -halfBins),
    maxPrice: initialPrice * Math.pow(multiplier, halfBins),
  };
}
