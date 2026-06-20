import { Express } from "express";
import {
  protocolParamsRouter, dashboardRouter, epochRouter, poolRouter, drepRouter,
  governanceRouter, addressRouter, tokenRouter, searchRouter
} from "./routers";
import { unsupportedRouter } from "../../middleware/unsupportedRouter";

/** Mounts the Ogmios-served endpoints + a 501 catch-all for everything else. */
export function mountOgmiosControllers(app: Express): void {
  app.use("/api/protocol-params", protocolParamsRouter);
  app.use("/api/dashboard", dashboardRouter);
  app.use("/api/epochs", epochRouter);
  app.use("/api/pools", poolRouter);
  app.use("/api/governance/dreps", drepRouter);
  app.use("/api/governance", governanceRouter);
  app.use("/api/addresses", addressRouter);
  app.use("/api/tokens", tokenRouter);
  app.use("/api/search", searchRouter);
  app.use("/api", unsupportedRouter); // blocks, transactions, etc.
}
