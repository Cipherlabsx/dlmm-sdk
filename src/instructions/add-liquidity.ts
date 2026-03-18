/**
 * Add liquidity instruction builder.
 * Handles the 32-bin-per-transaction limit by splitting into chunks.
 */

import {
  Connection,
  PublicKey,
  TransactionInstruction,
} from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import BN from "bn.js";
import { DEFAULT_PROGRAM_ID, MAX_BINS_PER_TX } from "../constants";
import { createReadOnlyProgram } from "../accounts/pool";
import {
  deriveBinArrayPda,
  derivePositionPda,
  derivePositionBinPda,
  getBinArrayLowerIndex,
  canonicalBinIndexU64,
} from "../pda";
import type { BinAllocation } from "../math/distribution";

/**
 * Build add_liquidity_batch instructions.
 *
 * Automatically splits deposits exceeding 32 bins into multiple instruction sets.
 * Each instruction set is one transaction's worth of instructions.
 *
 * Remaining accounts layout per bin:
 *   [bin_array_pda, position_bin_pda]
 *
 * @returns Array of instruction arrays (one per transaction)
 */
export async function buildAddLiquidityIxs(
  connection: Connection,
  poolAddress: PublicKey,
  user: PublicKey,
  positionNonce: bigint,
  deposits: BinAllocation[],
  programId: PublicKey = DEFAULT_PROGRAM_ID
): Promise<TransactionInstruction[][]> {
  if (deposits.length === 0) return [];

  const program = createReadOnlyProgram(connection, programId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const poolAccount = await (program.account as any).pool.fetch(poolAddress);

  const [position] = derivePositionPda(poolAddress, user, positionNonce, programId);

  // Split into chunks of MAX_BINS_PER_TX
  const chunks: BinAllocation[][] = [];
  for (let i = 0; i < deposits.length; i += MAX_BINS_PER_TX) {
    chunks.push(deposits.slice(i, i + MAX_BINS_PER_TX));
  }

  const txInstructions: TransactionInstruction[][] = [];

  for (const chunk of chunks) {
    // Build BinLiquidityDeposit entries + remaining accounts
    const binDeposits: Array<{
      binIndex: unknown; // BN
      baseIn: unknown;   // BN
      quoteIn: unknown;  // BN
      minSharesOut: unknown; // BN
    }> = [];

    const remainingAccounts: Array<{
      pubkey: PublicKey;
      isSigner: boolean;
      isWritable: boolean;
    }> = [];

    for (const deposit of chunk) {
      // Canonical bin index encoding (i32 -> u64 sign extension)
      const canonicalBin = canonicalBinIndexU64(deposit.binIndex);

      binDeposits.push({
        binIndex: new BN(canonicalBin.toString()),
        baseIn: new BN(deposit.baseAtoms.toString()),
        quoteIn: new BN(deposit.quoteAtoms.toString()),
        minSharesOut: new BN(0), // No slippage protection by default
      });

      // Remaining accounts: bin_array PDA, position_bin PDA
      const lowerBinIndex = getBinArrayLowerIndex(deposit.binIndex);
      const [binArrayPda] = deriveBinArrayPda(poolAddress, lowerBinIndex, programId);
      const [positionBinPda] = derivePositionBinPda(position, deposit.binIndex, programId);

      remainingAccounts.push(
        { pubkey: binArrayPda, isSigner: false, isWritable: true },
        { pubkey: positionBinPda, isSigner: false, isWritable: true }
      );
    }

    const ix = await program.methods
      .addLiquidityBatch(binDeposits)
      .accountsStrict({
        pool: poolAddress,
        position,
        owner: user,
        baseVault: poolAccount.baseVault,
        quoteVault: poolAccount.quoteVault,
        userBaseAccount: await findAta(poolAccount.baseMint, user),
        userQuoteAccount: await findAta(poolAccount.quoteMint, user),
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .remainingAccounts(remainingAccounts)
      .instruction();

    txInstructions.push([ix]);
  }

  return txInstructions;
}

async function findAta(mint: PublicKey, owner: PublicKey): Promise<PublicKey> {
  const { getAssociatedTokenAddress } = await import("@solana/spl-token");
  return getAssociatedTokenAddress(mint, owner);
}
