/**
 * Liquidity distribution strategies for CipherDLMM.
 * Determines how liquidity is spread across bins.
 */

/** Distribution strategy types */
export type DistributionStrategy =
  | "uniform"
  | "concentrated"
  | "skew_bid"
  | "skew_ask"
  | "bid-ask"
  | "curve"
  | "custom";

/** Per-bin allocation result (in atoms) */
export type BinAllocation = {
  binIndex: number;
  baseAtoms: bigint;
  quoteAtoms: bigint;
};

/** Distribution validation result */
export type ValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
  deposits: BinAllocation[];
};

// ── Helpers ──

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

function sum(arr: number[]): number {
  let s = 0;
  for (const v of arr) s += v;
  return s;
}

function normalizeWeights(weights: number[]): number[] {
  const s = sum(weights);
  if (!Number.isFinite(s) || s <= 0) return weights.map(() => 0);
  return weights.map((x) => x / s);
}

function weightsGaussian(numBins: number, sigma: number, shift = 0): number[] {
  if (numBins <= 1) return [1];
  const mid = (numBins - 1) / 2 + shift;
  const s = Math.max(0.85, sigma);
  const weights = Array.from({ length: numBins }, (_, i) => {
    const x = (i - mid) / s;
    return Math.exp(-0.5 * x * x);
  });
  return normalizeWeights(weights);
}

// ── Weight Functions ──

/** Equal weight across all bins */
export function weightsUniform(numBins: number): number[] {
  if (numBins <= 0) return [];
  return normalizeWeights(Array.from({ length: numBins }, () => 1));
}

/** Symmetric bell curve */
export function weightsBalanced(numBins: number): number[] {
  return weightsGaussian(numBins, Math.max(1, numBins / 6), 0);
}

/** Tight bell curve (decay controls falloff: 0 = flat, 1 = tight) */
export function weightsConcentrated(numBins: number, decay: number): number[] {
  if (numBins <= 1) return [1];
  const center = Math.floor(numBins / 2);
  const weights = Array.from({ length: numBins }, (_, i) => {
    const distance = Math.abs(i - center);
    return Math.pow(1 - clamp01(decay), distance);
  });
  return normalizeWeights(weights);
}

/** More weight on bid (lower price) side */
export function weightsSkewBid(numBins: number, decay: number): number[] {
  if (numBins <= 1) return [1];
  const shift = -Math.max(0.6, numBins * 0.06);
  const base = weightsGaussian(numBins, Math.max(1, numBins / 5.4), shift);
  const p = 1.5 + clamp01(decay) * 1.5;
  const weights = base.map((x, i) => {
    const t = numBins <= 1 ? 1 : (numBins - 1 - i) / (numBins - 1);
    return x * Math.pow(0.35 + 0.65 * t, p);
  });
  return normalizeWeights(weights);
}

/** More weight on ask (higher price) side */
export function weightsSkewAsk(numBins: number, decay: number): number[] {
  if (numBins <= 1) return [1];
  const shift = Math.max(0.6, numBins * 0.06);
  const base = weightsGaussian(numBins, Math.max(1, numBins / 5.4), shift);
  const p = 1.5 + clamp01(decay) * 1.5;
  const weights = base.map((x, i) => {
    const t = numBins <= 1 ? 1 : i / (numBins - 1);
    return x * Math.pow(0.35 + 0.65 * t, p);
  });
  return normalizeWeights(weights);
}

/** U-shaped: high edges, low center (100x ratio) */
export function weightsBidAsk(numBins: number): number[] {
  if (numBins <= 2) return normalizeWeights(Array.from({ length: numBins }, () => 1));
  const mid = (numBins - 1) / 2;
  const denom = Math.max(1, mid);
  const weights = Array.from({ length: numBins }, (_, i) => {
    const d = Math.abs(i - mid) / denom;
    return Math.pow(0.10 + 0.90 * d, 2.15);
  });
  return normalizeWeights(weights);
}

/** Wide bell curve */
export function weightsCurve(numBins: number): number[] {
  return weightsGaussian(numBins, Math.max(1.2, numBins / 4.6), 0);
}

/**
 * Calculate distribution weights for a given strategy.
 *
 * @param strategy - Distribution strategy name
 * @param numBins - Total number of bins
 * @param decay - Decay factor (0..1) for concentrated/skew strategies
 * @returns Normalized weights (sum = 1)
 */
export function calculateDistributionWeights(
  strategy: DistributionStrategy | string,
  numBins: number,
  decay: number
): number[] {
  switch (strategy) {
    case "uniform": return weightsUniform(numBins);
    case "concentrated": return weightsConcentrated(numBins, decay);
    case "skew_bid": return weightsSkewBid(numBins, decay);
    case "skew_ask": return weightsSkewAsk(numBins, decay);
    case "bid-ask": return weightsBidAsk(numBins);
    case "curve": return weightsCurve(numBins);
    case "custom": return weightsConcentrated(numBins, decay);
    default: return weightsUniform(numBins);
  }
}

