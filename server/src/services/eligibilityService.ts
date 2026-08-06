import { LoanApplication } from "../models/LoanApplication";
import { AppError } from "../utils/AppError";
import { ErrorCodes } from "../utils/constants";

const MIN_AMOUNT = 1000;
const MAX_AMOUNT = 500_000;
const MIN_TENURE = 3;
const MAX_TENURE = 60;

/**
 * Checks all three eligibility rules from spec §7.2.
 * Throws an AppError if any rule is violated.
 * Called by loanController.apply before the loan is created.
 *
 * Rules:
 *   1. amount must be between 1,000 and 500,000 (inclusive)
 *   2. tenureMonths must be between 3 and 60 (inclusive)
 *   3. applicant must have no existing loan in PENDING, APPROVED, or DISBURSED status
 */
export async function checkEligibility(
  applicantId: string,
  amount: number,
  tenureMonths: number,
): Promise<void> {
  if (amount < MIN_AMOUNT || amount > MAX_AMOUNT) {
    throw new AppError(
      ErrorCodes.VALIDATION_ERROR,
      400,
      `Loan amount must be between ${MIN_AMOUNT.toLocaleString()} and ${MAX_AMOUNT.toLocaleString()}.`,
    );
  }

  if (tenureMonths < MIN_TENURE || tenureMonths > MAX_TENURE) {
    throw new AppError(
      ErrorCodes.VALIDATION_ERROR,
      400,
      `Loan tenure must be between ${MIN_TENURE} and ${MAX_TENURE} months.`,
    );
  }

  const activeLoan = await LoanApplication.findOne({
    applicantId,
    status: { $in: ["PENDING", "APPROVED", "DISBURSED"] },
  });

  if (activeLoan) {
    throw new AppError(
      ErrorCodes.ACTIVE_LOAN_EXISTS,
      409,
      "You already have an active loan. Please repay or close it before applying again.",
    );
  }
}
