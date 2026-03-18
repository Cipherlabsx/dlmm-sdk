import { PublicKey } from "@solana/web3.js";
import { DEFAULT_PROGRAM_ID } from "../constants";

/**
 * Derive LiquidityLock PDA (escrow/timelock).
 *
 * Seeds: ["lock", user, pool]
 */
export function deriveLiquidityLockPda(
  user: PublicKey,
  pool: PublicKey,
  programId: PublicKey = DEFAULT_PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("lock"), user.toBuffer(), pool.toBuffer()],
    programId
  );
}
