import { Connection, PublicKey } from "@solana/web3.js";
import { DEFAULT_PROGRAM_ID } from "../constants";
import { createReadOnlyProgram } from "./pool";
import type { PositionState, PositionBinState, UserPosition } from "../types/position";

/**
 * Fetch all positions for a user on a specific pool.
 *
 * @param connection - Solana connection
 * @param user - User public key
 * @param pool - Pool public key
 * @param programId - Program ID
 */
export async function fetchPositions(
  connection: Connection,
  user: PublicKey,
  pool: PublicKey,
  programId: PublicKey = DEFAULT_PROGRAM_ID
): Promise<UserPosition[]> {
  const program = createReadOnlyProgram(connection, programId);

  // Find Position accounts: memcmp on owner field (offset: 8 + 32 = 40)
  const positionAccounts = await (program.account as any).position.all([
    { memcmp: { offset: 8, bytes: pool.toBase58() } },
    { memcmp: { offset: 8 + 32, bytes: user.toBase58() } },
  ]);

  const positions: UserPosition[] = [];

  for (const posAccount of positionAccounts) {
    const posRaw = posAccount.account as Record<string, unknown>;
    const position: PositionState = {
      address: posAccount.publicKey,
      pool: toPubkey(posRaw.pool),
      owner: toPubkey(posRaw.owner),
      nonce: toBigInt(posRaw.nonce),
    };

    // Fetch all PositionBin accounts for this position
    const positionBinAccounts = await (program.account as any).positionBin.all([
      { memcmp: { offset: 8, bytes: posAccount.publicKey.toBase58() } },
    ]);

    const bins: PositionBinState[] = positionBinAccounts.map((binAcc: { publicKey: PublicKey; account: Record<string, unknown> }) => {
      const binRaw = binAcc.account as Record<string, unknown>;
      return {
        address: binAcc.publicKey,
        position: toPubkey(binRaw.position),
        pool: toPubkey(binRaw.pool),
        binIndex: toNumber(binRaw.binIndex),
        shares: toBigInt(binRaw.shares),
        entryBaseReserve: toBigInt(binRaw.entryBaseReserve),
        entryQuoteReserve: toBigInt(binRaw.entryQuoteReserve),
      };
    });

    bins.sort((a, b) => a.binIndex - b.binIndex);

    positions.push({
      position,
      bins,
      totalBaseAtoms: bins.reduce((s, b) => s + b.entryBaseReserve, 0n),
      totalQuoteAtoms: bins.reduce((s, b) => s + b.entryQuoteReserve, 0n),
      totalValueUsd: null,
    });
  }

  return positions;
}

/**
 * Fetch all positions for a user across ALL pools.
 */
export async function fetchAllUserPositions(
  connection: Connection,
  user: PublicKey,
  programId: PublicKey = DEFAULT_PROGRAM_ID
): Promise<UserPosition[]> {
  const program = createReadOnlyProgram(connection, programId);

  // Find all Position accounts for this user (offset 40 = 8 discriminator + 32 pool)
  const positionAccounts = await (program.account as any).position.all([
    { memcmp: { offset: 8 + 32, bytes: user.toBase58() } },
  ]);

  const positions: UserPosition[] = [];

  for (const posAccount of positionAccounts) {
    const posRaw = posAccount.account as Record<string, unknown>;
    const position: PositionState = {
      address: posAccount.publicKey,
      pool: toPubkey(posRaw.pool),
      owner: toPubkey(posRaw.owner),
      nonce: toBigInt(posRaw.nonce),
    };

    const positionBinAccounts = await (program.account as any).positionBin.all([
      { memcmp: { offset: 8, bytes: posAccount.publicKey.toBase58() } },
    ]);

    const bins: PositionBinState[] = positionBinAccounts.map((binAcc: { publicKey: PublicKey; account: Record<string, unknown> }) => {
      const binRaw = binAcc.account as Record<string, unknown>;
      return {
        address: binAcc.publicKey,
        position: toPubkey(binRaw.position),
        pool: toPubkey(binRaw.pool),
        binIndex: toNumber(binRaw.binIndex),
        shares: toBigInt(binRaw.shares),
        entryBaseReserve: toBigInt(binRaw.entryBaseReserve),
        entryQuoteReserve: toBigInt(binRaw.entryQuoteReserve),
      };
    });

    bins.sort((a, b) => a.binIndex - b.binIndex);

    positions.push({
      position,
      bins,
      totalBaseAtoms: bins.reduce((s, b) => s + b.entryBaseReserve, 0n),
      totalQuoteAtoms: bins.reduce((s, b) => s + b.entryQuoteReserve, 0n),
      totalValueUsd: null,
    });
  }

  return positions;
}

function toPubkey(v: unknown): PublicKey {
  if (v instanceof PublicKey) return v;
  if (typeof v === "string") return new PublicKey(v);
  if (v && typeof v === "object" && "toBase58" in v) return v as PublicKey;
  return PublicKey.default;
}

function toNumber(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "bigint") return Number(v);
  if (v && typeof v === "object" && "toNumber" in v) return (v as { toNumber(): number }).toNumber();
  return 0;
}

function toBigInt(v: unknown): bigint {
  if (typeof v === "bigint") return v;
  if (typeof v === "number") return BigInt(v);
  if (v && typeof v === "object" && "toString" in v) return BigInt((v as { toString(): string }).toString());
  return 0n;
}
