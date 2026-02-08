import type { Request, Response, NextFunction } from "express"
import { isSnapraidNotFoundError } from "../routes/snapraid-handlers"

type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<void | Response>

/**
 * Wraps an async route handler so that rejected promises are passed to the next error middleware.
 */
export function asyncHandler(fn: AsyncRequestHandler) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

/**
 * Error middleware: logs the error and sends a consistent JSON response.
 * Maps SnapRAID-not-found errors to 503, others to 500.
 */
export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  void next // required 4-arg signature for Express error middleware
  console.error(err)
  if (res.headersSent) return

  if (isSnapraidNotFoundError(err)) {
    res.status(503).json({
      error: "SnapRAID binary not found",
      code: "SNAPRAID_NOT_FOUND",
    })
    return
  }

  const message =
    err instanceof Error ? err.message : "Internal server error"
  res.status(500).json({ error: message })
}
