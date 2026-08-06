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
const OTHER_BORROWER = {
  name: "Ravi Kumar",
  email: "ravi@example.com",
  password: "password123",
  role: "borrower" as const,
};
const ADMIN = {
  name: "Admin User",
  email: "admin@example.com",
  password: "adminpass123",
  role: "admin" as const,
};

const LOAN_REQUEST = { amount: 30_000, tenureMonths: 3, purpose: "Laptop purchase" };

// ─── Helpers ───────────────────────────────────────────────────────────────────

async function signupAndLogin(user: {
  name: string; email: string; password: string; role: "borrower" | "admin";
}): Promise<string> {
  await request(app).post("/api/auth/signup").send(user);
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email: user.email, password: user.password });
  return res.body.data.token as string;
}

/** Sets up a disbursed loan with 3 installments. Returns tokens, loanId, and repayments */
async function setupDisbursedLoan(): Promise<{
  borrowerToken: string;
  adminToken: string;
  loanId: string;
  repaymentIds: string[];
}> {
  const borrowerToken = await signupAndLogin(BORROWER);
  const adminToken = await signupAndLogin(ADMIN);

  // Apply
  const applyRes = await request(app)
    .post("/api/loans/apply")
    .set("Authorization", `Bearer ${borrowerToken}`)
    .send(LOAN_REQUEST);
  const loanId = applyRes.body.data.id as string;

  // Approve & Disburse
  const approveRes = await request(app)
    .patch(`/api/admin/loans/${loanId}/approve`)
    .set("Authorization", `Bearer ${adminToken}`);

  const repaymentIds = (approveRes.body.data.repayments as Array<{ id: string }>).map((r) => r.id);

  return { borrowerToken, adminToken, loanId, repaymentIds };
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

// ─── GET /api/repayments/:loanId ───────────────────────────────────────────────

describe("GET /api/repayments/:loanId", () => {
  it("borrower can view their own loan repayment schedule", async () => {
    const { borrowerToken, loanId } = await setupDisbursedLoan();

    const res = await request(app)
      .get(`/api/repayments/${loanId}`)
      .set("Authorization", `Bearer ${borrowerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(3);
    expect(res.body.data[0].emiNumber).toBe(1);
    expect(res.body.data[0].status).toBe("UPCOMING");
  });

  it("admin can view any borrower's loan repayment schedule", async () => {
    const { adminToken, loanId } = await setupDisbursedLoan();

    const res = await request(app)
      .get(`/api/repayments/${loanId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(3);
  });

  it("returns 403 when another borrower tries to view the schedule", async () => {
    const { loanId } = await setupDisbursedLoan();
    const otherToken = await signupAndLogin(OTHER_BORROWER);

    const res = await request(app)
      .get(`/api/repayments/${loanId}`)
      .set("Authorization", `Bearer ${otherToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("dynamically returns OVERDUE for a past-due UPCOMING installment without altering DB", async () => {
    const { borrowerToken, loanId, repaymentIds } = await setupDisbursedLoan();

    // Manually push the first repayment's dueDate into the past (e.g. 5 days ago)
    const pastDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    await Repayment.findByIdAndUpdate(repaymentIds[0], { dueDate: pastDate });

    // Fetch schedule
    const res = await request(app)
      .get(`/api/repayments/${loanId}`)
      .set("Authorization", `Bearer ${borrowerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data[0].status).toBe("OVERDUE");
    expect(res.body.data[1].status).toBe("UPCOMING");

    // Verify DB stored document is STILL "UPCOMING" (read-time calculation per spec §7.4)
    const dbDoc = await Repayment.findById(repaymentIds[0]);
    expect(dbDoc!.status).toBe("UPCOMING");
  });
});

// ─── PATCH /api/repayments/:id/pay & Full Lifecycle ───────────────────────────

describe("PATCH /api/repayments/:id/pay & Full Lifecycle", () => {
  it("allows borrower to pay an installment → status becomes PAID", async () => {
    const { borrowerToken, repaymentIds } = await setupDisbursedLoan();

    const res = await request(app)
      .patch(`/api/repayments/${repaymentIds[0]}/pay`)
      .set("Authorization", `Bearer ${borrowerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.repayment.status).toBe("PAID");
    expect(res.body.data.repayment.paidAt).not.toBeNull();
    expect(res.body.data.loanClosed).toBe(false);
  });

  it("returns 400 INVALID_STATE_TRANSITION when paying an already-paid installment", async () => {
    const { borrowerToken, repaymentIds } = await setupDisbursedLoan();

    // First payment succeeds
    await request(app)
      .patch(`/api/repayments/${repaymentIds[0]}/pay`)
      .set("Authorization", `Bearer ${borrowerToken}`);

    // Second payment fails
    const res = await request(app)
      .patch(`/api/repayments/${repaymentIds[0]}/pay`)
      .set("Authorization", `Bearer ${borrowerToken}`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_STATE_TRANSITION");
  });

  it("returns 403 when another borrower tries to pay the installment", async () => {
    const { repaymentIds } = await setupDisbursedLoan();
    const otherToken = await signupAndLogin(OTHER_BORROWER);

    const res = await request(app)
      .patch(`/api/repayments/${repaymentIds[0]}/pay`)
      .set("Authorization", `Bearer ${otherToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("HEADLINE TEST: Full lifecycle apply -> approve -> pay all EMIs -> loan status becomes CLOSED", async () => {
    const { borrowerToken, adminToken, loanId, repaymentIds } = await setupDisbursedLoan();

    // Verify initial state is DISBURSED
    let loanDoc = await LoanApplication.findById(loanId);
    expect(loanDoc!.status).toBe("DISBURSED");

    // Pay EMI 1
    const pay1 = await request(app)
      .patch(`/api/repayments/${repaymentIds[0]}/pay`)
      .set("Authorization", `Bearer ${borrowerToken}`);
    expect(pay1.body.data.loanClosed).toBe(false);

    // Pay EMI 2
    const pay2 = await request(app)
      .patch(`/api/repayments/${repaymentIds[1]}/pay`)
      .set("Authorization", `Bearer ${borrowerToken}`);
    expect(pay2.body.data.loanClosed).toBe(false);

    // Pay EMI 3 (Final installment)
    const pay3 = await request(app)
      .patch(`/api/repayments/${repaymentIds[2]}/pay`)
      .set("Authorization", `Bearer ${borrowerToken}`);

    expect(pay3.status).toBe(200);
    expect(pay3.body.data.loanClosed).toBe(true);
    expect(pay3.body.data.loanStatus).toBe("CLOSED");

    // Verify loan is CLOSED in DB
    loanDoc = await LoanApplication.findById(loanId);
    expect(loanDoc!.status).toBe("CLOSED");

    // Verify Audit Trail (APPLIED -> APPROVED -> DISBURSED -> EMI_PAID x3 -> CLOSED)
    const auditRes = await request(app)
      .get(`/api/admin/audit/${loanId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(auditRes.status).toBe(200);
    const events = (auditRes.body.data as Array<{ event: string }>).map((log) => log.event);
    expect(events).toEqual([
      "APPLIED",
      "APPROVED",
      "DISBURSED",
      "EMI_PAID",
      "EMI_PAID",
      "EMI_PAID",
      "CLOSED",
    ]);
  });
});
