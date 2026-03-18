import { Connection, PublicKey } from "@solana/web3.js";
import { DEFAULT_PROGRAM_ID, BIN_ARRAY_SIZE } from "../constants";
import { deriveBinArrayPda, getBinArrayLowerIndex } from "../pda";
import { createReadOnlyProgram } from "./pool";
import type { BinArrayState, CompactBin } from "../types/pool";

/**
 * Fetch BinArray accounts for a range of bin indices.
 *
 * @param connection - Solana connection
 * @param pool - Pool public key
 * @param minBinId - Minimum bin index (inclusive)
 * @param maxBinId - Maximum bin index (inclusive)
 * @param programId - Program ID
 * @returns Array of decoded BinArray accounts (only those that exist on-chain)
 */
export async function fetchBinArraysForRange(
  connection: Connection,
  pool: PublicKey,
  minBinId: number,
  maxBinId: number,
  programId: PublicKey = DEFAULT_PROGRAM_ID
): Promise<BinArrayState[]> {
  const program = createReadOnlyProgram(connection, programId);

  // Calculate all BinArray PDAs needed
  const lowerMin = getBinArrayLowerIndex(minBinId);
  const lowerMax = getBinArrayLowerIndex(maxBinId);
  const pdas: Array<{ pda: PublicKey; lower: number }> = [];

  for (let lower = lowerMin; lower <= lowerMax; lower += BIN_ARRAY_SIZE) {
    const [pda] = deriveBinArrayPda(pool, lower, programId);
    pdas.push({ pda, lower });
  }

  // Batch fetch (some may not exist yet)
  const results: BinArrayState[] = [];

  for (const { pda, lower } of pdas) {
    try {
      const raw = await (program.account as any).binArray.fetch(pda);
      results.push(decodeBinArray(pda, pool, lower, raw));
    } catch {
      // BinArray doesn't exist yet (no liquidity in this range)
    }
  }

  return results;
}

/**
 * Fetch all BinArray accounts for a pool.
 * Uses memcmp filter on the pool field.
 */
export async function fetchAllBinArrays(
  connection: Connection,
  pool: PublicKey,
  programId: PublicKey = DEFAULT_PROGRAM_ID
): Promise<BinArrayState[]> {
  const program = createReadOnlyProgram(connection, programId);

  const accounts = await (program.account as any).binArray.all([
    {
      memcmp: {
        offset: 8, // After discriminator
        bytes: pool.toBase58(),
      },
    },
  ]);

  return accounts.map((a: { publicKey: PublicKey; account: Record<string, unknown> }) => {
    const raw = a.account;
    const lower = toNumber(raw.lowerBinIndex);
    return decodeBinArray(a.publicKey, pool, lower, raw);
  });
}

function decodeBinArray(
  address: PublicKey,
  pool: PublicKey,
  lowerBinIndex: number,
  raw: Record<string, unknown>
): BinArrayState {
  const binsRaw = (raw.bins as unknown[]) || [];

  const bins: CompactBin[] = binsRaw.map((binRaw, offset) => {
    const b = binRaw as Record<string, unknown>;
    return {
      binIndex: lowerBinIndex + offset,
      baseReserve: toBigInt(b.baseReserve),
      quoteReserve: toBigInt(b.quoteReserve),
      totalShares: toBigInt(b.totalShares),
      feeBaseAccrued: toBigInt(b.feeBaseAccrued),
      feeQuoteAccrued: toBigInt(b.feeQuoteAccrued),
    };
  });

  return { address, pool, lowerBinIndex, bins };
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
