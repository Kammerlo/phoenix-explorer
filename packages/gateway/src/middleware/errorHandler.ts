import { ErrorRequestHandler } from "express";
import { errorEnvelope } from "@shared/helpers/envelope";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error("Gateway error:", err);
  // Prefer an explicit statusCode; fall back to the upstream Blockfrost SDK's
  // status_code so a "tx not found" surfaces as 404 instead of a generic 500.
  const status =
    typeof err?.statusCode === "number"
      ? err.statusCode
      : typeof err?.status_code === "number"
        ? err.status_code
        : 500;
  res.status(status).json(errorEnvelope<unknown>(err));
};
