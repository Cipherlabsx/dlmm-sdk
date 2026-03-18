<p align="center">
  <img src="https://img.shields.io/npm/v/@orbitfinance/dlmm?color=blue&label=npm" alt="npm" />
  <img src="https://img.shields.io/badge/Solana-mainnet-9945FF?logo=solana" alt="Solana" />
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License" />
  <img src="https://img.shields.io/badge/TypeScript-strict-blue?logo=typescript" alt="TypeScript" />
</p>

<h1 align="center">@orbitfinance/dlmm</h1>
<p align="center">TypeScript SDK for <a href="https://www.cipherlabsx.com">Orbit Finance DLMM</a> on Solana</p>

---

## How it works

Orbit Finance uses a **bin-based concentrated liquidity** model. Liquidity is placed into discrete price bins, and swaps move through bins sequentially. This gives LPs precise control over their price range.

```
Price ($)
  ▲
  │          ┌──┐
  │       ┌──┤  │
  │    ┌──┤  │  ├──┐
  │ ┌──┤  │  │  │  ├──┐
  │ │  │  │  │  │  │  │
  └─┴──┴──┴──┴──┴──┴──┴──▶ Bins
    -3  -2  -1  0  +1 +2 +3
                ▲
            active bin
            (current price)

  ◄── quote (USDC) ──►◄── base (CIPHER) ──►
      bins below            bins above
      active bin            active bin
```

Bins below the active price hold quote tokens (USDC). Bins above hold base tokens (CIPHER). As price moves, bins get filled/emptied and LPs earn fees from every swap that crosses their range.

---

## Install

```bash
npm install @orbitfinance/dlmm @coral-xyz/anchor @solana/web3.js
```

## Quick start

```typescript
import { Connection, PublicKey } from "@solana/web3.js";
import { CipherDlmm } from "@orbitfinance/dlmm";

const connection = new Connection("https://api.mainnet-beta.solana.com");
const pool = new PublicKey("EoLGqHKvtK9NcxjjnvSxTYYuFMYDeWTFFyKYj1DcJyPB");

// connect to a pool
const dlmm = await CipherDlmm.create(connection, pool);
console.log("active bin:", dlmm.getActiveBin());

// get positions
const positions = await dlmm.getPositionsByUser(myWallet);

// deposit liquidity (returns unsigned tx — you sign it)
const txs = await dlmm.addLiquidityByStrategy({
  user: myWallet,
  positionNonce: 0n,
  totalBaseAmount: 1_000_000_000n,  // 1 CIPHER
  totalQuoteAmount: 5_000_000n,     // 5 USDC
  strategy: "concentrated",
  minBinId: -1020,
  maxBinId: -960,
});

// swap
const swapTx = await dlmm.swap({
  user: myWallet,
  amountIn: 1_000_000n,       // 1 USDC
  minAmountOut: 200_000_000n,  // min 0.2 CIPHER
  swapForBase: true,
});

// claim staking rewards
const claimTx = await dlmm.claimHolderRewards(myWallet);
```

All write methods return **unsigned** `VersionedTransaction` objects. You handle signing however you want (Keypair, wallet adapter, multisig, whatever).

---

## CipherDlmm class

| Method | Returns | What it does |
|--------|---------|--------------|
| `CipherDlmm.create(conn, pool)` | `CipherDlmm` | Connect to a pool |
| `.getActiveBin()` | `ActiveBin` | Current price bin |
| `.getBinArrays(min?, max?)` | `BinArrayState[]` | Bin liquidity data |
| `.getPositionsByUser(user)` | `UserPosition[]` | LP positions |
| `.addLiquidityByStrategy(params)` | `VersionedTransaction[]` | Deposit with auto-distribution |
| `.removeLiquidity(params)` | `VersionedTransaction` | Withdraw |
| `.swap(params)` | `VersionedTransaction` | Swap tokens |
| `.initializePosition(user, nonce)` | `VersionedTransaction` | Create new position |
| `.closePosition(user, pos)` | `VersionedTransaction` | Close empty position |
| `.claimHolderRewards(user)` | `VersionedTransaction` | Claim USDC rewards |
| `.initHolderState(user)` | `VersionedTransaction` | One-time init for rewards |

## Distribution strategies

Control how liquidity spreads across bins:

```
uniform        concentrated      skew_bid         bid-ask
████████████   ▁▂▄█████▄▂▁      █████▄▃▂▁▁      ███▂▁▁▁▂███
(flat)         (tight range)     (buy-heavy)      (edges only)
```

| Strategy | Use case |
|----------|----------|
| `"uniform"` | Even spread, simple |
| `"concentrated"` | Tight range around current price, max fee capture |
| `"skew_bid"` | Bullish — more liquidity on the buy side |
| `"skew_ask"` | Bearish — more liquidity on the sell side |
| `"bid-ask"` | Market making — thick at edges, thin in the middle |
| `"curve"` | Wider bell curve, less concentrated |

## Low-level utilities

Don't need the class? Everything is also exported as standalone functions:

```typescript
import {
  // PDAs
  derivePoolPda,
  deriveBinArrayPda,
  derivePositionPda,

  // price math
  calculatePriceQ64_64,
  binIdToPrice,
  priceToBinId,

  // distribution
  calculateDistributionWeights,
  allocateToBins,

  // fetching
  fetchPool,
  fetchBinArraysForRange,

  // tx building
  buildTransaction,

  // errors
  parseProgramError,
} from "@orbitfinance/dlmm";
```

## Program info

| | |
|---|---|
| **Program ID** | `Fn3fA3fjsmpULNL7E9U79jKTe1KHxPtQeWdURCbJXCnM` |
| **Network** | Solana mainnet |
| **Website** | [cipherlabsx.com](https://www.cipherlabsx.com) |
| **DEX** | [markets.cipherlabsx.com](https://markets.cipherlabsx.com) |

## License

MIT
