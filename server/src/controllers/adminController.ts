import type { Request, Response } from "express";
import { z } from "zod";
import mongoose from "mongoose";
import type { HydratedDocument } from "mongoose";
import { LoanApplication, type ILoanApplication } from "../models/LoanApplication";
import { Repayment, type IRepayment } from "../models/Repayment";
import { AppError } from "../utils/AppError";
import { ErrorCodes } from "../utils/constants";
import { asyncHandler } from "../utils/asyncHandler";
import { calculateEmiSchedule } from "../services/emiCalculator";
import { writeAuditEntry } from "../services/auditService";

// ─── Zod schema ───────────────────────────────────────────────────────────────

export const rejectSchema = z.object({
  reason: z.string().max(500, "Reason cannot exceed 500 characters.").optional(),
});

type RejectBody = z.infer<typeof rejectSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Adds n calendar months to a date, returning a new Date (does not mutate).
 * Used to compute due dates: EMI 1 due = appliedAt + 1 month, etc.
 */
function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

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

function formatRepayment(rep: HydratedDocument<IRepayment>): Record<string, unknown> {
  return {
    id: rep._id.toString(),
    loanId: rep.loanId.toString(),
    emiNumber: rep.emiNumber,
    dueDate: rep.dueDate.toISOString(),
    principalComponent: rep.principalComponent,
    interestComponent: rep.interestComponent,
    totalAmount: rep.totalAmount,
    status: rep.status,
    paidAt: rep.paidAt ? rep.paidAt.toISOString() : null,
  };
}

/** Validates and resolves a loan by id; throws 404 if not found or id is invalid. */
async function findLoanOrThrow(id: string): Promise<HydratedDocument<ILoanApplication>> {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(ErrorCodes.NOT_FOUND, 404, "Loan not found.");
  }
  const loan = await LoanApplication.findById(id);
  if (!loan) {
    throw new AppError(ErrorCodes.NOT_FOUND, 404, "Loan not found.");
  }
  return loan;
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/loans/pending — admin only
 * Returns all PENDING loan applications, newest first.
 */
export const getPending = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  const loans = await LoanApplication.find({ status: "PENDING" }).sort({ appliedAt: -1 });
  res.status(200).json({ success: true, data: loans.map(formatLoan) });
});

/**
 * PATCH /api/admin/loans/:id/approve — admin only
 *
 * Two-step state transition in a single request (spec §7.3):
 *   PENDING → APPROVED → DISBURSED
 *
 * On success:
 *   1. Sets status APPROVED, records decidedAt/decidedBy, writes APPROVED audit entry.
 *   2. Calls calculateEmiSchedule to generate the amortization schedule.
 *   3. Bulk-inserts one Repayment doc per installment (dueDate = appliedAt + n months).
 *   4. Sets status DISBURSED, writes DISBURSED audit entry.
 *   5. Returns the updated loan + full repayment schedule.
 */
export const approve = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const id = req.params["id"] as string;
  const loan = await findLoanOrThrow(id);

  if (loan.status !== "PENDING") {
    throw new AppError(
      ErrorCodes.INVALID_STATE_TRANSITION,
      400,
      `Cannot approve a loan with status "${loan.status}". Only PENDING loans can be approved.`,
    );
  }

  const actorId = req.user!.id as string;
  const now = new Date();

  // ── Step 1: PENDING → APPROVED ────────────────────────────────────────────
  loan.status = "APPROVED";
  loan.decidedAt = now;
  loan.decidedBy = new mongoose.Types.ObjectId(actorId);
  await loan.save();
  await writeAuditEntry({ loanId: loan._id, event: "APPROVED", actor: actorId });

  // ── Step 2: Generate EMI schedule (Phase 4 wired in here) ─────────────────
  const schedule = calculateEmiSchedule(loan.amount, loan.interestRate, loan.tenureMonths);

  // ── Step 3: Bulk-insert Repayment docs ────────────────────────────────────
  // dueDate = appliedAt + emiNumber months — consistent reference across all installments
  const repaymentDocs = schedule.map((inst) => ({
    loanId: loan._id,
    emiNumber: inst.emiNumber,
    dueDate: addMonths(loan.appliedAt, inst.emiNumber),
    principalComponent: inst.principalComponent,
    interestComponent: inst.interestComponent,
    totalAmount: inst.totalAmount,
    status: "UPCOMING" as const,
    paidAt: null,
  }));

  const repayments = await Repayment.insertMany(repaymentDocs);

  // ── Step 4: APPROVED → DISBURSED ─────────────────────────────────────────
  loan.status = "DISBURSED";
  await loan.save();
  await writeAuditEntry({
    loanId: loan._id,
    event: "DISBURSED",
    actor: actorId,
    metadata: { repaymentCount: schedule.length },
  });

  res.status(200).json({
    success: true,
    data: {
      loan: formatLoan(loan),
      repayments: repayments.map(formatRepayment),
    },
  });
});

/**
 * PATCH /api/admin/loans/:id/reject — admin only
 *
 * State transition: PENDING → REJECTED
 * Optional `reason` from request body is stored in the audit entry metadata.
 */
export const reject = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const id = req.params["id"] as string;
  const loan = await findLoanOrThrow(id);

  if (loan.status !== "PENDING") {
    throw new AppError(
      ErrorCodes.INVALID_STATE_TRANSITION,
      400,
      `Cannot reject a loan with status "${loan.status}". Only PENDING loans can be rejected.`,
    );
  }

  const { reason } = req.body as RejectBody;
  const actorId = req.user!.id as string;

  loan.status = "REJECTED";
  loan.decidedAt = new Date();
  loan.decidedBy = new mongoose.Types.ObjectId(actorId);
  await loan.save();

  await writeAuditEntry({
    loanId: loan._id,
    event: "REJECTED",
    actor: actorId,
    metadata: reason ? { reason } : {},
  });

  res.status(200).json({ success: true, data: formatLoan(loan) });
});
