/**
 * Unit tests for emiCalculator — spec §11 (tasks 9–10).
 *
 * Pure function: no mocking needed, no DB, no Express.
 * All expected values are hand-computed so the test serves as a
 * mathematical proof of correctness, not just a snapshot.
 */

import { calculateEmiSchedule } from "../../src/services/emiCalculator";

// ─── Helper ────────────────────────────────────────────────────────────────────

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function sumField(
  schedule: ReturnType<typeof calculateEmiSchedule>,
  field: "principalComponent" | "interestComponent" | "totalAmount",
): number {
  return round2(schedule.reduce((acc, row) => acc + row[field], 0));
}

// ─── Standard case (manually verified) ────────────────────────────────────────
//
// P = 10,000  |  annual rate = 12%  |  n = 2 months
//
// r = (12/12)/100 = 0.01
// (1+r)^n = 1.01^2 = 1.0201
// EMI = 10000 * 0.01 * 1.0201 / (1.0201 - 1)
//     = 102.01 / 0.0201
//     = 5075.124... → round to 5075.12
//
// Month 1:
//   interest  = 10000 * 0.01 = 100.00
//   principal = 5075.12 - 100.00 = 4975.12
//   remaining = 10000 - 4975.12 = 5024.88
//
// Month 2 (last — absorbs rounding remainder):
//   interest  = 5024.88 * 0.01 = 50.2488 → 50.25
//   principal = 10000 - 4975.12 = 5024.88  ← remainder rule
//   total     = 5024.88 + 50.25 = 5075.13  (differs from EMI by 0.01 — spec allows this)

describe("Standard case: P=10000, rate=12%, n=2", () => {
  const schedule = calculateEmiSchedule(10_000, 12, 2);

  it("returns exactly n installments", () => {
    expect(schedule).toHaveLength(2);
  });

  it("emiNumber is 1-indexed and sequential", () => {
    expect(schedule[0].emiNumber).toBe(1);
    expect(schedule[1].emiNumber).toBe(2);
  });

  it("month 1 — interest component is correct", () => {
    expect(schedule[0].interestComponent).toBe(100.00);
  });

  it("month 1 — principal component is correct", () => {
    expect(schedule[0].principalComponent).toBe(4975.12);
  });

  it("month 1 — totalAmount === principal + interest", () => {
    expect(schedule[0].totalAmount).toBe(5075.12);
  });

  it("month 2 (last) — interest component is correct", () => {
    expect(schedule[1].interestComponent).toBe(50.25);
  });

  it("month 2 (last) — principal absorbs rounding remainder", () => {
    expect(schedule[1].principalComponent).toBe(5024.88);
  });

  it("month 2 (last) — totalAmount === principal + interest", () => {
    expect(schedule[1].totalAmount).toBe(5075.13);
  });
});

// ─── r = 0 edge case (zero interest) ──────────────────────────────────────────
//
// P = 12,000  |  annual rate = 0%  |  n = 12 months
// EMI = 12000 / 12 = 1000 (no interest formula, use P/n)
// Every month: interest=0, principal=1000, total=1000

describe("Edge case: r=0 (zero interest rate)", () => {
  const schedule = calculateEmiSchedule(12_000, 0, 12);

  it("returns 12 installments", () => {
    expect(schedule).toHaveLength(12);
  });

  it("every installment has zero interest", () => {
    schedule.forEach((row) => expect(row.interestComponent).toBe(0));
  });

  it("every installment has equal principal (1000)", () => {
    schedule.forEach((row) => expect(row.principalComponent).toBe(1000));
  });

  it("every installment totalAmount equals principal only", () => {
    schedule.forEach((row) => expect(row.totalAmount).toBe(1000));
  });

  it("sum of all principalComponents === 12,000 (exact)", () => {
    expect(sumField(schedule, "principalComponent")).toBe(12_000);
  });
});

// ─── Single-month tenure (n = 1) ──────────────────────────────────────────────
//
// P = 50,000  |  annual rate = 12%  |  n = 1 month
// r = 0.01
// EMI = 50000 * 0.01 * 1.01 / (1.01 - 1)
//     = 50000 * 0.01 * 1.01 / 0.01
//     = 50000 * 1.01
//     = 50500.00
//
// Month 1 (only month — also the last):
//   interest  = 50000 * 0.01 = 500.00
//   principal = 50000 - 0 (cumulative) = 50000.00  ← last-installment rule
//   total     = 50000 + 500 = 50500.00

describe("Edge case: single-month tenure (n=1)", () => {
  const schedule = calculateEmiSchedule(50_000, 12, 1);

  it("returns exactly 1 installment", () => {
    expect(schedule).toHaveLength(1);
  });

  it("interest is one month of interest on full principal", () => {
    expect(schedule[0].interestComponent).toBe(500.00);
  });

  it("principal equals the full loan amount", () => {
    expect(schedule[0].principalComponent).toBe(50_000);
  });

  it("totalAmount is principal + interest", () => {
    expect(schedule[0].totalAmount).toBe(50_500.00);
  });
});

// ─── Rounding correctness (spec §7.1 invariant) ────────────────────────────────
//
// The critical spec rule: sum(principalComponent) must equal original principal
// EXACTLY (to 2 decimal places) for any input.
// We test multiple inputs including ones that produce messy decimal EMIs.

describe("Rounding correctness — sum(principalComponents) === principal", () => {
  const cases: Array<{ principal: number; rate: number; months: number }> = [
    { principal: 100_000, rate: 12, months: 12 },   // typical case
    { principal: 50_000,  rate: 8.5, months: 24 },  // non-round rate
    { principal: 15_000,  rate: 10.5, months: 7 },  // odd tenure → heavy rounding
    { principal: 1_000,   rate: 12, months: 3 },    // minimum amount
    { principal: 500_000, rate: 12, months: 60 },   // maximum inputs
    { principal: 75_333,  rate: 11.75, months: 17 }, // irregular amount + rate
  ];

  cases.forEach(({ principal, rate, months }) => {
    it(`P=${principal}, rate=${rate}%, n=${months} → sum of principals === ${principal}`, () => {
      const schedule = calculateEmiSchedule(principal, rate, months);
      const totalPrincipal = sumField(schedule, "principalComponent");
      expect(totalPrincipal).toBe(principal);
    });
  });

  it("each row's totalAmount equals principalComponent + interestComponent", () => {
    const schedule = calculateEmiSchedule(100_000, 12, 12);
    schedule.forEach((row) => {
      expect(row.totalAmount).toBe(round2(row.principalComponent + row.interestComponent));
    });
  });

  it("emiNumber is always 1-indexed and sequential for n=12", () => {
    const schedule = calculateEmiSchedule(100_000, 12, 12);
    schedule.forEach((row, idx) => {
      expect(row.emiNumber).toBe(idx + 1);
    });
  });
});
