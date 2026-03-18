import { Connection, PublicKey } from "@solana/web3.js";
import { getMint } from "@solana/spl-token";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import type { Idl } from "@coral-xyz/anchor";
import { DEFAULT_PROGRAM_ID } from "../constants";
import type { PoolState, FeeConfig } from "../types/pool";
import idlJson from "../idl/orbit_finance.json";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyProgram = Program<any>;

/** Create a read-only Anchor program instance */
export function createReadOnlyProgram(
  connection: Connection,
  programId: PublicKey = DEFAULT_PROGRAM_ID
): AnyProgram {
  const provider = new AnchorProvider(
    connection,
    // Dummy wallet — only used for reads, never signs
    { publicKey: PublicKey.default, signTransaction: async (tx: unknown) => tx, signAllTransactions: async (txs: unknown) => txs } as AnchorProvider["wallet"],
    { commitment: "confirmed" }
  );
  return new Program(idlJson as unknown as Idl, provider) as AnyProgram;
}

/** Fetch and decode a Pool account, including mint decimals. */
export async function fetchPool(
  connection: Connection,
  poolAddress: PublicKey,
  programId: PublicKey = DEFAULT_PROGRAM_ID
): Promise<PoolState> {
  const program = createReadOnlyProgram(connection, programId);
  const raw = await (program.account as Record<string, { fetch: (addr: PublicKey) => Promise<Record<string, unknown>> }>).pool.fetch(poolAddress);

  // Decimals are not stored in the Pool account — fetch from SPL mint
  const baseMintPubkey = toPubkey(raw.baseMint);
  const quoteMintPubkey = toPubkey(raw.quoteMint);
  const [baseMintInfo, quoteMintInfo] = await Promise.all([
    getMint(connection, baseMintPubkey),
    getMint(connection, quoteMintPubkey),
  ]);

  return decodePoolAccount(
    poolAddress,
    raw,
    baseMintInfo.decimals,
    quoteMintInfo.decimals
  );
}

/** Fetch all pools and their mint decimals. */
export async function fetchAllPools(
  connection: Connection,
  programId: PublicKey = DEFAULT_PROGRAM_ID
): Promise<PoolState[]> {
  const program = createReadOnlyProgram(connection, programId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const accounts = await (program.account as any).pool.all();

  // Collect unique mints to batch-fetch decimals
  const mintSet = new Set<string>();
  for (const a of accounts) {
    const r = a.account as Record<string, unknown>;
    mintSet.add(toPubkey(r.baseMint).toBase58());
    mintSet.add(toPubkey(r.quoteMint).toBase58());
  }
  const mintKeys = Array.from(mintSet).map((s) => new PublicKey(s));
  const mintInfoMap = new Map<string, number>();
  await Promise.all(
    mintKeys.map(async (pk) => {
      try {
        const info = await getMint(connection, pk);
        mintInfoMap.set(pk.toBase58(), info.decimals);
      } catch {
        mintInfoMap.set(pk.toBase58(), 0);
      }
    })
  );

  return accounts.map((a: { publicKey: PublicKey; account: Record<string, unknown> }) => {
    const r = a.account as Record<string, unknown>;
    const baseDecimals = mintInfoMap.get(toPubkey(r.baseMint).toBase58()) ?? 0;
    const quoteDecimals = mintInfoMap.get(toPubkey(r.quoteMint).toBase58()) ?? 0;
    return decodePoolAccount(a.publicKey, r, baseDecimals, quoteDecimals);
  });
}

function decodePoolAccount(
  address: PublicKey,
  raw: Record<string, unknown>,
  baseDecimals: number,
  quoteDecimals: number
): PoolState {
  // FeeConfig fields live directly on the pool struct, not in a nested object
  const feeConfig: FeeConfig = {
    baseFeeBps: toNumber(raw.baseFeeBps),
    creatorCutBps: toNumber(raw.creatorCutBps),
    holdersCutBps: toNumber(raw.splitHoldersMicrobps),
    nftCutBps: toNumber(raw.splitNftMicrobps),
    protocolCutBps: 0, // derived from remaining after other cuts
  };

  return {
    address,
    baseMint: toPubkey(raw.baseMint),
    quoteMint: toPubkey(raw.quoteMint),
    baseVault: toPubkey(raw.baseVault),
    quoteVault: toPubkey(raw.quoteVault),
    protocolFeeVault: toPubkey(raw.protocolFeeVault),
    creatorFeeVault: toPubkey(raw.creatorFeeVault),
    holdersFeeVault: toPubkey(raw.holdersFeeVault),
    nftFeeVault: toPubkey(raw.nftFeeVault),
    binStepBps: toNumber(raw.binStepBps),
    baseFeeBps: toNumber(raw.baseFeeBps),
    activeBinId: toNumber(raw.activeBin),         // IDL field: active_bin
    activeBinPrice: toBigInt(raw.priceQ6464),      // IDL field: price_q64_64 → priceQ6464
    admin: toPubkey(raw.admin),
    creator: toPubkey(raw.creator),
    configAuthority: toPubkey(raw.configAuthority),
    pauseGuardian: toPubkey(raw.pauseGuardian),
    feeWithdrawAuthority: toPubkey(raw.feeWithdrawAuthority),
    feeConfig,
    pausedBits: toNumber(raw.pauseBits),           // IDL field: pause_bits → pauseBits
    baseDecimals,
    quoteDecimals,
  };
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
  if (v && typeof v === "object" && "toString" in v) {
    try { return BigInt((v as { toString(): string }).toString()); } catch { return 0n; }
  }
  return 0n;
}
