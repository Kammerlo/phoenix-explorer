import { Router } from "express";
import { unsupportedEnvelope } from "@shared/helpers/envelope";

/** Catch-all that 501s any path not served in the current mode. */
export const unsupportedRouter = Router();
unsupportedRouter.use((req, res) => {
  res.status(501).json(unsupportedEnvelope<unknown>(`${req.method} ${req.baseUrl}${req.path}`));
});
