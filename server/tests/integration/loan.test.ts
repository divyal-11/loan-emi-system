import request from "supertest";
import mongoose from "mongoose";
import app from "../../src/app";
import { User } from "../../src/models/User";
import { LoanApplication } from "../../src/models/LoanApplication";
import { AuditLog } from "../../src/models/AuditLog";

// ─── Fixtures ──────────────────────────────────────────────────────────────────

const BORROWER_1 = {
  name: "Asha Rao",
  email: "asha@example.com",
  password: "password123",
  role: "borrower" as const,
};
const BORROWER_2 = {
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

const VALID_LOAN = {
  amount: 50000,
  tenureMonths: 12,
  purpose: "Home renovation",
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

async function signupAndLogin(user: {
  name: string;
  email: string;
  password: string;
  role: "borrower" | "admin";
}): Promise<string> {
  await request(app).post("/api/auth/signup").send(user);
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email: user.email, password: user.password });
  return res.body.data.token as string;
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
    AuditLog.deleteMany({}),
  ]);
});

// ─── POST /api/loans/apply ─────────────────────────────────────────────────────

describe("POST /api/loans/apply", () => {
  it("creates a PENDING loan and returns 201 with full loan object", async () => {
    const token = await signupAndLogin(BORROWER_1);
    const res = await request(app)
      .post("/api/loans/apply")
      .set("Authorization", `Bearer ${token}`)
      .send(VALID_LOAN);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      amount: VALID_LOAN.amount,
      tenureMonths: VALID_LOAN.tenureMonths,
      purpose: VALID_LOAN.purpose,
      status: "PENDING",
      interestRate: 12,
    });
    expect(res.body.data).toHaveProperty("id");
    expect(res.body.data.decidedAt).toBeNull();
    expect(res.body.data.decidedBy).toBeNull();
  });

  it("writes an APPLIED audit entry in the same request", async () => {
    const token = await signupAndLogin(BORROWER_1);
    const res = await request(app)
      .post("/api/loans/apply")
      .set("Authorization", `Bearer ${token}`)
      .send(VALID_LOAN);

    const auditEntry = await AuditLog.findOne({ loanId: res.body.data.id });
    expect(auditEntry).not.toBeNull();
    expect(auditEntry!.event).toBe("APPLIED");
  });

  it("returns 401 without an auth token", async () => {
    const res = await request(app).post("/api/loans/apply").send(VALID_LOAN);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 403 when an admin tries to apply (borrower-only route)", async () => {
    const token = await signupAndLogin(ADMIN);
    const res = await request(app)
      .post("/api/loans/apply")
      .set("Authorization", `Bearer ${token}`)
      .send(VALID_LOAN);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("returns 409 ACTIVE_LOAN_EXISTS when borrower already has a PENDING loan", async () => {
    const token = await signupAndLogin(BORROWER_1);
    // First application succeeds
    await request(app)
      .post("/api/loans/apply")
      .set("Authorization", `Bearer ${token}`)
      .send(VALID_LOAN);
    // Second application is rejected
    const res = await request(app)
      .post("/api/loans/apply")
      .set("Authorization", `Bearer ${token}`)
      .send({ ...VALID_LOAN, purpose: "Different purpose" });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("ACTIVE_LOAN_EXISTS");
  });

  it("returns 400 VALIDATION_ERROR for amount below 1,000", async () => {
    const token = await signupAndLogin(BORROWER_1);
    const res = await request(app)
      .post("/api/loans/apply")
      .set("Authorization", `Bearer ${token}`)
      .send({ ...VALID_LOAN, amount: 500 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 VALIDATION_ERROR for amount above 500,000", async () => {
    const token = await signupAndLogin(BORROWER_1);
    const res = await request(app)
      .post("/api/loans/apply")
      .set("Authorization", `Bearer ${token}`)
      .send({ ...VALID_LOAN, amount: 600_000 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 VALIDATION_ERROR for tenure below 3 months", async () => {
    const token = await signupAndLogin(BORROWER_1);
    const res = await request(app)
      .post("/api/loans/apply")
      .set("Authorization", `Bearer ${token}`)
      .send({ ...VALID_LOAN, tenureMonths: 2 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 VALIDATION_ERROR for tenure above 60 months", async () => {
    const token = await signupAndLogin(BORROWER_1);
    const res = await request(app)
      .post("/api/loans/apply")
      .set("Authorization", `Bearer ${token}`)
      .send({ ...VALID_LOAN, tenureMonths: 61 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 VALIDATION_ERROR when purpose exceeds 200 characters", async () => {
    const token = await signupAndLogin(BORROWER_1);
    const res = await request(app)
      .post("/api/loans/apply")
      .set("Authorization", `Bearer ${token}`)
      .send({ ...VALID_LOAN, purpose: "x".repeat(201) });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

// ─── GET /api/loans/mine ───────────────────────────────────────────────────────

describe("GET /api/loans/mine", () => {
  it("returns empty array when borrower has no loans", async () => {
    const token = await signupAndLogin(BORROWER_1);
    const res = await request(app)
      .get("/api/loans/mine")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
  });

  it("returns only the authenticated borrower's own loans", async () => {
    const token1 = await signupAndLogin(BORROWER_1);
    const token2 = await signupAndLogin(BORROWER_2);

    // Borrower 1 applies once, borrower 2 applies once
    await request(app)
      .post("/api/loans/apply")
      .set("Authorization", `Bearer ${token1}`)
      .send(VALID_LOAN);
    await request(app)
      .post("/api/loans/apply")
      .set("Authorization", `Bearer ${token2}`)
      .send(VALID_LOAN);

    const res = await request(app)
      .get("/api/loans/mine")
      .set("Authorization", `Bearer ${token1}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].amount).toBe(VALID_LOAN.amount);
  });

  it("returns 401 without a token", async () => {
    const res = await request(app).get("/api/loans/mine");
    expect(res.status).toBe(401);
  });
});

// ─── GET /api/loans/:id ────────────────────────────────────────────────────────

describe("GET /api/loans/:id", () => {
  it("borrower can fetch their own loan", async () => {
    const token = await signupAndLogin(BORROWER_1);
    const applyRes = await request(app)
      .post("/api/loans/apply")
      .set("Authorization", `Bearer ${token}`)
      .send(VALID_LOAN);
    const loanId = applyRes.body.data.id as string;

    const res = await request(app)
      .get(`/api/loans/${loanId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(loanId);
  });

  it("borrower gets 403 FORBIDDEN when accessing another borrower's loan", async () => {
    const token1 = await signupAndLogin(BORROWER_1);
    const token2 = await signupAndLogin(BORROWER_2);

    const applyRes = await request(app)
      .post("/api/loans/apply")
      .set("Authorization", `Bearer ${token1}`)
      .send(VALID_LOAN);
    const loanId = applyRes.body.data.id as string;

    // Borrower 2 tries to read borrower 1's loan
    const res = await request(app)
      .get(`/api/loans/${loanId}`)
      .set("Authorization", `Bearer ${token2}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("admin can fetch any borrower's loan", async () => {
    const borrowerToken = await signupAndLogin(BORROWER_1);
    const adminToken = await signupAndLogin(ADMIN);

    const applyRes = await request(app)
      .post("/api/loans/apply")
      .set("Authorization", `Bearer ${borrowerToken}`)
      .send(VALID_LOAN);
    const loanId = applyRes.body.data.id as string;

    const res = await request(app)
      .get(`/api/loans/${loanId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(loanId);
  });

  it("returns 404 for a non-existent loan id", async () => {
    const token = await signupAndLogin(BORROWER_1);
    const fakeId = new mongoose.Types.ObjectId().toString();

    const res = await request(app)
      .get(`/api/loans/${fakeId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("returns 404 for a malformed loan id (not a valid ObjectId)", async () => {
    const token = await signupAndLogin(BORROWER_1);
    const res = await request(app)
      .get("/api/loans/not-a-real-id")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("returns 401 without a token", async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app).get(`/api/loans/${fakeId}`);
    expect(res.status).toBe(401);
  });
});
