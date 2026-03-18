/**
 * Swap instruction builder for CipherDLMM.
 */

import {
  Connection,
  PublicKey,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountIdempotentInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import BN from "bn.js";
import { DEFAULT_PROGRAM_ID } from "../constants";
import { createReadOnlyProgram } from "../accounts/pool";
import { getUniqueBinArrayPdas, getBinArrayLowerIndex } from "../pda";
import type { SwapParams } from "../types/instructions";

/**
 * Build swap instruction with bin array resolution.
 *
 * @param connection - Solana connection
 * @param poolAddress - Pool address
 * @param params - Swap parameters (user, amountIn, minAmountOut, swapForBase)
 * @param programId - Program ID
 * @returns Array of instructions (ATA creation if needed + swap)
 */
export async function buildSwapIxs(
  connection: Connection,
  poolAddress: PublicKey,
  params: SwapParams,
  programId: PublicKey = DEFAULT_PROGRAM_ID
): Promise<TransactionInstruction[]> {
  const program = createReadOnlyProgram(connection, programId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const poolAccount = await (program.account as any).pool.fetch(poolAddress);

  const { user, amountIn, minAmountOut, swapForBase } = params;

  // Determine input/output mints
  const inputMint = swapForBase ? poolAccount.quoteMint : poolAccount.baseMint;
  const outputMint = swapForBase ? poolAccount.baseMint : poolAccount.quoteMint;

  // Get ATAs
  const userInputAta = await getAssociatedTokenAddress(inputMint, user);
  const userOutputAta = await getAssociatedTokenAddress(outputMint, user);

  // Resolve BinArrays in the swap path
  // For a swap, we need BinArrays around the active bin
  const activeBin = Number(poolAccount.activeBin || poolAccount.activeBinId || 0);
  const swapRange = 10; // BinArrays to include (covers ~640 bins)
  const lowerBound = getBinArrayLowerIndex(activeBin - swapRange * 64);
  const upperBound = getBinArrayLowerIndex(activeBin + swapRange * 64);

  const binIndices: number[] = [];
  for (let i = lowerBound; i <= upperBound; i += 64) {
    binIndices.push(i);
  }

  const binArrayPdas = getUniqueBinArrayPdas(poolAddress, binIndices, programId);
  const remainingAccounts = binArrayPdas.map(({ pda }) => ({
    pubkey: pda,
    isSigner: false,
    isWritable: true,
  }));

  // Build swap instruction
  const swapIx = await program.methods
    .swap(new BN(amountIn.toString()), new BN(minAmountOut.toString()), swapForBase)
    .accountsStrict({
      pool: poolAddress,
      user,
      userBaseAccount: swapForBase ? userOutputAta : userInputAta,
      userQuoteAccount: swapForBase ? userInputAta : userOutputAta,
      baseVault: poolAccount.baseVault,
      quoteVault: poolAccount.quoteVault,
      creatorFeeVault: poolAccount.creatorFeeVault,
      holdersFeeVault: poolAccount.holdersFeeVault,
      nftFeeVault: poolAccount.nftFeeVault,
      protocolFeeVault: poolAccount.protocolFeeVault,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .remainingAccounts(remainingAccounts)
    .instruction();

  // Ensure output ATA exists
  const ensureAtaIx = createAssociatedTokenAccountIdempotentInstruction(
    user, userOutputAta, user, outputMint,
    TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID
  );

  return [ensureAtaIx, swapIx];
}
