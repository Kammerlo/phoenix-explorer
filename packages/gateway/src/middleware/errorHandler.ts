import { ErrorRequestHandler } from "express";
import { errorEnvelope } from "@shared/helpers/envelope";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error("Gateway error:", err);
  const status = typeof err?.statusCode === "number" ? err.statusCode : 500;
  res.status(status).json(errorEnvelope<unknown>(err));
};
