import { Connection, PublicKey } from "@solana/web3.js";
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

/** Fetch and decode a Pool account */
export async function fetchPool(
  connection: Connection,
  poolAddress: PublicKey,
  programId: PublicKey = DEFAULT_PROGRAM_ID
): Promise<PoolState> {
  const program = createReadOnlyProgram(connection, programId);
  const raw = await (program.account as Record<string, { fetch: (addr: PublicKey) => Promise<Record<string, unknown>> }>).pool.fetch(poolAddress);

  return decodePoolAccount(poolAddress, raw);
}

/** Fetch all pools (warning: expensive RPC call) */
export async function fetchAllPools(
  connection: Connection,
  programId: PublicKey = DEFAULT_PROGRAM_ID
): Promise<PoolState[]> {
  const program = createReadOnlyProgram(connection, programId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const accounts = await (program.account as any).pool.all();
  return accounts.map((a: { publicKey: PublicKey; account: Record<string, unknown> }) => decodePoolAccount(a.publicKey, a.account));
}

function decodePoolAccount(address: PublicKey, raw: Record<string, unknown>): PoolState {
  const feeConfigRaw = raw.feeConfig as Record<string, unknown> || {};

  const feeConfig: FeeConfig = {
    baseFeeBps: toNumber(feeConfigRaw.baseFeeBps),
    creatorCutBps: toNumber(feeConfigRaw.creatorCutBps),
    holdersCutBps: toNumber(feeConfigRaw.holdersCutBps),
    nftCutBps: toNumber(feeConfigRaw.nftCutBps),
    protocolCutBps: toNumber(feeConfigRaw.protocolCutBps),
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
    activeBinId: toNumber(raw.activeBin),
    activeBinPrice: toBigInt(raw.activeBinPrice),
    admin: toPubkey(raw.admin),
    creator: toPubkey(raw.creator),
    configAuthority: toPubkey(raw.configAuthority),
    pauseGuardian: toPubkey(raw.pauseGuardian),
    feeWithdrawAuthority: toPubkey(raw.feeWithdrawAuthority),
    feeConfig,
    pausedBits: toNumber(raw.pausedBits),
    baseDecimals: toNumber(raw.baseDecimals),
    quoteDecimals: toNumber(raw.quoteDecimals),
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
  if (v && typeof v === "object" && "toString" in v) return BigInt((v as { toString(): string }).toString());
  return 0n;
}
