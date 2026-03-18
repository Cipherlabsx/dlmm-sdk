// @orbitfinance/dlmm — Orbit Finance DLMM SDK for Solana

// Main class
export { CipherDlmm } from "./cipher-dlmm";

// Constants
export {
  DEFAULT_PROGRAM_ID,
  BIN_ARRAY_SIZE,
  MAX_BINS_PER_TX,
  REQUIRED_HEAP_BYTES,
  KNOWN_MINTS,
  VALID_BIN_STEPS,
} from "./constants";

// PDA derivation
export {
  getBinArrayLowerIndex,
  getBinOffsetInArray,
  deriveBinArrayPda,
  groupBinsByArray,
  getUniqueBinArrayPdas,
  derivePoolPda,
  derivePositionPda,
  derivePositionBinPda,
  deriveLiquidityLockPda,
  deriveHolderGlobalStatePda,
  deriveNftGlobalStatePda,
  deriveUserHolderStatePda,
  deriveUserNftStatePda,
  derivePoolAuthorityPda,
  canonicalBinIndexU64,
  decodeBinIndexSigned,
} from "./pda";

// Math
export {
  type PriceQ64_64,
  calculatePriceQ64_64,
  q64_64ToDecimal,
  calculateRelativePrice,
  binIdToPrice,
  priceToBinId,
  estimatePriceRange,
} from "./math";

// Distribution strategies
export {
  type DistributionStrategy,
  type BinAllocation,
  type ValidationResult,
  weightsUniform,
  weightsBalanced,
  weightsConcentrated,
  weightsSkewBid,
  weightsSkewAsk,
  weightsBidAsk,
  weightsCurve,
  calculateDistributionWeights,
  allocateToBins,
  validateDistribution,
} from "./math";

// Account fetching
export {
  createReadOnlyProgram,
  fetchPool,
  fetchAllPools,
  fetchBinArraysForRange,
  fetchAllBinArrays,
  fetchPositions,
  fetchAllUserPositions,
} from "./accounts";

// Transaction building
export {
  buildTransaction,
  type BuildTransactionOptions,
} from "./transactions";

// Types
export type {
  FeeConfig,
  PoolState,
  CompactBin,
  BinArrayState,
  PositionState,
  PositionBinState,
  UserPosition,
  ActiveBin,
  PriorityLevel,
  AddLiquidityByStrategyParams,
  AddLiquidityParams,
  RemoveLiquidityParams,
  SwapParams,
  SwapQuoteResult,
  InitPositionParams,
  ClosePositionParams,
  ClaimRewardsParams,
  ClaimNftRewardsParams,
  CipherDlmmConfig,
} from "./types";

// Instruction builders
export {
  buildAddLiquidityIxs,
  buildRemoveLiquidityIx,
  buildSwapIxs,
  buildInitPositionIx,
  buildClosePositionIx,
  buildSyncHolderStakeIx,
  buildClaimHolderRewardsIxs,
  buildInitHolderStateIx,
} from "./instructions";

// Errors
export {
  CIPHER_DLMM_ERRORS,
  CipherDlmmError,
  parseProgramError,
} from "./errors";
