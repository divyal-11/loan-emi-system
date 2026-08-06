import type { Request, Response, NextFunction } from "express";
import type { UserRole } from "../models/User";
import { AppError } from "../utils/AppError";
import { ErrorCodes } from "../utils/constants";

/**
 * Factory that returns an Express middleware which checks req.user.role
 * against the list of allowed roles. Must be placed AFTER authMiddleware
 * in the route chain so req.user is already populated.
 *
 * Usage: router.get("/admin-only", authMiddleware, roleMiddleware("admin"), handler)
 */
export function roleMiddleware(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      next(
        new AppError(
          ErrorCodes.FORBIDDEN,
          403,
          "You do not have permission to access this resource.",
        ),
      );
      return;
    }
    next();
  };
}
