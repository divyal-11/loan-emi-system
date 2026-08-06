import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { AppError } from "../utils/AppError";
import { ErrorCodes } from "../utils/constants";
import type { UserRole } from "../models/User";

interface JwtPayload {
  sub: string;
  role: UserRole;
  iat: number;
  exp: number;
}

/**
 * Verifies the Bearer token in the Authorization header.
 * On success, attaches { id, role } to req.user and calls next().
 * On failure, calls next() with a 401 UNAUTHORIZED AppError.
 */
export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    next(new AppError(ErrorCodes.UNAUTHORIZED, 401, "Authorization token is missing."));
    return;
  }

  const token = authHeader.substring(7);
  try {
    const payload = jwt.verify(token, env.jwtSecret) as JwtPayload;
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    next(new AppError(ErrorCodes.UNAUTHORIZED, 401, "Invalid or expired token."));
  }
}
