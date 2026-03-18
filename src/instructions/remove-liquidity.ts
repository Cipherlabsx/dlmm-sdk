/**
 * Remove liquidity instruction builder.
 */

import {
  Connection,
  PublicKey,
  TransactionInstruction,
} from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from "@solana/spl-token";
import BN from "bn.js";
import { DEFAULT_PROGRAM_ID } from "../constants";
import { createReadOnlyProgram } from "../accounts/pool";
import {
  deriveBinArrayPda,
  derivePositionBinPda,
  getBinArrayLowerIndex,
  canonicalBinIndexU64,
} from "../pda";

/**
 * Build remove_liquidity instruction.
 *
 * @param connection - Solana connection
 * @param poolAddress - Pool address
 * @param user - User public key
 * @param position - Position public key
 * @param withdrawals - Array of { binIndex, shares } to withdraw
 * @param programId - Program ID
 * @returns Withdrawal instruction
 */
export async function buildRemoveLiquidityIx(
  connection: Connection,
  poolAddress: PublicKey,
  user: PublicKey,
  position: PublicKey,
  withdrawals: Array<{ binIndex: number; shares: bigint }>,
  programId: PublicKey = DEFAULT_PROGRAM_ID
): Promise<TransactionInstruction> {
  if (withdrawals.length === 0) {
    throw new Error("No withdrawals specified");
  }

  const program = createReadOnlyProgram(connection, programId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const poolAccount = await (program.account as any).pool.fetch(poolAddress);

  // Build withdrawal entries
  const withdrawalEntries = withdrawals.map((w) => ({
    binIndex: new BN(canonicalBinIndexU64(w.binIndex).toString()),
    shares: new BN(w.shares.toString()),
  }));

  // Build remaining accounts: [bin_array, position_bin] per withdrawal
  const remainingAccounts: Array<{
    pubkey: PublicKey;
    isSigner: boolean;
    isWritable: boolean;
  }> = [];

  for (const w of withdrawals) {
    const lowerBinIndex = getBinArrayLowerIndex(w.binIndex);
    const [binArrayPda] = deriveBinArrayPda(poolAddress, lowerBinIndex, programId);
    const [positionBinPda] = derivePositionBinPda(position, w.binIndex, programId);

    remainingAccounts.push(
      { pubkey: binArrayPda, isSigner: false, isWritable: true },
      { pubkey: positionBinPda, isSigner: false, isWritable: true }
    );
  }

  const userBaseAta = await getAssociatedTokenAddress(poolAccount.baseMint, user);
  const userQuoteAta = await getAssociatedTokenAddress(poolAccount.quoteMint, user);

  return program.methods
    .removeLiquidity(withdrawalEntries)
    .accountsStrict({
      pool: poolAddress,
      position,
      owner: user,
      baseVault: poolAccount.baseVault,
      quoteVault: poolAccount.quoteVault,
      userBaseAccount: userBaseAta,
      userQuoteAccount: userQuoteAta,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .remainingAccounts(remainingAccounts)
    .instruction();
}
