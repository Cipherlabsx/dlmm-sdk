/**
 * Example: Fetch pool state and active bin from CipherDLMM
 *
 * Usage: npx ts-node examples/fetch-pool.ts
 */

import { Connection, PublicKey } from "@solana/web3.js";
import { CipherDlmm } from "../src";

const RPC_URL = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
const POOL_ADDRESS = "EoLGqHKvtK9NcxjjnvSxTYYuFMYDeWTFFyKYj1DcJyPB"; // CIPHER/USDC

async function main() {
  const connection = new Connection(RPC_URL, "confirmed");
  const dlmm = await CipherDlmm.create(connection, new PublicKey(POOL_ADDRESS));

  const pool = dlmm.pool;
  console.log("Pool:", pool.address.toBase58());
  console.log("Base mint:", pool.baseMint.toBase58());
  console.log("Quote mint:", pool.quoteMint.toBase58());
  console.log("Bin step:", pool.binStepBps, "bps");
  console.log("Base fee:", pool.baseFeeBps, "bps");
  console.log("Admin:", pool.admin.toBase58());

  const activeBin = dlmm.getActiveBin();
  console.log("\nActive bin:", activeBin.binId);
  console.log("Price:", activeBin.price);

  // Fetch bin arrays around active bin
  const bins = await dlmm.getBinArrays(activeBin.binId - 128, activeBin.binId + 128);
  console.log("\nBin arrays fetched:", bins.length);
  for (const ba of bins) {
    const nonEmpty = ba.bins.filter((b) => b.totalShares > 0n);
    if (nonEmpty.length > 0) {
      console.log(`  Array ${ba.lowerBinIndex}: ${nonEmpty.length} bins with liquidity`);
    }
  }
}

main().catch(console.error);
