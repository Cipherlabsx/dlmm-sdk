/**
 * Encode canonical bin index to match Rust's encoding: (i32 as i64) as u64
 * Performs 64-bit sign extension, NOT 32-bit two's complement.
 *
 * @example
 * canonicalBinIndexU64(100)   // => 100n
 * canonicalBinIndexU64(0)     // => 0n
 * canonicalBinIndexU64(-1)    // => 18446744073709551615n (0xFFFFFFFFFFFFFFFF)
 * canonicalBinIndexU64(-1224) // => 18446744073709550392n
 */
export function canonicalBinIndexU64(binIndexSigned: number): bigint {
  if (binIndexSigned < -2147483648 || binIndexSigned > 2147483647) {
    throw new Error(`Bin index ${binIndexSigned} out of i32 range`);
  }
  return BigInt(binIndexSigned) & 0xFFFFFFFFFFFFFFFFn;
}

/**
 * Decode canonical u64 back to signed i32.
 */
export function decodeBinIndexSigned(canonicalU64: bigint): number {
  if (canonicalU64 < 0x80000000n) {
    return Number(canonicalU64);
  } else if (canonicalU64 <= 0xFFFFFFFFn) {
    return Number(canonicalU64) - 0x100000000;
  } else {
    throw new Error(`Invalid canonical bin index: ${canonicalU64}`);
  }
}
