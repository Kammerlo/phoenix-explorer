import { Router } from "express";
import { API, POOL_API } from "../config/blockfrost";
import { SearchResult } from "@shared/dtos/seach.dto";
import { ApiReturnType } from "@shared/APIReturnType";

export const searchController = Router();

/** Silently swallow any error and return null — used to probe Blockfrost */
async function probe<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}

searchController.get("", async (req, res) => {
  const q = String(req.query.q ?? "").trim();

  if (!q || q.length < 2) {
    return res.json({ data: [], lastUpdated: Date.now(), total: 0 } as ApiReturnType<SearchResult[]>);
  }

  const results: SearchResult[] = [];

  // ── Governance action: {64hex}#{index} ──────────────────────────────────────
  const govMatch = /^([0-9a-f]{64})#(\d+)$/i.exec(q);
  if (govMatch) {
    const [, txHash, indexStr] = govMatch;
    const [govResult, txResult] = await Promise.all([
      probe(() => API.governance.proposal(txHash, Number(indexStr))),
      probe(() => API.txs(txHash)),
    ]);
    if (govResult) results.push({ type: "gov_action", id: txHash, extraId: indexStr });
    else if (txResult) results.push({ type: "transaction", id: txHash });
    return res.json({ data: results, lastUpdated: Date.now(), total: results.length });
  }

  // ── 64-char hex: transaction hash OR block hash ──────────────────────────────
  if (/^[0-9a-f]{64}$/i.test(q)) {
    const [txResult, blockResult] = await Promise.all([
      probe(() => API.txs(q)),
      probe(() => API.blocks(q)),
    ]);
    if (txResult) results.push({ type: "transaction", id: q });
    if (blockResult) results.push({ type: "block", id: q, label: blockResult.height != null ? String(blockResult.height) : undefined });
    return res.json({ data: results, lastUpdated: Date.now(), total: results.length });
  }

  // ── 56-char hex: policy ID ───────────────────────────────────────────────────
  if (/^[0-9a-f]{56}$/i.test(q)) {
    const assets = await probe(() => API.assetsPolicyById(q, { count: 1, page: 1 }));
    if (assets && assets.length > 0) {
      results.push({ type: "policy", id: q });
    }
    return res.json({ data: results, lastUpdated: Date.now(), total: results.length });
  }

  // ── Cardano payment address ──────────────────────────────────────────────────
  if (/^addr1[a-z0-9]+$/i.test(q)) {
    // bech32 with checksum — format valid means the address exists
    results.push({ type: "address", id: q });
    return res.json({ data: results, lastUpdated: Date.now(), total: results.length });
  }

  // ── Stake address ────────────────────────────────────────────────────────────
  if (/^stake1[a-z0-9]+$/i.test(q)) {
    results.push({ type: "stake", id: q });
    return res.json({ data: results, lastUpdated: Date.now(), total: results.length });
  }

  // ── Stake pool ───────────────────────────────────────────────────────────────
  // Pool lookups require blockfrost.io. When only demeter is configured we
  // skip the lookup and return no result so the search bar simply doesn't
  // resolve pool IDs (rather than failing).
  if (/^pool1[a-z0-9]{50,}$/i.test(q)) {
    if (POOL_API) {
      const blockfrost = POOL_API;
      const poolResult = await probe(() => blockfrost.poolsById(q));
      if (poolResult) {
        const meta = await probe(() => blockfrost.poolMetadata(q));
        const label = meta?.ticker ?? meta?.name ?? undefined;
        results.push({ type: "pool", id: q, label });
      }
    }
    return res.json({ data: results, lastUpdated: Date.now(), total: results.length });
  }

  // ── DRep ─────────────────────────────────────────────────────────────────────
  if (/^drep1[a-z0-9]+$/i.test(q)) {
    const drepResult = await probe(() => API.governance.drepsById(q));
    if (drepResult) results.push({ type: "drep", id: q });
    return res.json({ data: results, lastUpdated: Date.now(), total: results.length });
  }

  // ── Token fingerprint (asset1...) ────────────────────────────────────────────
  if (/^asset1[a-z0-9]+$/i.test(q)) {
    const assetResult = await probe(() => API.assetsById(q));
    if (assetResult) {
      const label = assetResult.metadata?.name ?? undefined;
      results.push({ type: "token", id: q, label });
    }
    return res.json({ data: results, lastUpdated: Date.now(), total: results.length });
  }

  // ── Pure number: epoch or block ──────────────────────────────────────────────
  if (/^\d+$/.test(q)) {
    const n = Number(q);
    const [epochResult, blockResult] = await Promise.all([
      probe(() => API.epochs(n)),
      probe(() => API.blocks(n as unknown as string)),
    ]);
    if (epochResult) results.push({ type: "epoch", id: q });
    if (blockResult) results.push({ type: "block", id: q, label: String(n) });
    return res.json({ data: results, lastUpdated: Date.now(), total: results.length });
  }

  // ── Free-text: token name search ────────────────────────────────────────────
  // Only safe printable chars, not already matched above as a pattern
  if (/^[a-zA-Z0-9$.\-_ ]+$/.test(q)) {
    // Scan first 3 pages of recently minted assets and match by decoded name
    for (let page = 1; page <= 3 && results.length < 5; page++) {
      const assets = await probe(() => API.assets({ count: 100, page }));
      if (!assets || assets.length === 0) break;

      for (const asset of assets) {
        if (asset.asset.length <= 56) continue; // skip pure-policy-id entries
        let decoded = "";
        try { decoded = Buffer.from(asset.asset.slice(56), "hex").toString("utf-8"); } catch { continue; }
        if (!decoded || !decoded.toLowerCase().includes(q.toLowerCase())) continue;
        results.push({ type: "token", id: asset.asset, label: decoded });
        if (results.length >= 5) break;
      }
    }
  }

  res.json({ data: results, lastUpdated: Date.now(), total: results.length } as ApiReturnType<SearchResult[]>);
});
