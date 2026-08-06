import type { ErrorCode } from "./constants";

/**
 * Operational error that maps to a specific HTTP status and API error code.
 * Controllers throw this; errorHandler middleware catches it and formats the
 * response envelope. Never throw raw Error objects from controllers.
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;

  constructor(code: ErrorCode, statusCode: number, message: string) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    // Restore the prototype chain after extending built-ins in TypeScript
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
