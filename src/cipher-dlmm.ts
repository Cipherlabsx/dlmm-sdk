/**
 * CipherDlmm — Main SDK class for interacting with CipherDLMM pools.
 *
 * Mirrors the @meteora-ag/dlmm DLMM class API for familiarity.
 * All write methods return unsigned VersionedTransactions.
 */

import { Connection, PublicKey, VersionedTransaction } from "@solana/web3.js";
import { DEFAULT_PROGRAM_ID } from "./constants";
import { fetchPool } from "./accounts/pool";
import { fetchBinArraysForRange, fetchAllBinArrays } from "./accounts/bin-array";
import { fetchPositions, fetchAllUserPositions } from "./accounts/position";
import { buildTransaction } from "./transactions/builder";
import { buildAddLiquidityIxs } from "./instructions/add-liquidity";
import { buildRemoveLiquidityIx } from "./instructions/remove-liquidity";
import { buildSwapIxs } from "./instructions/swap";
import { buildInitPositionIx, buildClosePositionIx } from "./instructions/position";
import { buildClaimHolderRewardsIxs, buildInitHolderStateIx } from "./instructions/rewards";
import { calculateDistributionWeights, allocateToBins } from "./math/distribution";
import { q64_64ToDecimal } from "./math/price";
import type { PoolState, BinArrayState } from "./types/pool";
import type { UserPosition, ActiveBin } from "./types/position";
import type {
  AddLiquidityByStrategyParams,
  RemoveLiquidityParams,
  SwapParams,
  CipherDlmmConfig,
} from "./types";

export class CipherDlmm {
  readonly connection: Connection;
  readonly poolAddress: PublicKey;
  readonly programId: PublicKey;
  private _pool: PoolState | null = null;

  private constructor(
    connection: Connection,
    poolAddress: PublicKey,
    programId: PublicKey,
    pool: PoolState
  ) {
    this.connection = connection;
    this.poolAddress = poolAddress;
    this.programId = programId;
    this._pool = pool;
  }

  /** Pool state (cached — call refetch() to update) */
  get pool(): PoolState {
    if (!this._pool) throw new Error("Pool not loaded. Call refetch().");
    return this._pool;
  }

  // ── Factory ──

  /** Create a CipherDlmm instance for a pool */
  static async create(
    connection: Connection,
    poolAddress: PublicKey,
    config?: CipherDlmmConfig
  ): Promise<CipherDlmm> {
    const programId = config?.programId ?? DEFAULT_PROGRAM_ID;
    const pool = await fetchPool(connection, poolAddress, programId);
    return new CipherDlmm(connection, poolAddress, programId, pool);
  }

  /** Refresh pool state from chain */
  async refetch(): Promise<void> {
    this._pool = await fetchPool(this.connection, this.poolAddress, this.programId);
  }

  // ── Read-only ──

  /** Get the active bin ID and price */
  getActiveBin(): ActiveBin {
    const pool = this.pool;
    const price = q64_64ToDecimal(pool.activeBinPrice, pool.baseDecimals, pool.quoteDecimals);
    return {
      binId: pool.activeBinId,
      price,
      priceQ64_64: pool.activeBinPrice,
    };
  }

  /** Fetch BinArrays for a bin range */
  async getBinArrays(minBinId?: number, maxBinId?: number): Promise<BinArrayState[]> {
    if (minBinId !== undefined && maxBinId !== undefined) {
      return fetchBinArraysForRange(this.connection, this.poolAddress, minBinId, maxBinId, this.programId);
    }
    return fetchAllBinArrays(this.connection, this.poolAddress, this.programId);
  }

  /** Fetch all positions for a user on this pool */
  async getPositionsByUser(user: PublicKey): Promise<UserPosition[]> {
    return fetchPositions(this.connection, user, this.poolAddress, this.programId);
  }

  /** Fetch all positions for a user across ALL pools */
  static async getAllPositionsByUser(
    connection: Connection,
    user: PublicKey,
    config?: CipherDlmmConfig
  ): Promise<UserPosition[]> {
    return fetchAllUserPositions(connection, user, config?.programId ?? DEFAULT_PROGRAM_ID);
  }

  // ── Write (returns unsigned VersionedTransaction[]) ──

