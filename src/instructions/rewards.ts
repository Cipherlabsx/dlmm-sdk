/**
 * Instruction builders for reward claiming and staking sync.
 */

import {
  Connection,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountIdempotentInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { DEFAULT_PROGRAM_ID } from "../constants";
import { createReadOnlyProgram } from "../accounts/pool";

const STREAMFLOW_PROGRAM_ID = new PublicKey("STAKEvGqQTtzJZH6BWDcbpzXXn2BBerPAgQ3EGLN2GH");
const DEFAULT_CIPHER_POOL = new PublicKey("Fh7u35PsxFWBWNE5Pme2yffixJ5H7YocAymJHs6L73N");

// ── PDA helpers (reward-specific seeds differ from pool PDAs) ──

function deriveHolderGlobal(programId: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([Buffer.from("holder_global")], programId)[0];
}

function deriveNftGlobal(programId: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([Buffer.from("nft_global")], programId)[0];
}

function deriveUserHolder(user: PublicKey, programId: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([Buffer.from("holder_user"), user.toBuffer()], programId)[0];
}

function deriveStreamflowStakeEntry(
  stakePool: PublicKey,
  user: PublicKey,
  nonce: number
): PublicKey {
  const nonceBuf = Buffer.alloc(4);
  nonceBuf.writeUInt32LE(nonce, 0);
  return PublicKey.findProgramAddressSync(
    [Buffer.from("stake-entry"), stakePool.toBuffer(), user.toBuffer(), nonceBuf],
    STREAMFLOW_PROGRAM_ID
  )[0];
}

/**
 * Build sync_holder_stake instruction.
 * Records a staking checkpoint for time-weighted reward calculation.
 * Must be called after stake/unstake in Streamflow.
 */
export function buildSyncHolderStakeIx(
  user: PublicKey,
  stakeEntryNonce: number,
  stakePoolAddress: PublicKey = DEFAULT_CIPHER_POOL,
  programId: PublicKey = DEFAULT_PROGRAM_ID
): TransactionInstruction {
  const holderGlobalState = deriveHolderGlobal(programId);
  const userHolderState = deriveUserHolder(user, programId);
  const streamflowStakeEntry = deriveStreamflowStakeEntry(stakePoolAddress, user, stakeEntryNonce);

  const SYNC_DISCRIMINATOR = Buffer.from([151, 230, 186, 138, 237, 187, 231, 155]);
  const nonceBuf = Buffer.alloc(4);
  nonceBuf.writeUInt32LE(stakeEntryNonce, 0);
  const data = Buffer.concat([SYNC_DISCRIMINATOR, stakePoolAddress.toBuffer(), nonceBuf]);

  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: holderGlobalState, isSigner: false, isWritable: false },
      { pubkey: userHolderState, isSigner: false, isWritable: true },
      { pubkey: user, isSigner: true, isWritable: false },
      { pubkey: streamflowStakeEntry, isSigner: false, isWritable: false },
      { pubkey: STREAMFLOW_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data,
  });
}

/**
 * Build claim_holder_rewards instructions.
 * Returns [ensureATA, syncRewardIndexes, claimHolderRewards].
 */
export async function buildClaimHolderRewardsIxs(
  connection: Connection,
  user: PublicKey,
  poolAddress: PublicKey,
  programId: PublicKey = DEFAULT_PROGRAM_ID
): Promise<TransactionInstruction[]> {
  const program = createReadOnlyProgram(connection, programId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const poolAccount = await (program.account as any).pool.fetch(poolAddress);

  const holderGlobalState = deriveHolderGlobal(programId);
  const nftGlobalState = deriveNftGlobal(programId);
  const userHolderState = deriveUserHolder(user, programId);

  // Derive pool authority PDA
  const binStepBuffer = Buffer.alloc(2);
  binStepBuffer.writeUInt16LE(Number(poolAccount.binStepBps));
  const baseFeeBuffer = Buffer.alloc(2);
  baseFeeBuffer.writeUInt16LE(Number(poolAccount.baseFeeBps));
  const [poolAuthority] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("pool"),
      poolAccount.baseMint.toBuffer(),
      poolAccount.quoteMint.toBuffer(),
      binStepBuffer,
      baseFeeBuffer,
    ],
    programId
  );

  const userRewardDestination = await getAssociatedTokenAddress(poolAccount.quoteMint, user);

  // Sync reward indexes
  const syncIx = await program.methods
    .syncRewardIndexes()
    .accountsStrict({ pool: poolAddress, holderGlobalState, nftGlobalState })
    .instruction();

  // Claim holder rewards
  const claimIx = await program.methods
    .claimHolderRewards()
    .accountsStrict({
      pool: poolAddress,
      holderGlobalState,
      user,
      userRewardDestination,
      holdersFeeVault: poolAccount.holdersFeeVault,
      userHolderState,
      poolAuthority,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .instruction();

  // Ensure user has ATA for reward token
  const ensureAtaIx = createAssociatedTokenAccountIdempotentInstruction(
    user, userRewardDestination, user, poolAccount.quoteMint,
    TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID
  );

  return [ensureAtaIx, syncIx, claimIx];
}

/**
 * Build init_user_holder_state instruction.
 * Required before first claim.
 */
export async function buildInitHolderStateIx(
  connection: Connection,
  user: PublicKey,
  programId: PublicKey = DEFAULT_PROGRAM_ID
): Promise<TransactionInstruction> {
  const program = createReadOnlyProgram(connection, programId);
  const holderGlobalState = deriveHolderGlobal(programId);
  const userHolderState = deriveUserHolder(user, programId);

  return program.methods
    .initUserHolderState()
    .accountsStrict({
      payer: user,
      user,
      holderGlobalState,
      userHolderState,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
}
