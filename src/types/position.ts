import { PublicKey } from "@solana/web3.js";

/** Decoded on-chain Position account */
export interface PositionState {
  address: PublicKey;
  pool: PublicKey;
  owner: PublicKey;
  nonce: bigint;
}

/** Decoded on-chain PositionBin account */
export interface PositionBinState {
  address: PublicKey;
  position: PublicKey;
  pool: PublicKey;
  binIndex: number;
  shares: bigint;
  entryBaseReserve: bigint;
  entryQuoteReserve: bigint;
}

/** User position with enriched data */
export interface UserPosition {
  position: PositionState;
  bins: PositionBinState[];
  /** Total base tokens across all bins (atoms) */
  totalBaseAtoms: bigint;
  /** Total quote tokens across all bins (atoms) */
  totalQuoteAtoms: bigint;
  /** USD value (null if prices unavailable) */
  totalValueUsd: number | null;
}

/** Active bin info */
export interface ActiveBin {
  binId: number;
  price: number;
  priceQ64_64: bigint;
}
