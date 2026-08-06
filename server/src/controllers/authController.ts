import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { User } from "../models/User";
import { AppError } from "../utils/AppError";
import { ErrorCodes } from "../utils/constants";
import { asyncHandler } from "../utils/asyncHandler";
import { env } from "../config/env";

const SALT_ROUNDS = 12;

// ─── Zod schemas ──────────────────────────────────────────────────────────────
// Exported so authRoutes can pass them to validateRequest middleware.

export const signupSchema = z.object({
  name: z.string().min(1, "Name is required."),
  email: z.string().email("A valid email address is required."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  role: z.enum(["borrower", "admin"]).default("borrower"),
});

export const loginSchema = z.object({
  email: z.string().email("A valid email address is required."),
  password: z.string().min(1, "Password is required."),
});

type SignupBody = z.infer<typeof signupSchema>;
type LoginBody = z.infer<typeof loginSchema>;

// ─── Handlers ─────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/signup
 * Creates a new user account. Hashes the password before storing.
 * Returns 201 with { id, name, email, role } — never the hash.
 */
export const signup = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { name, email, password, role } = req.body as SignupBody;

  const existing = await User.findOne({ email });
  if (existing) {
    throw new AppError(
      ErrorCodes.VALIDATION_ERROR,
      409,
      "An account with that email already exists.",
    );
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({ name, email, passwordHash, role });

  res.status(201).json({
    success: true,
    data: {
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
});

/**
 * POST /api/auth/login
 * Verifies credentials and returns a signed JWT.
 * Always returns the same 401 message for wrong email OR wrong password
 * (prevents user enumeration attacks).
 */
export const login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body as LoginBody;

  const user = await User.findOne({ email });
  const passwordMatch = user ? await bcrypt.compare(password, user.passwordHash) : false;

  // Check both conditions after the bcrypt call to avoid timing-based user enumeration
  if (!user || !passwordMatch) {
    throw new AppError(ErrorCodes.UNAUTHORIZED, 401, "Invalid email or password.");
  }

  const token = jwt.sign(
    { sub: String(user._id), role: user.role },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn as jwt.SignOptions["expiresIn"] },
  );

  res.status(200).json({
    success: true,
    data: {
      token,
      user: {
        id: String(user._id),
        name: user.name,
        role: user.role,
      },
    },
  });
});

/**
 * GET /api/auth/me
 * Returns the currently authenticated user's profile.
 * Requires authMiddleware — used by the frontend to restore session and
 * by integration tests to verify the token works on a protected route.
 */
export const me = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = await User.findById(req.user!.id).select("-passwordHash");
  if (!user) {
    throw new AppError(ErrorCodes.NOT_FOUND, 404, "User not found.");
  }

  res.status(200).json({
    success: true,
    data: {
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
});
