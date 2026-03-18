import {
  Connection,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
  ComputeBudgetProgram,
  type AddressLookupTableAccount,
} from "@solana/web3.js";
import { REQUIRED_HEAP_BYTES } from "../constants";

export interface BuildTransactionOptions {
  /** Payer public key */
  payer: PublicKey;
  /** Instructions to include */
  instructions: TransactionInstruction[];
  /** Address lookup table accounts (optional, reduces tx size) */
  addressLookupTableAccounts?: AddressLookupTableAccount[];
  /** Compute unit price in microlamports (default: 100000) */
  computeUnitPrice?: number;
  /** Compute unit limit (default: 400000) */
  computeUnitLimit?: number;
  /** Include 256KB heap frame request (default: true) */
  includeHeapFrame?: boolean;
}

/**
 * Build an unsigned VersionedTransaction (v0) with compute budget and heap frame.
 *
 * Every CipherDLMM transaction needs:
 * 1. Compute budget (price + limit)
 * 2. 256KB heap frame request
 * 3. The actual instructions
 *
 * @returns Unsigned transaction ready for signing
 */
export async function buildTransaction(
  connection: Connection,
  options: BuildTransactionOptions
): Promise<{
  transaction: VersionedTransaction;
  blockhash: string;
  lastValidBlockHeight: number;
}> {
  const {
    payer,
    instructions,
    addressLookupTableAccounts = [],
    computeUnitPrice = 100_000,
    computeUnitLimit = 400_000,
    includeHeapFrame = true,
  } = options;

  if (instructions.length === 0) {
    throw new Error("No instructions provided");
  }

  // Prepend compute budget + heap frame
  const allIxs: TransactionInstruction[] = [
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: computeUnitPrice }),
    ComputeBudgetProgram.setComputeUnitLimit({ units: computeUnitLimit }),
  ];

  if (includeHeapFrame) {
    allIxs.push(
      ComputeBudgetProgram.requestHeapFrame({ bytes: REQUIRED_HEAP_BYTES })
    );
  }

  allIxs.push(...instructions);

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");

  const message = new TransactionMessage({
    payerKey: payer,
    recentBlockhash: blockhash,
    instructions: allIxs,
  }).compileToV0Message(addressLookupTableAccounts);

  const transaction = new VersionedTransaction(message);

  return { transaction, blockhash, lastValidBlockHeight };
}
