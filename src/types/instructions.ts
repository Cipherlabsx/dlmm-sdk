import { PublicKey } from "@solana/web3.js";
import type { DistributionStrategy } from "../math/distribution";

/** Priority level for compute budget */
export type PriorityLevel = "fast" | "turbo" | "ultra";

/** Add liquidity by strategy (high-level) */
export interface AddLiquidityByStrategyParams {
  user: PublicKey;
  positionNonce: bigint;
  totalBaseAmount: bigint;
  totalQuoteAmount: bigint;
  strategy: DistributionStrategy;
  decay?: number;
  minBinId: number;
  maxBinId: number;
  slippageBps?: number;
}

/** Add liquidity with explicit per-bin amounts */
export interface AddLiquidityParams {
  user: PublicKey;
  positionNonce: bigint;
  deposits: Array<{
    binIndex: number;
    baseAtoms: bigint;
    quoteAtoms: bigint;
    minSharesOut?: bigint;
  }>;
}

/** Remove liquidity from a position */
export interface RemoveLiquidityParams {
  user: PublicKey;
  position: PublicKey;
  /** Bins to withdraw from. If empty, withdraws from all active bins. */
  binIndices?: number[];
  /** Basis points to withdraw (10000 = 100%) */
  bpsPct?: number;
  /** If true, claim fees and close position after full withdrawal */
  shouldClaimAndClose?: boolean;
}

/** Swap parameters */
export interface SwapParams {
  user: PublicKey;
  amountIn: bigint;
  minAmountOut: bigint;
  swapForBase: boolean;
}

/** Swap quote result (client-side simulation) */
export interface SwapQuoteResult {
  amountOut: bigint;
  fee: bigint;
  priceImpactBps: number;
  binsUsed: number;
}

/** Initialize position */
export interface InitPositionParams {
  user: PublicKey;
  nonce: bigint;
}

/** Close position (must be empty) */
export interface ClosePositionParams {
  user: PublicKey;
  position: PublicKey;
}

/** Claim holder rewards */
export interface ClaimRewardsParams {
  user: PublicKey;
  pool?: PublicKey;
}

/** Claim NFT rewards */
export interface ClaimNftRewardsParams {
  user: PublicKey;
  nftMints: PublicKey[];
}
