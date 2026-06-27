import { Router } from "express";
import { ApiReturnType } from "@shared/APIReturnType";
import { ScriptVerification } from "@shared/dtos/scriptVerification.dto";
import { cache } from "../config/cache";

export const uplcVerificationController = Router();

const UPLC_BY_HASH = "https://api.uplc.link/api/v1/scripts/by-hash";
const TTL = 3600; // 1 hour — source provenance changes rarely
const TIMEOUT_MS = 8000;

interface UplcScript {
  plutusVersion?: string;
  rawHash?: string;
  finalHash?: string;
}
interface UplcResponse {
  status?: string;
  sourceUrl?: string;
  commitHash?: string;
  compilerType?: string;
  compilerVersion?: string;
  txHash?: string;
  scripts?: UplcScript[];
}

/**
 * Proxy uplc.link's public verification API server-side. Keeping it on the
 * gateway avoids browser CORS issues, lets us cache aggressively (provenance is
 * effectively immutable), and matches the connector pattern. Any failure — most
 * commonly a 404 for an unverified/unknown script — degrades to
 * `{ verified: false }` so the badge never dead-ends the page.
 *
 * GET /api/scripts/:scriptHash/verification
 */
uplcVerificationController.get("/:scriptHash/verification", async (req, res) => {
  const scriptHash = req.params.scriptHash;
  const key = `uplc-verify-${scriptHash}`;

  const cached = cache.get(key);
  if (cached !== undefined) {
    res.json({ data: cached, lastUpdated: Date.now() } as ApiReturnType<ScriptVerification>);
    return;
  }

  let result: ScriptVerification = { verified: false, scriptHash };
  try {
    const resp = await fetch(`${UPLC_BY_HASH}/${scriptHash}`, {
      headers: { Accept: "application/json", "User-Agent": "phoenix-explorer-gateway" },
      signal: AbortSignal.timeout(TIMEOUT_MS)
    });
    if (resp.ok) {
      const d = (await resp.json()) as UplcResponse;
      if (d && d.status === "VERIFIED") {
        const script = Array.isArray(d.scripts) ? d.scripts[0] : undefined;
        result = {
          verified: true,
          scriptHash,
          repoUrl: d.sourceUrl,
          commit: d.commitHash,
          compiler: [d.compilerType, d.compilerVersion].filter(Boolean).join(" ") || undefined,
          plutusVersion: script?.plutusVersion,
          txHash: d.txHash
        };
      }
    }
  } catch (err) {
    console.warn("uplc.link verification lookup failed for", scriptHash, "-", (err as Error)?.message);
  }

  cache.set(key, result, TTL);
  res.json({ data: result, lastUpdated: Date.now() } as ApiReturnType<ScriptVerification>);
});
