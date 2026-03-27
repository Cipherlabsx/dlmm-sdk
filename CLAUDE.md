# DLMM SDK — Claude Context

## What this is
TypeScript SDK for Orbit Finance DLMM — published as `@orbitfinance/dlmm` on npm.

## Architecture
- `src/cipher-dlmm.ts` — main `CipherDlmm` class (public entry point)
- `src/accounts/` — Pool, Position, BinArray type definitions
- `src/generated/` — **auto-generated** Anchor account types from IDL (do not edit)
- `examples/` — usage examples
- Build: `tsup` → `dist/`

## What NOT to touch
- `src/generated/` — regenerated from Anchor IDL via Codama; manual edits will be overwritten on next `anchor build`
- `dist/` — build output

## Current status
- Program ID: `Fn3fA3fjsmpULNL7E9U79jKTe1KHxPtQeWdURCbJXCnM`
- 6 distribution strategies: uniform, concentrated, skew_bid, skew_ask, bid-ask, curve
- All write operations return unsigned `VersionedTransaction` — caller signs
- Published to npm; version bump requires `npm publish` after `tsup` build