  /**
   * Add liquidity using a distribution strategy.
   * Automatically splits into multiple transactions if >32 bins.
   */
  async addLiquidityByStrategy(
    params: AddLiquidityByStrategyParams
  ): Promise<VersionedTransaction[]> {
    const pool = this.pool;

    // Calculate bin range
    const binIndices: number[] = [];
    for (let i = params.minBinId; i <= params.maxBinId; i++) {
      if (i !== pool.activeBinId) binIndices.push(i); // Active bin excluded
    }

    // Calculate weights
    const weights = calculateDistributionWeights(
      params.strategy,
      binIndices.length,
      params.decay ?? 0.3
    );

    // Allocate to bins
    const allocations = allocateToBins(
      binIndices,
      weights,
      params.totalBaseAmount,
      params.totalQuoteAmount,
      pool.activeBinId
    );

    // Filter zero-amount bins
    const nonZero = allocations.filter((a) => a.baseAtoms > 0n || a.quoteAtoms > 0n);
    if (nonZero.length === 0) throw new Error("All bins rounded to zero. Use larger amounts.");

    // Build instruction chunks
    const ixChunks = await buildAddLiquidityIxs(
      this.connection,
      this.poolAddress,
      params.user,
      params.positionNonce,
      nonZero,
      this.programId
    );

    // Build transactions
    const txs: VersionedTransaction[] = [];
    for (const ixs of ixChunks) {
      const { transaction } = await buildTransaction(this.connection, {
        payer: params.user,
        instructions: ixs,
      });
      txs.push(transaction);
    }

    return txs;
  }

  /** Remove liquidity from a position */
  async removeLiquidity(params: RemoveLiquidityParams): Promise<VersionedTransaction> {
    // If no specific bins, fetch all position bins
    let withdrawals: Array<{ binIndex: number; shares: bigint }>;

    if (params.binIndices && params.binIndices.length > 0) {
      // Specific bins requested — fetch position to get shares
      const positions = await this.getPositionsByUser(params.user);
      const pos = positions.find((p) => p.position.address.equals(params.position));
      if (!pos) throw new Error("Position not found");

      withdrawals = params.binIndices.map((binIndex) => {
        const bin = pos.bins.find((b) => b.binIndex === binIndex);
        if (!bin) throw new Error(`Bin ${binIndex} not found in position`);
        const shares = params.bpsPct ? (bin.shares * BigInt(params.bpsPct)) / 10000n : bin.shares;
        return { binIndex, shares };
      });
    } else {
      // Withdraw from all bins
      const positions = await this.getPositionsByUser(params.user);
      const pos = positions.find((p) => p.position.address.equals(params.position));
      if (!pos) throw new Error("Position not found");

      withdrawals = pos.bins
        .filter((b) => b.shares > 0n)
        .map((b) => ({
          binIndex: b.binIndex,
          shares: params.bpsPct ? (b.shares * BigInt(params.bpsPct)) / 10000n : b.shares,
        }));
    }

    if (withdrawals.length === 0) throw new Error("No bins to withdraw from");

    const ix = await buildRemoveLiquidityIx(
      this.connection,
      this.poolAddress,
      params.user,
      params.position,
      withdrawals,
      this.programId
    );

    const { transaction } = await buildTransaction(this.connection, {
      payer: params.user,
      instructions: [ix],
    });

    return transaction;
  }

  /** Execute a swap */
  async swap(params: SwapParams): Promise<VersionedTransaction> {
    const ixs = await buildSwapIxs(
      this.connection,
      this.poolAddress,
      params,
      this.programId
    );

    const { transaction } = await buildTransaction(this.connection, {
      payer: params.user,
      instructions: ixs,
    });

    return transaction;
  }

  /** Initialize a new position */
  async initializePosition(user: PublicKey, nonce: bigint): Promise<VersionedTransaction> {
    const ix = await buildInitPositionIx(
      this.connection,
      this.poolAddress,
      user,
      nonce,
      this.programId
    );

    const { transaction } = await buildTransaction(this.connection, {
      payer: user,
      instructions: [ix],
    });

    return transaction;
  }

  /** Close an empty position */
  async closePosition(user: PublicKey, position: PublicKey): Promise<VersionedTransaction> {
    const ix = await buildClosePositionIx(
      this.connection,
      this.poolAddress,
      user,
      position,
      this.programId
    );

    const { transaction } = await buildTransaction(this.connection, {
      payer: user,
      instructions: [ix],
    });

    return transaction;
  }

  /** Claim holder rewards (USDC) */
  async claimHolderRewards(user: PublicKey): Promise<VersionedTransaction> {
    const ixs = await buildClaimHolderRewardsIxs(
      this.connection,
      user,
      this.poolAddress,
      this.programId
    );

    const { transaction } = await buildTransaction(this.connection, {
      payer: user,
      instructions: ixs,
    });

    return transaction;
  }

  /** Initialize holder state (required before first claim) */
  async initHolderState(user: PublicKey): Promise<VersionedTransaction> {
    const ix = await buildInitHolderStateIx(
      this.connection,
      user,
      this.programId
    );

    const { transaction } = await buildTransaction(this.connection, {
      payer: user,
      instructions: [ix],
    });

    return transaction;
  }
}
