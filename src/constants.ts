import { PublicKey } from "@solana/web3.js";

/** Default CipherDLMM program ID on Solana mainnet */
export const DEFAULT_PROGRAM_ID = new PublicKey(
  "Fn3fA3fjsmpULNL7E9U79jKTe1KHxPtQeWdURCbJXCnM"
);

/** Number of bins per BinArray account */
export const BIN_ARRAY_SIZE = 64;

/** Maximum bins per add_liquidity_batch transaction */
export const MAX_BINS_PER_TX = 32;

/** Heap frame required by the program (256KB) */
export const REQUIRED_HEAP_BYTES = 262144;

/** Known token mints */
export const KNOWN_MINTS = {
  CIPHER: new PublicKey("Ciphern9cCXtms66s8Mm6wCFC27b2JProRQLYmiLMH3N"),
  USDC: new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
  SOL: new PublicKey("So11111111111111111111111111111111111111112"),
} as const;

/** Valid bin step values (basis points) */
export const VALID_BIN_STEPS = [
  1, 2, 4, 5, 8, 10, 15, 16, 20, 25, 30, 50,
  75, 80, 100, 125, 150, 160, 200, 250, 300, 400,
] as const;
