/**
 * Unit tests for eligibilityService.
 *
 * LoanApplication is mocked so these tests run without a MongoDB connection.
 * Each test exercises exactly one boundary or rule from spec §7.2.
 */

// jest.mock must come before the import of the module under test
jest.mock("../../src/models/LoanApplication");

import { LoanApplication } from "../../src/models/LoanApplication";
import { checkEligibility } from "../../src/services/eligibilityService";

const mockFindOne = LoanApplication.findOne as jest.Mock;

// By default, simulate "no active loan exists"
beforeEach(() => {
  jest.clearAllMocks();
  mockFindOne.mockResolvedValue(null);
});

// ─── Amount boundary tests ─────────────────────────────────────────────────────

describe("amount validation", () => {
  it("accepts the minimum boundary (1,000)", async () => {
    await expect(checkEligibility("uid", 1000, 12)).resolves.toBeUndefined();
  });

  it("accepts the maximum boundary (500,000)", async () => {
    await expect(checkEligibility("uid", 500_000, 12)).resolves.toBeUndefined();
  });

  it("accepts a mid-range amount (50,000)", async () => {
    await expect(checkEligibility("uid", 50_000, 12)).resolves.toBeUndefined();
  });

  it("rejects amount = 999 (one below minimum)", async () => {
    await expect(checkEligibility("uid", 999, 12)).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      statusCode: 400,
    });
  });

  it("rejects amount = 0", async () => {
    await expect(checkEligibility("uid", 0, 12)).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      statusCode: 400,
    });
  });

  it("rejects amount = 500,001 (one above maximum)", async () => {
    await expect(checkEligibility("uid", 500_001, 12)).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      statusCode: 400,
    });
  });

  it("rejects negative amount", async () => {
    await expect(checkEligibility("uid", -1000, 12)).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      statusCode: 400,
    });
  });
});

// ─── Tenure boundary tests ─────────────────────────────────────────────────────

describe("tenureMonths validation", () => {
  it("accepts the minimum boundary (3 months)", async () => {
    await expect(checkEligibility("uid", 50_000, 3)).resolves.toBeUndefined();
  });

  it("accepts the maximum boundary (60 months)", async () => {
    await expect(checkEligibility("uid", 50_000, 60)).resolves.toBeUndefined();
  });

  it("accepts a mid-range tenure (24 months)", async () => {
    await expect(checkEligibility("uid", 50_000, 24)).resolves.toBeUndefined();
  });

  it("rejects tenureMonths = 2 (one below minimum)", async () => {
    await expect(checkEligibility("uid", 50_000, 2)).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      statusCode: 400,
    });
  });

  it("rejects tenureMonths = 1", async () => {
    await expect(checkEligibility("uid", 50_000, 1)).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      statusCode: 400,
    });
  });

  it("rejects tenureMonths = 61 (one above maximum)", async () => {
    await expect(checkEligibility("uid", 50_000, 61)).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      statusCode: 400,
    });
  });
});

// ─── Active-loan check tests ───────────────────────────────────────────────────

describe("active loan check", () => {
  it("passes when the applicant has no loans at all", async () => {
    mockFindOne.mockResolvedValue(null);
    await expect(checkEligibility("uid", 50_000, 12)).resolves.toBeUndefined();
  });

  it("passes when the applicant's only loan is REJECTED", async () => {
    // findOne with status $in [PENDING, APPROVED, DISBURSED] returns null
    // for REJECTED/CLOSED/DEFAULTED (the mock already returns null by default)
    mockFindOne.mockResolvedValue(null);
    await expect(checkEligibility("uid", 50_000, 12)).resolves.toBeUndefined();
  });

  it("passes when the applicant's only loan is CLOSED", async () => {
    mockFindOne.mockResolvedValue(null);
    await expect(checkEligibility("uid", 50_000, 12)).resolves.toBeUndefined();
  });

  it("rejects when applicant has a PENDING loan", async () => {
    mockFindOne.mockResolvedValue({ status: "PENDING" });
    await expect(checkEligibility("uid", 50_000, 12)).rejects.toMatchObject({
      code: "ACTIVE_LOAN_EXISTS",
      statusCode: 409,
    });
  });

  it("rejects when applicant has an APPROVED loan", async () => {
    mockFindOne.mockResolvedValue({ status: "APPROVED" });
    await expect(checkEligibility("uid", 50_000, 12)).rejects.toMatchObject({
      code: "ACTIVE_LOAN_EXISTS",
      statusCode: 409,
    });
  });

  it("rejects when applicant has a DISBURSED loan", async () => {
    mockFindOne.mockResolvedValue({ status: "DISBURSED" });
    await expect(checkEligibility("uid", 50_000, 12)).rejects.toMatchObject({
      code: "ACTIVE_LOAN_EXISTS",
      statusCode: 409,
    });
  });

  it("queries the DB with the correct status filter", async () => {
    await checkEligibility("uid123", 50_000, 12);
    expect(mockFindOne).toHaveBeenCalledWith({
      applicantId: "uid123",
      status: { $in: ["PENDING", "APPROVED", "DISBURSED"] },
    });
  });
});

// ─── Amount failure is checked before DB query ─────────────────────────────────

describe("short-circuit ordering", () => {
  it("does NOT query the DB when amount is invalid (fails fast)", async () => {
    await expect(checkEligibility("uid", 100, 12)).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
    expect(mockFindOne).not.toHaveBeenCalled();
  });

  it("does NOT query the DB when tenure is invalid (fails fast)", async () => {
    await expect(checkEligibility("uid", 50_000, 100)).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
    expect(mockFindOne).not.toHaveBeenCalled();
  });
});
