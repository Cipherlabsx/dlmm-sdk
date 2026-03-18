import { PublicKey } from "@solana/web3.js";
import { DEFAULT_PROGRAM_ID } from "../constants";

/**
 * Derive Position PDA.
 *
 * Seeds: ["position", pool, owner, nonce_u64_le]
 *
 * @param pool - Pool public key
 * @param owner - Owner public key
 * @param nonce - Position nonce (u64)
 * @param programId - Program ID (defaults to CipherDLMM mainnet)
 */
export function derivePositionPda(
  pool: PublicKey,
  owner: PublicKey,
  nonce: bigint,
  programId: PublicKey = DEFAULT_PROGRAM_ID
): [PublicKey, number] {
  const nonceBuffer = Buffer.allocUnsafe(8);
  nonceBuffer.writeBigUInt64LE(nonce, 0);

  return PublicKey.findProgramAddressSync(
    [Buffer.from("position"), pool.toBuffer(), owner.toBuffer(), nonceBuffer],
    programId
  );
}

/**
 * Derive PositionBin PDA (links Position to a specific bin).
 *
 * Seeds: ["position_bin", position, bin_index_i32_le]
 *
 * CRITICAL: Uses i32 (4 bytes) for bin_index seed to match the Rust program.
 *
 * @param position - Position public key
 * @param binIndexI32 - Bin index as signed i32
 * @param programId - Program ID (defaults to CipherDLMM mainnet)
 */
export function derivePositionBinPda(
  position: PublicKey,
  binIndexI32: number,
  programId: PublicKey = DEFAULT_PROGRAM_ID
): [PublicKey, number] {
  if (binIndexI32 < -2147483648 || binIndexI32 > 2147483647) {
    throw new Error(`Bin index ${binIndexI32} out of i32 range`);
  }

  const binIndexBuffer = Buffer.allocUnsafe(4);
  binIndexBuffer.writeInt32LE(binIndexI32, 0);

  return PublicKey.findProgramAddressSync(
    [Buffer.from("position_bin"), position.toBuffer(), binIndexBuffer],
    programId
  );
}
