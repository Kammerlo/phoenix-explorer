import { NextFunction, Request, Response, RequestHandler } from "express";

/**
 * Wraps an async Express handler so rejected promises reach the global error
 * middleware instead of crashing the process or being silently swallowed.
 */
export function asyncHandler<T = unknown>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
