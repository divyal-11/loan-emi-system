import type { Request, Response, NextFunction } from "express";
import type { ZodTypeAny } from "zod";
import { AppError } from "../utils/AppError";
import { ErrorCodes } from "../utils/constants";

/**
 * Returns an Express middleware that validates req.body against the given Zod
 * schema. On success, replaces req.body with the parsed (and coerced) data.
 * On failure, calls next() with a 400 VALIDATION_ERROR.
 */
export function validateRequest(schema: ZodTypeAny) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const message = result.error.issues.map((i: { message: string }) => i.message).join("; ");
      next(new AppError(ErrorCodes.VALIDATION_ERROR, 400, message));
      return;
    }
    req.body = result.data as unknown;
    next();
  };
}
