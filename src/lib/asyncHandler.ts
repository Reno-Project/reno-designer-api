import type { NextFunction, Request, RequestHandler, Response } from "express";

/**
 * Wraps an async route handler so a thrown error / rejected promise reaches the
 * Express error middleware. Express 4 doesn't do this on its own.
 */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
