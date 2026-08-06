import request from "supertest";
import mongoose from "mongoose";
import app from "../../src/app";
import { User } from "../../src/models/User";
import { LoanApplication } from "../../src/models/LoanApplication";
import { Repayment } from "../../src/models/Repayment";
import { AuditLog } from "../../src/models/AuditLog";

// ─── Fixtures ──────────────────────────────────────────────────────────────────

const BORROWER = {
  name: "Asha Rao",
  email: "asha@example.com",
  password: "password123",
  role: "borrower" as const,
};
const ADMIN = {
  name: "Admin User",
  email: "admin@example.com",
  password: "adminpass123",
  role: "admin" as const,
};

const VALID_LOAN = { amount: 50_000, tenureMonths: 12, purpose: "Home renovation" };

// ─── Helpers ───────────────────────────────────────────────────────────────────

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

async function signupAndLogin(user: {
  name: string; email: string; password: string; role: "borrower" | "admin";
}): Promise<string> {
  await request(app).post("/api/auth/signup").send(user);
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email: user.email, password: user.password });
  return res.body.data.token as string;
}

/** Signup borrower, login both, apply for a loan, return { borrowerToken, adminToken, loanId } */
async function setupPendingLoan(): Promise<{
  borrowerToken: string;
  adminToken: string;
  loanId: string;
}> {
  const borrowerToken = await signupAndLogin(BORROWER);
  const adminToken = await signupAndLogin(ADMIN);
  const applyRes = await request(app)
    .post("/api/loans/apply")
    .set("Authorization", `Bearer ${borrowerToken}`)
    .send(VALID_LOAN);
  return { borrowerToken, adminToken, loanId: applyRes.body.data.id as string };
}

// ─── Lifecycle ─────────────────────────────────────────────────────────────────

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI!);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

beforeEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    LoanApplication.deleteMany({}),
    Repayment.deleteMany({}),
    AuditLog.deleteMany({}),
  ]);
});

// ─── GET /api/admin/loans/pending ─────────────────────────────────────────────

describe("GET /api/admin/loans/pending", () => {
  it("returns all PENDING loans for admin", async () => {
    const { adminToken } = await setupPendingLoan();

    const res = await request(app)
      .get("/api/admin/loans/pending")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].status).toBe("PENDING");
  });

  it("returns empty array when there are no pending loans", async () => {
    const adminToken = await signupAndLogin(ADMIN);

    const res = await request(app)
      .get("/api/admin/loans/pending")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });

  it("returns 403 when borrower tries to access pending loans", async () => {
    const borrowerToken = await signupAndLogin(BORROWER);

    const res = await request(app)
      .get("/api/admin/loans/pending")
      .set("Authorization", `Bearer ${borrowerToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("returns 401 without a token", async () => {
    const res = await request(app).get("/api/admin/loans/pending");
    expect(res.status).toBe(401);
  });
});

// ─── PATCH /api/admin/loans/:id/approve ───────────────────────────────────────

describe("PATCH /api/admin/loans/:id/approve", () => {
  it("approves a PENDING loan → status DISBURSED and repayment schedule generated", async () => {
    const { adminToken, loanId } = await setupPendingLoan();

    const res = await request(app)
      .patch(`/api/admin/loans/${loanId}/approve`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.loan.status).toBe("DISBURSED");
    expect(res.body.data.loan.decidedAt).not.toBeNull();
    expect(res.body.data.loan.decidedBy).not.toBeNull();
  });

  it("repayment count equals tenureMonths", async () => {
    const { adminToken, loanId } = await setupPendingLoan();

    const res = await request(app)
      .patch(`/api/admin/loans/${loanId}/approve`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.body.data.repayments).toHaveLength(VALID_LOAN.tenureMonths);
  });

  it("sum(principalComponent) === loan amount exactly (rounding invariant)", async () => {
    const { adminToken, loanId } = await setupPendingLoan();

    const res = await request(app)
      .patch(`/api/admin/loans/${loanId}/approve`)
      .set("Authorization", `Bearer ${adminToken}`);

    const repayments = res.body.data.repayments as Array<{ principalComponent: number }>;
    const totalPrincipal = round2(repayments.reduce((acc, r) => acc + r.principalComponent, 0));
    expect(totalPrincipal).toBe(VALID_LOAN.amount);
  });

  it("repayments are also persisted in the database", async () => {
    const { adminToken, loanId } = await setupPendingLoan();

    await request(app)
      .patch(`/api/admin/loans/${loanId}/approve`)
      .set("Authorization", `Bearer ${adminToken}`);

    const dbRepayments = await Repayment.find({ loanId });
    expect(dbRepayments).toHaveLength(VALID_LOAN.tenureMonths);
  });

  it("repayments have sequential emiNumbers starting at 1", async () => {
    const { adminToken, loanId } = await setupPendingLoan();

    const res = await request(app)
      .patch(`/api/admin/loans/${loanId}/approve`)
      .set("Authorization", `Bearer ${adminToken}`);

    const emiNumbers = (res.body.data.repayments as Array<{ emiNumber: number }>).map(
      (r) => r.emiNumber,
    );
    expect(emiNumbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it("writes APPROVED and DISBURSED audit entries", async () => {
    const { adminToken, loanId } = await setupPendingLoan();

    await request(app)
      .patch(`/api/admin/loans/${loanId}/approve`)
      .set("Authorization", `Bearer ${adminToken}`);

    const auditEntries = await AuditLog.find({ loanId }).sort({ timestamp: 1 });
    // APPLIED (from apply) + APPROVED + DISBURSED = 3 entries
    expect(auditEntries).toHaveLength(3);
    expect(auditEntries[1].event).toBe("APPROVED");
    expect(auditEntries[2].event).toBe("DISBURSED");
  });

  it("returns 400 INVALID_STATE_TRANSITION when loan is already DISBURSED", async () => {
    const { adminToken, loanId } = await setupPendingLoan();

    // First approve succeeds
    await request(app)
      .patch(`/api/admin/loans/${loanId}/approve`)
      .set("Authorization", `Bearer ${adminToken}`);

    // Second approve is rejected
    const res = await request(app)
      .patch(`/api/admin/loans/${loanId}/approve`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_STATE_TRANSITION");
  });

  it("returns 400 INVALID_STATE_TRANSITION when loan is REJECTED", async () => {
    const { adminToken, loanId } = await setupPendingLoan();

    // First reject the loan
    await request(app)
      .patch(`/api/admin/loans/${loanId}/reject`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({});

    // Then try to approve it
    const res = await request(app)
      .patch(`/api/admin/loans/${loanId}/approve`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_STATE_TRANSITION");
  });

  it("returns 404 for a non-existent loan id", async () => {
    const adminToken = await signupAndLogin(ADMIN);
    const fakeId = new mongoose.Types.ObjectId().toString();

    const res = await request(app)
      .patch(`/api/admin/loans/${fakeId}/approve`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });

  it("returns 403 when borrower attempts to approve", async () => {
    const { borrowerToken, loanId } = await setupPendingLoan();

    const res = await request(app)
      .patch(`/api/admin/loans/${loanId}/approve`)
      .set("Authorization", `Bearer ${borrowerToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });
});

