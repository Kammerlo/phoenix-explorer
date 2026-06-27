/**
 * Source-provenance verification result for a Plutus script, as reported by
 * uplc.link (an Etherscan-style "recompile the source, match the on-chain hash"
 * verifier). `verified: false` covers both "not in the registry" and "provider
 * can't verify", so the UI can always render a sensible badge.
 */
export interface ScriptVerification {
  verified: boolean;
  scriptHash?: string;
  /** Public source repository the on-chain bytecode was built from. */
  repoUrl?: string;
  /** Commit hash the source was verified at. */
  commit?: string;
  /** e.g. "AIKEN v1.0.26-alpha". */
  compiler?: string;
  /** e.g. "V2" / "V3". */
  plutusVersion?: string;
  /** A transaction that carried/registered the verified script. */
  txHash?: string;
}
