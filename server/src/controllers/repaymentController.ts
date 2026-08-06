import type { Request, Response } from "express";
import mongoose from "mongoose";
import type { HydratedDocument } from "mongoose";
import { Repayment, type IRepayment, type RepaymentStatus } from "../models/Repayment";
import { LoanApplication } from "../models/LoanApplication";
import { AppError } from "../utils/AppError";
import { ErrorCodes } from "../utils/constants";
import { asyncHandler } from "../utils/asyncHandler";
import { writeAuditEntry } from "../services/auditService";

// ─── Response Formatter with Read-Time Overdue Calculation ─────────────────────

/**
 * Formats a Repayment document for response.
 *
 * Spec §7.4: Read-time OVERDUE computation
 * If status is "UPCOMING" and dueDate < now, the formatted response returns
 * status as "OVERDUE" without modifying the database document.
 */
function formatRepayment(rep: HydratedDocument<IRepayment>): Record<string, unknown> {
  const now = new Date();
  let computedStatus: RepaymentStatus = rep.status;

  if (rep.status === "UPCOMING" && rep.dueDate < now) {
    computedStatus = "OVERDUE";
  }

  return {
    id: rep._id.toString(),
    loanId: rep.loanId.toString(),
    emiNumber: rep.emiNumber,
    dueDate: rep.dueDate.toISOString(),
    principalComponent: rep.principalComponent,
    interestComponent: rep.interestComponent,
    totalAmount: rep.totalAmount,
    status: computedStatus,
    paidAt: rep.paidAt ? rep.paidAt.toISOString() : null,
  };
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

/**
 * GET /api/repayments/:loanId
 * Auth: Borrower (own loan only) or Admin.
 *
 * Performs explicit ownership check in controller (spec §9).
 * Dynamically computes OVERDUE status for past-due UPCOMING installments.
 */
export const getSchedule = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const loanId = req.params["loanId"] as string;

  if (!mongoose.Types.ObjectId.isValid(loanId)) {
    throw new AppError(ErrorCodes.NOT_FOUND, 404, "Loan not found.");
  }

  const loan = await LoanApplication.findById(loanId);
  if (!loan) {
    throw new AppError(ErrorCodes.NOT_FOUND, 404, "Loan not found.");
  }

  // Explicit ownership check for borrower
  if (req.user!.role === "borrower" && loan.applicantId.toString() !== req.user!.id) {
    throw new AppError(ErrorCodes.FORBIDDEN, 403, "You do not have access to this loan's repayment schedule.");
  }

  const repayments = await Repayment.find({ loanId }).sort({ emiNumber: 1 });

  res.status(200).json({
    success: true,
    data: repayments.map(formatRepayment),
  });
});

/**
 * PATCH /api/repayments/:id/pay
 * Auth: Borrower only.
 *
 * Marks an installment as PAID and sets paidAt = now.
 * Writes an EMI_PAID audit log entry.
 *
 * Auto-close logic:
 * If all installments for the associated loan are now PAID, automatically
 * transitions loan status DISBURSED -> CLOSED and writes a CLOSED audit log entry.
 */
export const markPaid = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const id = req.params["id"] as string;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(ErrorCodes.NOT_FOUND, 404, "Repayment installment not found.");
  }

  const repayment = await Repayment.findById(id);
  if (!repayment) {
    throw new AppError(ErrorCodes.NOT_FOUND, 404, "Repayment installment not found.");
  }

  // Fetch parent loan to verify borrower ownership
  const loan = await LoanApplication.findById(repayment.loanId);
  if (!loan) {
    throw new AppError(ErrorCodes.NOT_FOUND, 404, "Associated loan not found.");
  }

  if (loan.applicantId.toString() !== req.user!.id) {
    throw new AppError(ErrorCodes.FORBIDDEN, 403, "You can only pay for your own loan repayments.");
  }

  if (repayment.status === "PAID") {
    throw new AppError(
      ErrorCodes.INVALID_STATE_TRANSITION,
      400,
      "This repayment installment has already been paid.",
    );
  }

  const actorId = req.user!.id;
  const now = new Date();

  // Mark repayment as PAID
  repayment.status = "PAID";
  repayment.paidAt = now;
  await repayment.save();

  // Audit entry for EMI payment
  await writeAuditEntry({
    loanId: loan._id,
    event: "EMI_PAID",
    actor: actorId,
    metadata: {
      repaymentId: repayment._id.toString(),
      emiNumber: repayment.emiNumber,
      totalAmount: repayment.totalAmount,
    },
  });

  // Check if ALL repayments for this loan are now PAID
  const remainingUnpaidCount = await Repayment.countDocuments({
    loanId: loan._id,
    status: { $ne: "PAID" },
  });

  let loanClosed = false;
  if (remainingUnpaidCount === 0 && loan.status === "DISBURSED") {
    loan.status = "CLOSED";
    await loan.save();
    loanClosed = true;

    await writeAuditEntry({
      loanId: loan._id,
      event: "CLOSED",
      actor: actorId,
      metadata: { closedAt: now.toISOString() },
    });
  }

  res.status(200).json({
    success: true,
    data: {
      repayment: formatRepayment(repayment),
      loanStatus: loan.status,
      loanClosed,
    },
  });
});
