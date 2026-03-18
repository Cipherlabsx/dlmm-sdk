import { PublicKey } from "@solana/web3.js";

/** Fee configuration for a pool */
export interface FeeConfig {
  baseFeeBps: number;
  creatorCutBps: number;
  holdersCutBps: number;
  nftCutBps: number;
  protocolCutBps: number;
}

/** Decoded on-chain Pool account */
export interface PoolState {
  address: PublicKey;
  baseMint: PublicKey;
  quoteMint: PublicKey;
  baseVault: PublicKey;
  quoteVault: PublicKey;
  protocolFeeVault: PublicKey;
  creatorFeeVault: PublicKey;
  holdersFeeVault: PublicKey;
  nftFeeVault: PublicKey;
  binStepBps: number;
  baseFeeBps: number;
  activeBinId: number;
  activeBinPrice: bigint;
  admin: PublicKey;
  creator: PublicKey;
  configAuthority: PublicKey;
  pauseGuardian: PublicKey;
  feeWithdrawAuthority: PublicKey;
  feeConfig: FeeConfig;
  pausedBits: number;
  baseDecimals: number;
  quoteDecimals: number;
}

/** Single bin within a BinArray */
export interface CompactBin {
  binIndex: number;
  baseReserve: bigint;
  quoteReserve: bigint;
  totalShares: bigint;
  feeBaseAccrued: bigint;
  feeQuoteAccrued: bigint;
}

/** Decoded on-chain BinArray account (holds 64 bins) */
export interface BinArrayState {
  address: PublicKey;
  pool: PublicKey;
  lowerBinIndex: number;
  bins: CompactBin[];
}