// ── Allocation ──

/**
 * Allocate token amounts to bins based on distribution weights.
 *
 * - Bins < activeBin get QUOTE only
 * - Bins > activeBin get BASE only
 * - Active bin is excluded
 * - Remainder atoms distributed to first N bins (no loss)
 */
export function allocateToBins(
  binIndices: number[],
  weights: number[],
  baseAtoms: bigint,
  quoteAtoms: bigint,
  activeBin: number
): BinAllocation[] {
  if (binIndices.length !== weights.length) {
    throw new Error(`Bins/weights length mismatch: ${binIndices.length} vs ${weights.length}`);
  }
  if (binIndices.length === 0) return [];

  const leftBins: Array<{ index: number; weight: number }> = [];
  const rightBins: Array<{ index: number; weight: number }> = [];

  binIndices.forEach((binIndex, i) => {
    const weight = weights[i] || 0;
    if (binIndex < activeBin) leftBins.push({ index: binIndex, weight });
    else if (binIndex > activeBin) rightBins.push({ index: binIndex, weight });
  });

  const leftWeights = normalizeWeights(leftBins.map((b) => b.weight));
  const rightWeights = normalizeWeights(rightBins.map((b) => b.weight));
  const allocations: BinAllocation[] = [];

  // Quote to left side
  if (leftBins.length > 0 && quoteAtoms > 0n) {
    const quoteAllocs: BinAllocation[] = leftBins.map((bin, i) => ({
      binIndex: bin.index,
      baseAtoms: 0n,
      quoteAtoms: BigInt(Math.floor(Number(quoteAtoms) * leftWeights[i])),
    }));
    let remainder = quoteAtoms - quoteAllocs.reduce((s, a) => s + a.quoteAtoms, 0n);
    for (let j = 0; remainder > 0n && j < quoteAllocs.length; j++) {
      quoteAllocs[j].quoteAtoms += 1n;
      remainder -= 1n;
    }
    allocations.push(...quoteAllocs);
  }

  // Base to right side
  if (rightBins.length > 0 && baseAtoms > 0n) {
    const baseAllocs: BinAllocation[] = rightBins.map((bin, i) => ({
      binIndex: bin.index,
      baseAtoms: BigInt(Math.floor(Number(baseAtoms) * rightWeights[i])),
      quoteAtoms: 0n,
    }));
    let remainder = baseAtoms - baseAllocs.reduce((s, a) => s + a.baseAtoms, 0n);
    for (let j = 0; remainder > 0n && j < baseAllocs.length; j++) {
      baseAllocs[j].baseAtoms += 1n;
      remainder -= 1n;
    }
    allocations.push(...baseAllocs);
  }

  allocations.sort((a, b) => a.binIndex - b.binIndex);
  return allocations;
}

// ── Validation ──

/**
 * Validate distribution: filter zero-atom bins, check sums, detect duplicates.
 */
export function validateDistribution(
  allocations: BinAllocation[],
  expectedBase: bigint,
  expectedQuote: bigint
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const invalidBins = allocations.filter((a) => a.baseAtoms > 0n && a.quoteAtoms > 0n);
  if (invalidBins.length > 0) {
    errors.push(`${invalidBins.length} bins have both base and quote`);
  }

  const deposits = allocations.filter((a) => a.baseAtoms > 0n || a.quoteAtoms > 0n);
  const zeroCount = allocations.length - deposits.length;
  if (zeroCount > 0) {
    warnings.push(`Filtered ${zeroCount} zero-atom bins (rounding). Use larger amounts or fewer bins.`);
  }

  if (deposits.length === 0) {
    errors.push("All bins rounded to zero atoms. Amount too small for bin count.");
  }

  const totalBase = deposits.reduce((s, d) => s + d.baseAtoms, 0n);
  const totalQuote = deposits.reduce((s, d) => s + d.quoteAtoms, 0n);
  const maxTolerance = BigInt(allocations.length * 10);

  const baseDiff = totalBase > expectedBase ? totalBase - expectedBase : expectedBase - totalBase;
  const quoteDiff = totalQuote > expectedQuote ? totalQuote - expectedQuote : expectedQuote - totalQuote;

  if (baseDiff > maxTolerance) {
    errors.push(`Base sum mismatch: expected ${expectedBase}, got ${totalBase}`);
  }
  if (quoteDiff > maxTolerance) {
    errors.push(`Quote sum mismatch: expected ${expectedQuote}, got ${totalQuote}`);
  }

  const uniqueBins = new Set(deposits.map((d) => d.binIndex));
  if (uniqueBins.size !== deposits.length) {
    errors.push("Duplicate bin indices detected");
  }

  return { valid: errors.length === 0, errors, warnings, deposits };
}