// ─── PATCH /api/admin/loans/:id/reject ────────────────────────────────────────

describe("PATCH /api/admin/loans/:id/reject", () => {
  it("rejects a PENDING loan → status REJECTED, zero Repayment docs created", async () => {
    const { adminToken, loanId } = await setupPendingLoan();

    const res = await request(app)
      .patch(`/api/admin/loans/${loanId}/reject`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("REJECTED");
    expect(res.body.data.decidedAt).not.toBeNull();

    // No repayment schedule should have been created
    const repayments = await Repayment.find({ loanId });
    expect(repayments).toHaveLength(0);
  });

  it("stores the rejection reason in the audit entry metadata", async () => {
    const { adminToken, loanId } = await setupPendingLoan();
    const reason = "Applicant's debt-to-income ratio exceeds policy threshold.";

    await request(app)
      .patch(`/api/admin/loans/${loanId}/reject`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ reason });

    const auditEntries = await AuditLog.find({ loanId, event: "REJECTED" });
    expect(auditEntries).toHaveLength(1);
    expect((auditEntries[0].metadata as { reason?: string }).reason).toBe(reason);
  });

  it("reject works without a reason (reason is optional)", async () => {
    const { adminToken, loanId } = await setupPendingLoan();

    const res = await request(app)
      .patch(`/api/admin/loans/${loanId}/reject`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("REJECTED");
  });

  it("returns 400 INVALID_STATE_TRANSITION when loan is already REJECTED", async () => {
    const { adminToken, loanId } = await setupPendingLoan();

    // First reject succeeds
    await request(app)
      .patch(`/api/admin/loans/${loanId}/reject`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({});

    // Second reject is rejected
    const res = await request(app)
      .patch(`/api/admin/loans/${loanId}/reject`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_STATE_TRANSITION");
  });

  it("returns 400 INVALID_STATE_TRANSITION when loan is already DISBURSED", async () => {
    const { adminToken, loanId } = await setupPendingLoan();

    // Approve first
    await request(app)
      .patch(`/api/admin/loans/${loanId}/approve`)
      .set("Authorization", `Bearer ${adminToken}`);

    // Now try to reject
    const res = await request(app)
      .patch(`/api/admin/loans/${loanId}/reject`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_STATE_TRANSITION");
  });

  it("returns 400 VALIDATION_ERROR when reason exceeds 500 characters", async () => {
    const { adminToken, loanId } = await setupPendingLoan();

    const res = await request(app)
      .patch(`/api/admin/loans/${loanId}/reject`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ reason: "x".repeat(501) });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 403 when borrower attempts to reject", async () => {
    const { borrowerToken, loanId } = await setupPendingLoan();

    const res = await request(app)
      .patch(`/api/admin/loans/${loanId}/reject`)
      .set("Authorization", `Bearer ${borrowerToken}`)
      .send({});

    expect(res.status).toBe(403);
  });
});
