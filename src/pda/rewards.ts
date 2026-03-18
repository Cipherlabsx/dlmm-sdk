import { PublicKey } from "@solana/web3.js";
import { DEFAULT_PROGRAM_ID } from "../constants";

/** Derive HolderGlobalState PDA */
export function deriveHolderGlobalStatePda(
  pool: PublicKey,
  programId: PublicKey = DEFAULT_PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("holder_global_state"), pool.toBuffer()],
    programId
  );
}

/** Derive NftGlobalState PDA */
export function deriveNftGlobalStatePda(
  pool: PublicKey,
  programId: PublicKey = DEFAULT_PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("nft_global_state"), pool.toBuffer()],
    programId
  );
}

/** Derive UserHolderState PDA */
export function deriveUserHolderStatePda(
  holderGlobalState: PublicKey,
  user: PublicKey,
  programId: PublicKey = DEFAULT_PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("user_holder_state"), holderGlobalState.toBuffer(), user.toBuffer()],
    programId
  );
}

/** Derive UserNftState PDA */
export function deriveUserNftStatePda(
  nftGlobalState: PublicKey,
  user: PublicKey,
  programId: PublicKey = DEFAULT_PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("user_nft_state"), nftGlobalState.toBuffer(), user.toBuffer()],
    programId
  );
}

/** Derive PoolAuthority PDA */
export function derivePoolAuthorityPda(
  pool: PublicKey,
  programId: PublicKey = DEFAULT_PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("authority"), pool.toBuffer()],
    programId
  );
}
