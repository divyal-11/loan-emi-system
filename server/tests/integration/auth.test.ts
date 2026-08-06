import request from "supertest";
import mongoose from "mongoose";
import app from "../../src/app";
import { User } from "../../src/models/User";

// ─── Test fixtures ─────────────────────────────────────────────────────────────

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

// ─── Helpers ───────────────────────────────────────────────────────────────────

async function createAndLoginUser(
  userData: typeof BORROWER | typeof ADMIN,
): Promise<string> {
  await request(app).post("/api/auth/signup").send(userData);
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email: userData.email, password: userData.password });
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
  await User.deleteMany({});
});

// ─── POST /api/auth/signup ─────────────────────────────────────────────────────

describe("POST /api/auth/signup", () => {
  it("creates a borrower and returns 201 with user data (no hash)", async () => {
    const res = await request(app).post("/api/auth/signup").send(BORROWER);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      name: BORROWER.name,
      email: BORROWER.email,
      role: "borrower",
    });
    expect(res.body.data).toHaveProperty("id");
    expect(res.body.data).not.toHaveProperty("passwordHash");
    expect(res.body.data).not.toHaveProperty("password");
  });

  it("creates an admin when role is 'admin'", async () => {
    const res = await request(app).post("/api/auth/signup").send(ADMIN);

    expect(res.status).toBe(201);
    expect(res.body.data.role).toBe("admin");
  });

  it("defaults to 'borrower' when role is omitted", async () => {
    const { role: _role, ...withoutRole } = BORROWER;
    const res = await request(app).post("/api/auth/signup").send(withoutRole);

    expect(res.status).toBe(201);
    expect(res.body.data.role).toBe("borrower");
  });

  it("returns 400 VALIDATION_ERROR when password is too short", async () => {
    const res = await request(app)
      .post("/api/auth/signup")
      .send({ ...BORROWER, password: "short" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 VALIDATION_ERROR when email is invalid", async () => {
    const res = await request(app)
      .post("/api/auth/signup")
      .send({ ...BORROWER, email: "not-an-email" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 VALIDATION_ERROR when required fields are missing", async () => {
    const res = await request(app)
      .post("/api/auth/signup")
      .send({ email: BORROWER.email });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 409 EMAIL_ALREADY_EXISTS when email is already registered", async () => {
    await request(app).post("/api/auth/signup").send(BORROWER);
    const res = await request(app).post("/api/auth/signup").send(BORROWER);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("EMAIL_ALREADY_EXISTS");
  });
});

// ─── POST /api/auth/login ──────────────────────────────────────────────────────

describe("POST /api/auth/login", () => {
  beforeEach(async () => {
    await request(app).post("/api/auth/signup").send(BORROWER);
  });

  it("returns a JWT and user data on valid credentials", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: BORROWER.email, password: BORROWER.password });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("token");
    expect(typeof res.body.data.token).toBe("string");
    expect(res.body.data.user).toMatchObject({ name: BORROWER.name, role: "borrower" });
    expect(res.body.data.user).not.toHaveProperty("passwordHash");
  });

  it("returns 401 UNAUTHORIZED on wrong password", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: BORROWER.email, password: "wrongpassword" });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 401 UNAUTHORIZED on unknown email (same message — no enumeration)", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "ghost@example.com", password: BORROWER.password });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
    // Must be the same message as wrong password — prevents user enumeration
    expect(res.body.error.message).toBe("Invalid email or password.");
  });

  it("returns 400 VALIDATION_ERROR when body is empty", async () => {
    const res = await request(app).post("/api/auth/login").send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
// These tests verify the full token lifecycle: signup → login → use token on protected route

describe("GET /api/auth/me (authMiddleware integration)", () => {
  it("signup → login → GET /me with token → 200 with user profile", async () => {
    const token = await createAndLoginUser(BORROWER);

    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      name: BORROWER.name,
      email: BORROWER.email,
      role: "borrower",
    });
    expect(res.body.data).not.toHaveProperty("passwordHash");
  });

  it("returns 401 when Authorization header is missing", async () => {
    const res = await request(app).get("/api/auth/me");

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 401 when token is malformed", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer this.is.not.a.real.token");

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 401 when Authorization header format is wrong (no Bearer prefix)", async () => {
    const token = await createAndLoginUser(BORROWER);
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", token); // missing "Bearer " prefix

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });
});

// ─── RBAC: roleMiddleware ──────────────────────────────────────────────────────
// We create a minimal test route inline to exercise roleMiddleware without
// needing the full admin routes (which come in a later phase).

import { authMiddleware } from "../../src/middleware/authMiddleware";
import { roleMiddleware } from "../../src/middleware/roleMiddleware";
import express from "express";

describe("roleMiddleware (RBAC)", () => {
  // Add a temporary admin-only route to the app for testing purposes
  // We use a fresh express app so we don't pollute the main app
  const testApp = express();
  testApp.use(express.json());
  testApp.get(
    "/admin-only",
    authMiddleware,
    roleMiddleware("admin"),
    (_req, res) => { res.json({ success: true, data: { message: "admin access granted" } }); },
  );
  testApp.use(
    (err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      const e = err as { statusCode?: number; code?: string; message?: string };
      res.status(e.statusCode ?? 500).json({
        success: false,
        error: { code: e.code ?? "INTERNAL_ERROR", message: e.message ?? "Error" },
      });
    },
  );

  it("allows admin token to access admin-only route", async () => {
    const token = await createAndLoginUser(ADMIN);

    const res = await request(testApp)
      .get("/admin-only")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
  });

  it("returns 403 FORBIDDEN when borrower attempts admin-only route", async () => {
    const token = await createAndLoginUser(BORROWER);

    const res = await request(testApp)
      .get("/admin-only")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("returns 401 when no token is provided to admin-only route", async () => {
    const res = await request(testApp).get("/admin-only");

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });
});
