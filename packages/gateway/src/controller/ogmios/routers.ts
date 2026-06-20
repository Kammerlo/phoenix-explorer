import { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler";
import { ogmiosServices } from "@shared/ogmios/services";
import { ogmiosBackends } from "../../config/ogmios";
import { ParsedUrlQuery } from "querystring";

const q = (req: { query: unknown }) => req.query as ParsedUrlQuery;
const p = (v: string | string[]) => String(Array.isArray(v) ? v[0] : v);

export const protocolParamsRouter = Router();
protocolParamsRouter.get("", asyncHandler(async (_req, res) => {
  res.json(await ogmiosServices.getCurrentProtocolParameters(ogmiosBackends()));
}));

export const dashboardRouter = Router();
dashboardRouter.get("/stats", asyncHandler(async (_req, res) => {
  res.json(await ogmiosServices.getDashboardStats(ogmiosBackends()));
}));

export const epochRouter = Router();
epochRouter.get("/:epochId", asyncHandler(async (req, res) => {
  res.json(await ogmiosServices.getEpoch(ogmiosBackends(), Number(p(req.params.epochId))));
}));

export const poolRouter = Router();
poolRouter.get("", asyncHandler(async (req, res) => {
  res.json(await ogmiosServices.getPoolList(ogmiosBackends(), q(req)));
}));
poolRouter.get("/:poolId", asyncHandler(async (req, res) => {
  res.json(await ogmiosServices.getPoolDetail(ogmiosBackends(), p(req.params.poolId)));
}));

export const drepRouter = Router();
drepRouter.get("", asyncHandler(async (req, res) => {
  res.json(await ogmiosServices.getDreps(ogmiosBackends(), q(req)));
}));
drepRouter.get("/:drepId", asyncHandler(async (req, res) => {
  res.json(await ogmiosServices.getDrep(ogmiosBackends(), p(req.params.drepId)));
}));

export const governanceRouter = Router();
governanceRouter.get("", asyncHandler(async (req, res) => {
  res.json(await ogmiosServices.getGovernanceOverviewList(ogmiosBackends(), q(req)));
}));
governanceRouter.get("/:txHash/:index", asyncHandler(async (req, res) => {
  res.json(await ogmiosServices.getGovernanceDetail(ogmiosBackends(), p(req.params.txHash), p(req.params.index)));
}));
governanceRouter.get("/:txHash/:index/votes", asyncHandler(async (req, res) => {
  res.json(await ogmiosServices.getGovernanceActionVotes(ogmiosBackends(), p(req.params.txHash), p(req.params.index)));
}));

export const addressRouter = Router();
addressRouter.get("/:address", asyncHandler(async (req, res) => {
  res.json(await ogmiosServices.getWalletAddressFromAddress(ogmiosBackends(), p(req.params.address)));
}));
addressRouter.get("/:address/stake", asyncHandler(async (req, res) => {
  res.json(await ogmiosServices.getWalletStakeFromAddress(ogmiosBackends(), p(req.params.address)));
}));

export const tokenRouter = Router();
tokenRouter.get("/:tokenId", asyncHandler(async (req, res) => {
  res.json(await ogmiosServices.getTokenDetail(ogmiosBackends(), p(req.params.tokenId)));
}));
tokenRouter.get("/:tokenId/holders", asyncHandler(async (req, res) => {
  res.json(await ogmiosServices.getTokenHolders(ogmiosBackends(), p(req.params.tokenId), q(req)));
}));

export const searchRouter = Router();
searchRouter.get("", asyncHandler(async (req, res) => {
  res.json(await ogmiosServices.search(ogmiosBackends(), String((req.query as ParsedUrlQuery).query ?? "")));
}));
