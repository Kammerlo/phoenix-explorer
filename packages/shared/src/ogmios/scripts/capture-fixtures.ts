/* One-shot fixture recorder. Run with:
 *   OGMIOS_URL=... KUPO_URL=... npx ts-node packages/shared/src/ogmios/scripts/capture-fixtures.ts
 * Writes trimmed real responses into ../__fixtures__/. Never commit secrets — URLs come from env.
 */
import { writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";
import { OgmiosClient, KupoClient } from "../client";

const OGMIOS_URL = process.env.OGMIOS_URL;
const KUPO_URL = process.env.KUPO_URL;
if (!OGMIOS_URL) throw new Error("set OGMIOS_URL");

const outDir = resolve(__dirname, "../__fixtures__");
mkdirSync(outDir, { recursive: true });
const write = (name: string, data: unknown) =>
  writeFileSync(resolve(outDir, name), JSON.stringify(data, null, 2) + "\n");

async function main() {
  const og = new OgmiosClient(OGMIOS_URL!);
  write("protocolParameters.json", await og.query("queryLedgerState/protocolParameters"));
  write("tip.json", await og.query("queryNetwork/tip"));
  write("blockHeight.json", await og.query("queryNetwork/blockHeight"));
  write("epoch.json", await og.query("queryLedgerState/epoch"));
  write("eraSummaries.json", await og.query("queryLedgerState/eraSummaries"));
  write("treasuryAndReserves.json", await og.query("queryLedgerState/treasuryAndReserves"));

  const pools = (await og.query("queryLedgerState/stakePools", { includeStake: true })) as Record<string, unknown>;
  const firstTwo = Object.fromEntries(Object.entries(pools).slice(0, 2));
  write("stakePools.sample.json", firstTwo);

  const dreps = (await og.query("queryLedgerState/delegateRepresentatives")) as unknown[];
  write("delegateRepresentatives.sample.json", dreps.slice(0, 2));

  write("governanceProposals.json", await og.query("queryLedgerState/governanceProposals"));

  // rewardAccountSummaries needs a stake address; reuse a pool's rewardAccount.
  const rewardAccount = (Object.values(firstTwo)[0] as { rewardAccount?: string })?.rewardAccount;
  if (rewardAccount) {
    write("rewardAccountSummaries.json", await og.query("queryLedgerState/rewardAccountSummaries", { keys: [rewardAccount] }));
  }

  if (KUPO_URL) {
    const kupo = new KupoClient(KUPO_URL);
    write("kupoHealth.json", await kupo.health());
    // best-effort: may be [] if the shared index is restricted
    const owner = (Object.values(firstTwo)[0] as { owners?: string[] })?.owners?.[0];
    if (owner) write("kupoMatches.sample.json", await kupo.matches(`${owner}/*`, { unspent: true }));
  }
  console.log("fixtures written to", outDir);
}
main().catch((e) => { console.error(e); process.exit(1); });
