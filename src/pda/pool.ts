import { PublicKey } from "@solana/web3.js";
import { DEFAULT_PROGRAM_ID } from "../constants";

/**
 * Derive Pool PDA.
 *
 * Seeds: ["pool", base_mint, quote_mint, bin_step_bps_u16_le, base_fee_bps_u16_le]
 *
 * @param baseMint - Base token mint
 * @param quoteMint - Quote token mint
 * @param binStepBps - Bin step in basis points (u16)
 * @param baseFeeBps - Base fee in basis points (u16)
 * @param programId - Program ID (defaults to CipherDLMM mainnet)
 */
export function derivePoolPda(
  baseMint: PublicKey,
  quoteMint: PublicKey,
  binStepBps: number,
  baseFeeBps: number,
  programId: PublicKey = DEFAULT_PROGRAM_ID
): [PublicKey, number] {
  const binStepBuffer = Buffer.alloc(2);
  binStepBuffer.writeUInt16LE(binStepBps);

  const baseFeeBuffer = Buffer.alloc(2);
  baseFeeBuffer.writeUInt16LE(baseFeeBps);

  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("pool"),
      baseMint.toBuffer(),
      quoteMint.toBuffer(),
      binStepBuffer,
      baseFeeBuffer,
    ],
    programId
  );
}
