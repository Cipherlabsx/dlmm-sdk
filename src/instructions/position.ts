/**
 * Position lifecycle instructions (init + close).
 */

import {
  Connection,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import BN from "bn.js";
import { DEFAULT_PROGRAM_ID } from "../constants";
import { createReadOnlyProgram } from "../accounts/pool";
import { derivePositionPda } from "../pda";

/**
 * Build init_position instruction.
 * Creates a new Position PDA for the user on a pool.
 */
export async function buildInitPositionIx(
  connection: Connection,
  poolAddress: PublicKey,
  user: PublicKey,
  nonce: bigint,
  programId: PublicKey = DEFAULT_PROGRAM_ID
): Promise<TransactionInstruction> {
  const program = createReadOnlyProgram(connection, programId);
  const [position] = derivePositionPda(poolAddress, user, nonce, programId);

  return program.methods
    .initPosition(new BN(nonce.toString()))
    .accountsStrict({
      pool: poolAddress,
      position,
      owner: user,
      payer: user,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
}

/**
 * Build close_position instruction.
 * Position must have zero liquidity (all bins withdrawn).
 */
export async function buildClosePositionIx(
  connection: Connection,
  poolAddress: PublicKey,
  user: PublicKey,
  position: PublicKey,
  programId: PublicKey = DEFAULT_PROGRAM_ID
): Promise<TransactionInstruction> {
  const program = createReadOnlyProgram(connection, programId);

  return program.methods
    .closePosition()
    .accountsStrict({
      pool: poolAddress,
      position,
      owner: user,
      rentReceiver: user,
    })
    .instruction();
}
