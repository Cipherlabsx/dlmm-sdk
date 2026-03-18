/** CipherDLMM on-chain error codes mapped from the Anchor IDL */
export const CIPHER_DLMM_ERRORS: Record<number, { name: string; msg: string }> = {
  6000: { name: "InvalidLiquidity", msg: "The provided liquidity value is invalid." },
  6001: { name: "CalculationError", msg: "Calculation error occurred during arithmetic operations." },
  6002: { name: "InvalidInput", msg: "The provided input data is invalid." },
  6003: { name: "MissingBins", msg: "Missing liquidity bin accounts for withdrawal." },
  6004: { name: "InternalInconsistency", msg: "Operation aborted due to an internal inconsistency." },
  6005: { name: "UnknownError", msg: "An unknown error has occurred." },
  6006: { name: "SlippageExceeded", msg: "Swap did not meet minimum output (slippage protection)." },
  6007: { name: "InsufficientLiquidity", msg: "Pool does not have sufficient liquidity." },
  6008: { name: "UnauthorizedOperation", msg: "Unauthorized operation attempted." },
  6009: { name: "InvalidAuthority", msg: "Invalid or missing protocol authority." },
  6010: { name: "InvalidAccountState", msg: "The account state is invalid." },
  6011: { name: "MintMismatch", msg: "Token account mint does not match expected mint." },
  6012: { name: "OwnerMismatch", msg: "Token account owner does not match expected authority." },
  6013: { name: "TokenTransferFailed", msg: "Token transfer failed." },
  6014: { name: "PoolPaused", msg: "Pool is currently paused." },
  6015: { name: "PoolAlreadyExists", msg: "Pool already exists for this configuration." },
  6016: { name: "PoolNotFound", msg: "Pool not found." },
  6017: { name: "RegistryViolation", msg: "Pair registry constraint violated." },
  6018: { name: "BinAlreadyExists", msg: "Liquidity bin already exists for this index." },
  6019: { name: "BinNotFound", msg: "Liquidity bin not found." },
  6020: { name: "InvalidBinBounds", msg: "Invalid liquidity bin bounds." },
  6021: { name: "LPTokenMismatch", msg: "LP token does not match this pool." },
  6022: { name: "NotEnoughShares", msg: "Not enough LP shares." },
  6023: { name: "LPVaultMismatch", msg: "LP vault does not match expected authority." },
  6024: { name: "ReentrancyDetected", msg: "Reentrancy detected: operation aborted." },
  6025: { name: "InvalidVaultOwner", msg: "Vault is not owned by the SPL Token program." },
  6026: { name: "InvalidVaultAuthority", msg: "Vault has an unexpected authority." },
  6027: { name: "InvalidVaultMint", msg: "Vault has an unexpected mint." },
  6028: { name: "InvalidVaultData", msg: "Account data too short for valid SPL Token account." },
  6029: { name: "ActiveLock", msg: "Liquidity is locked until the lock period expires." },
  6030: { name: "InsufficientLP", msg: "Insufficient LP tokens." },
  6031: { name: "VaultsAlreadyInitialized", msg: "Pool vaults already initialized." },
  6032: { name: "WrongMode", msg: "Wrong accounting mode for this instruction." },
  6033: { name: "InvalidTokenProgram", msg: "Invalid token program." },
  6034: { name: "InvalidProgramOwner", msg: "Invalid program-owned account." },
  6035: { name: "InvalidPda", msg: "Invalid PDA for the provided account." },
  6036: { name: "InvalidRemainingAccountsLayout", msg: "Invalid remaining accounts layout." },
  6037: { name: "DuplicateBinIndex", msg: "Duplicate bin index provided." },
  6038: { name: "ActiveBinDepositForbidden", msg: "Deposits into the active bin are forbidden." },
  6039: { name: "ActiveBinWithdrawalForbidden", msg: "Withdrawals from the active bin are forbidden." },
  6040: { name: "MissingPositionBin", msg: "Missing position bin account." },
  6041: { name: "PositionPoolMismatch", msg: "Position pool mismatch." },
  6042: { name: "PositionOwnerMismatch", msg: "Position owner mismatch." },
  6043: { name: "BinPoolMismatch", msg: "Bin pool mismatch." },
  6044: { name: "PositionBinPositionMismatch", msg: "PositionBin position mismatch." },
  6045: { name: "PositionBinPoolMismatch", msg: "PositionBin pool mismatch." },
  6046: { name: "AccountingInvariantViolation", msg: "Accounting invariant violated." },
  6047: { name: "InsufficientPositionBinShares", msg: "Insufficient position bin shares." },
  6048: { name: "AccountingMismatch", msg: "Accounting mismatch: bin deltas do not match vault payout." },
  6049: { name: "DuplicateBinAccount", msg: "Duplicate bin account provided." },
  6050: { name: "InvalidMetadata", msg: "NFT metadata is invalid." },
  6051: { name: "InvalidNftRarity", msg: "NFT rarity not found or invalid." },
  6052: { name: "InsufficientOracleData", msg: "Insufficient oracle data." },
  6053: { name: "InvalidTimestamp", msg: "Invalid timestamp for oracle observation." },
  6054: { name: "InvalidOracleWindow", msg: "Invalid oracle observation window." },
  6055: { name: "OraclePoolMismatch", msg: "Oracle pool mismatch." },
  6056: { name: "InvalidBinArrayPda", msg: "Invalid BinArray PDA derivation." },
  6057: { name: "InvalidPositionBinPda", msg: "Invalid PositionBin PDA derivation." },
  6058: { name: "ClaimTooSoon", msg: "Claim cooldown not elapsed." },
  6059: { name: "PositionHasLiquidity", msg: "Position has active liquidity. Withdraw first." },
  6060: { name: "ExcessiveFee", msg: "Fee exceeds maximum allowed (10%)." },
  6061: { name: "FeeConfigImmutable", msg: "Fee configuration is immutable after pool creation." },
  6062: { name: "PauseDurationExceeded", msg: "Pause duration exceeds maximum (7 days)." },
  6063: { name: "InvalidStakePool", msg: "Invalid stake pool." },
};

/** Custom error class for CipherDLMM program errors */
export class CipherDlmmError extends Error {
  readonly code: number;
  readonly errorName: string;

  constructor(code: number, message?: string) {
    const known = CIPHER_DLMM_ERRORS[code];
    const msg = message || known?.msg || `Unknown error ${code}`;
    super(msg);
    this.name = "CipherDlmmError";
    this.code = code;
    this.errorName = known?.name || "UnknownError";
  }
}

/** Parse an Anchor error code from a transaction error */
export function parseProgramError(errorCode: number): CipherDlmmError | null {
  if (CIPHER_DLMM_ERRORS[errorCode]) {
    return new CipherDlmmError(errorCode);
  }
  return null;
}
