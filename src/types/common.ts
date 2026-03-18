import { PublicKey } from "@solana/web3.js";

/** SDK configuration options */
export interface CipherDlmmConfig {
  /** Program ID (defaults to mainnet CipherDLMM) */
  programId?: PublicKey;
  /** Address Lookup Table for smaller transactions */
  altAddress?: PublicKey;
  /** Compute unit price in microlamports */
  computeUnitPrice?: number;
  /** Compute unit limit */
  computeUnitLimit?: number;
}
