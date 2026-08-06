import type { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError";
import { ErrorCodes } from "../utils/constants";
import { logger } from "../utils/logger";

interface MongoError {
  code: number;
  keyValue?: Record<string, unknown>;
}

function isMongoError(err: unknown): err is MongoError {
  return typeof err === "object" && err !== null && "code" in err;
}

/**
 * Central error handler — must be registered LAST in app.ts (after all routes).
 * Formats every error into the standard { success, error: { code, message } } envelope.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Known operational errors
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message },
    });
    return;
  }

  // Mongoose unique-constraint violation (e.g. duplicate email)
  if (isMongoError(err) && err.code === 11000) {
    res.status(409).json({
      success: false,
      error: {
        code: ErrorCodes.VALIDATION_ERROR,
        message: "A resource with that value already exists.",
      },
    });
    return;
  }

  // Unknown / programmer errors — log full detail, send safe message
  logger.error("Unhandled error", { err });
  res.status(500).json({
    success: false,
    error: { code: ErrorCodes.INTERNAL_ERROR, message: "An unexpected error occurred." },
  });
}
