/**
 * EMI (Equated Monthly Installment) calculator — spec §7.1.
 *
 * Pure function: no DB access, no Express types, no side effects.
 * Can be unit-tested and verified in complete isolation.
 */

export interface EmiInstallment {
  emiNumber: number;
  principalComponent: number;
  interestComponent: number;
  totalAmount: number;
}

/**
 * Rounds a number to exactly 2 decimal places.
 * Uses Math.round (not toFixed) to keep the return type as number, not string.
 */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Calculates a full amortization schedule for a loan.
 *
 * @param principal        - Loan amount (e.g. 50000)
 * @param annualInterestRate - Annual interest rate as a percentage (e.g. 12 for 12%)
 * @param tenureMonths     - Number of monthly installments (e.g. 12)
 * @returns Array of n installment objects, one per month.
 *
 * Formula (spec §7.1):
 *   r   = (annualInterestRate / 12) / 100    ← monthly rate as decimal
 *   EMI = P * r * (1+r)^n / ((1+r)^n - 1)
 *   If r === 0 (edge case): EMI = P / n
 *
 * Rounding rule (spec §7.1):
 *   Every stored value is rounded to 2 decimal places.
 *   The LAST installment's principalComponent is set to
 *   (principal − sum of all previous principalComponents) so that the
 *   sum of all principalComponents equals the original loan amount exactly.
 */
export function calculateEmiSchedule(
  principal: number,
  annualInterestRate: number,
  tenureMonths: number,
): EmiInstallment[] {
  const r = (annualInterestRate / 12) / 100;
  const n = tenureMonths;

  // ── Compute constant EMI ──────────────────────────────────────────────────
  let emi: number;
  if (r === 0) {
    // Zero-interest edge case: divide principal evenly
    emi = round2(principal / n);
  } else {
    const compoundFactor = Math.pow(1 + r, n);
    emi = round2((principal * r * compoundFactor) / (compoundFactor - 1));
  }

  // ── Amortization loop ─────────────────────────────────────────────────────
  const schedule: EmiInstallment[] = [];
  let remainingPrincipal = principal;
  let cumulativePrincipal = 0;

  for (let i = 1; i <= n; i++) {
    const interestComponent = round2(remainingPrincipal * r);

    let principalComponent: number;
    if (i === n) {
      // Last installment: absorb any rounding remainder so that
      // sum(all principalComponents) === original principal exactly.
      principalComponent = round2(principal - cumulativePrincipal);
    } else {
      principalComponent = round2(emi - interestComponent);
    }

    const totalAmount = round2(principalComponent + interestComponent);
    remainingPrincipal = round2(remainingPrincipal - principalComponent);
    cumulativePrincipal = round2(cumulativePrincipal + principalComponent);

    schedule.push({ emiNumber: i, principalComponent, interestComponent, totalAmount });
  }

  return schedule;
}
