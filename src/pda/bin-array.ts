import { PublicKey } from "@solana/web3.js";
import { BIN_ARRAY_SIZE, DEFAULT_PROGRAM_ID } from "../constants";

/**
 * Calculate which BinArray contains a given bin index.
 * BinArrays are aligned to 64-bin boundaries.
 *
 * @example
 * getBinArrayLowerIndex(0)    // => 0   (bins 0-63)
 * getBinArrayLowerIndex(150)  // => 128 (bins 128-191)
 * getBinArrayLowerIndex(-1)   // => -64 (bins -64 to -1)
 * getBinArrayLowerIndex(-65)  // => -128
 */
export function getBinArrayLowerIndex(binIndexSigned: number): number {
  // Math.floor rounds towards -infinity (correct for negative bins)
  // Math.trunc rounds towards 0 (WRONG for negative bins)
  const arrayNumber = Math.floor(binIndexSigned / BIN_ARRAY_SIZE);
  return arrayNumber * BIN_ARRAY_SIZE;
}

/**
 * Calculate offset within BinArray for a given bin index.
 *
 * @example
 * getBinOffsetInArray(150, 128) // => 22
 * getBinOffsetInArray(63, 0)    // => 63
 */
export function getBinOffsetInArray(
  binIndexSigned: number,
  lowerBinIndex: number
): number {
  const offset = binIndexSigned - lowerBinIndex;
  if (offset < 0 || offset >= BIN_ARRAY_SIZE) {
    throw new Error(
      `Bin index ${binIndexSigned} not in array ${lowerBinIndex} (offset: ${offset})`
    );
  }
  return offset;
}

/**
 * Derive BinArray PDA (holds 64 consecutive bins).
 *
 * Seeds: ["bin_array", pool, lower_bin_index_i32_le]
 *
 * @param pool - Pool public key
 * @param lowerBinIndex - Starting bin index (must be multiple of 64)
 * @param programId - Program ID (defaults to CipherDLMM mainnet)
 */
export function deriveBinArrayPda(
  pool: PublicKey,
  lowerBinIndex: number,
  programId: PublicKey = DEFAULT_PROGRAM_ID
): [PublicKey, number] {
  if (lowerBinIndex % BIN_ARRAY_SIZE !== 0) {
    throw new Error(
      `lowerBinIndex ${lowerBinIndex} must be multiple of ${BIN_ARRAY_SIZE}`
    );
  }

  const lowerBinIndexBuffer = Buffer.allocUnsafe(4);
  lowerBinIndexBuffer.writeInt32LE(lowerBinIndex, 0);

  return PublicKey.findProgramAddressSync(
    [Buffer.from("bin_array"), pool.toBuffer(), lowerBinIndexBuffer],
    programId
  );
}

/**
 * Group bin indices by their containing BinArray.
 *
 * @example
 * groupBinsByArray([0, 50, 64, 150])
 * // => Map { 0 => [0, 50], 64 => [64], 128 => [150] }
 */
export function groupBinsByArray(
  binIndices: number[]
): Map<number, number[]> {
  const groups = new Map<number, number[]>();
  for (const binIndex of binIndices) {
    const lower = getBinArrayLowerIndex(binIndex);
    const group = groups.get(lower) || [];
    group.push(binIndex);
    groups.set(lower, group);
  }
  return groups;
}

/**
 * Get unique BinArray PDAs needed for a set of bin indices.
 * Deduplicates to minimize account fetches.
 */
export function getUniqueBinArrayPdas(
  pool: PublicKey,
  binIndices: number[],
  programId: PublicKey = DEFAULT_PROGRAM_ID
): Array<{ pda: PublicKey; lowerBinIndex: number }> {
  const uniqueLowerIndices = new Set(binIndices.map(getBinArrayLowerIndex));
  return Array.from(uniqueLowerIndices).map((lowerBinIndex) => {
    const [pda] = deriveBinArrayPda(pool, lowerBinIndex, programId);
    return { pda, lowerBinIndex };
  });
}
