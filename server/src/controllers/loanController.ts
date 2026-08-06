import type { Request, Response } from "express";
import { z } from "zod";
import mongoose from "mongoose";
import type { HydratedDocument } from "mongoose";
import { LoanApplication, type ILoanApplication } from "../models/LoanApplication";
import { AppError } from "../utils/AppError";
import { ErrorCodes } from "../utils/constants";
import { asyncHandler } from "../utils/asyncHandler";
import { checkEligibility } from "../services/eligibilityService";
import { writeAuditEntry } from "../services/auditService";

// ─── Zod schema ───────────────────────────────────────────────────────────────
// Zod validates types and presence. Business-rule bounds (1000-500000, 3-60)
// are re-checked inside eligibilityService for independent testability.

export const applySchema = z.object({
  amount: z
    .number({ error: "Amount must be a positive number." })
    .positive("Amount must be a positive number."),
  tenureMonths: z
    .number({ error: "Tenure must be a whole number of months." })
    .int("Tenure must be a whole number of months.")
    .positive("Tenure must be positive."),
  purpose: z
    .string({ error: "Purpose is required." })
    .min(1, "Purpose is required.")
    .max(200, "Purpose cannot exceed 200 characters."),
});

type ApplyBody = z.infer<typeof applySchema>;

// ─── Response formatter ───────────────────────────────────────────────────────

function formatLoan(loan: HydratedDocument<ILoanApplication>): Record<string, unknown> {
  return {
    id: loan._id.toString(),
    applicantId: loan.applicantId.toString(),
    amount: loan.amount,
    tenureMonths: loan.tenureMonths,
    interestRate: loan.interestRate,
    purpose: loan.purpose,
    status: loan.status,
    appliedAt: loan.appliedAt.toISOString(),
    decidedAt: loan.decidedAt ? loan.decidedAt.toISOString() : null,
    decidedBy: loan.decidedBy ? loan.decidedBy.toString() : null,
  };
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

/**
 * POST /api/loans/apply — auth: borrower only
 * Validates eligibility, creates the loan with status PENDING,
 * and writes an APPLIED audit entry in the same request (spec §3).
 */
export const apply = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { amount, tenureMonths, purpose } = req.body as ApplyBody;
  const applicantId = req.user!.id;

  // Business-rule checks (bounds + no active loan)
  await checkEligibility(applicantId, amount, tenureMonths);

  const loan = await LoanApplication.create({
    applicantId: new mongoose.Types.ObjectId(applicantId as string),
    amount,
    tenureMonths,
    purpose,
  });

  // Audit entry — APPLIED is the first event in every loan's lifecycle
  await writeAuditEntry({
    loanId: loan._id,
    event: "APPLIED",
    actor: applicantId,
    metadata: { amount, tenureMonths, purpose },
  });

  res.status(201).json({
    success: true,
    data: formatLoan(loan),
  });
});

/**
 * GET /api/loans/mine — auth: borrower only
 * Returns all loan applications belonging to the authenticated borrower,
 * newest first.
 */
export const mine = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const loans = await LoanApplication.find({ applicantId: req.user!.id }).sort({
    appliedAt: -1,
  });

  res.status(200).json({
    success: true,
    data: loans.map(formatLoan),
  });
});

/**
 * GET /api/loans/:id — auth: borrower (own loan only) or admin
 *
 * Per spec §9: the ownership check for borrowers is an EXPLICIT check inside
 * this controller — it must NOT be done in middleware, because the route is
 * shared between borrowers (own-only) and admins (any loan).
 */
export const getById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const id = req.params["id"] as string;

  // Reject obviously invalid ObjectIds immediately rather than letting Mongoose
  // throw a CastError that would surface as an unhandled 500.
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(ErrorCodes.NOT_FOUND, 404, "Loan not found.");
  }

  const loan = await LoanApplication.findById(id);
  if (!loan) {
    throw new AppError(ErrorCodes.NOT_FOUND, 404, "Loan not found.");
  }

  // Borrower ownership check — spec §9 explicitly requires this in the controller
  if (req.user!.role === "borrower" && loan.applicantId.toString() !== req.user!.id) {
    throw new AppError(ErrorCodes.FORBIDDEN, 403, "You do not have access to this loan.");
  }

  res.status(200).json({
    success: true,
    data: formatLoan(loan),
  });
});
