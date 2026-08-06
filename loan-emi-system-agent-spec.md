# PROJECT SPEC: Loan Origination & EMI Management System

> This document is written as a build spec for an AI coding agent (Antigravity,
> Cursor, Claude Code, etc.). It defines exact contracts, schemas, and an ordered
> task list so implementation can proceed with minimal ambiguity. Follow the
> tasks in order — each phase should be fully working and tested before the next.

---

## 1. Objective

Build a full-stack loan management system simulating a digital lending platform's
core flow: a borrower applies for a loan, an admin approves/rejects it, an EMI
(equated monthly installment) repayment schedule is auto-generated on approval,
and repayments are tracked over time. Every state change is recorded in an
immutable audit log.

---

## 2. Tech Stack (exact)

```
Backend:      Node.js 20+, Express.js 4.x, TypeScript 5.x
Database:     MongoDB 7.x via Mongoose 8.x
Auth:         jsonwebtoken, bcrypt
Validation:   zod
Testing:      Jest + Supertest
Frontend:     Next.js 14 (App Router), TypeScript, Tailwind CSS
HTTP client:  native fetch (frontend)
Linting:      ESLint + Prettier
CI/CD:        GitHub Actions
Deployment:   Backend → AWS (EC2 or Elastic Beanstalk); DB → MongoDB Atlas;
              Frontend → Vercel
Containerization: Docker + docker-compose for local dev (api + mongo)
```

---

## 3. Non-Negotiable Conventions

- All backend code in TypeScript, strict mode on (`"strict": true` in tsconfig).
- All API responses follow this envelope:
  ```json
  { "success": true, "data": { ... } }
  ```
  or on error:
  ```json
  { "success": false, "error": { "code": "STRING_CODE", "message": "human readable" } }
  ```
- All routes requiring auth expect header: `Authorization: Bearer <JWT>`
- All dates are ISO 8601 strings.
- All money amounts are stored and transmitted as numbers in smallest currency
  unit is NOT required here — use plain decimal numbers (e.g. `15000.00`) for
  simplicity, rounded to 2 decimal places.
- Status enums are UPPERCASE strings (see schemas below) — never booleans for
  multi-state fields.
- Every state-changing action on a loan MUST write an `AuditLog` entry in the
  same request (no separate cleanup job).
- No business logic in controllers — controllers call services; services
  contain the logic and are independently unit-testable.

---

## 4. Environment Variables

`server/.env.example`
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/loan-emi-system
JWT_SECRET=replace-with-strong-secret
JWT_EXPIRES_IN=7d
NODE_ENV=development
```

`client/.env.local.example`
```
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api
```

---

## 5. Folder Structure

```
loan-emi-system/
├── server/
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.ts
│   │   │   └── env.ts
│   │   ├── models/
│   │   │   ├── User.ts
│   │   │   ├── LoanApplication.ts
│   │   │   ├── Repayment.ts
│   │   │   └── AuditLog.ts
│   │   ├── controllers/
│   │   │   ├── authController.ts
│   │   │   ├── loanController.ts
│   │   │   ├── repaymentController.ts
│   │   │   └── adminController.ts
│   │   ├── routes/
│   │   │   ├── authRoutes.ts
│   │   │   ├── loanRoutes.ts
│   │   │   ├── repaymentRoutes.ts
│   │   │   ├── adminRoutes.ts
│   │   │   └── index.ts
│   │   ├── middleware/
│   │   │   ├── authMiddleware.ts
│   │   │   ├── roleMiddleware.ts
│   │   │   ├── errorHandler.ts
│   │   │   └── validateRequest.ts
│   │   ├── services/
│   │   │   ├── emiCalculator.ts
│   │   │   ├── auditService.ts
│   │   │   └── eligibilityService.ts
│   │   ├── utils/
│   │   │   ├── logger.ts
│   │   │   └── constants.ts
│   │   ├── app.ts
│   │   └── server.ts
│   ├── tests/
│   │   ├── unit/emiCalculator.test.ts
│   │   ├── unit/eligibilityService.test.ts
│   │   └── integration/
│   │       ├── auth.test.ts
│   │       ├── loan.test.ts
│   │       └── repayment.test.ts
│   ├── .env.example
│   ├── .eslintrc.json
│   ├── tsconfig.json
│   ├── package.json
│   └── Dockerfile
│
├── client/
│   ├── app/
│   │   ├── (auth)/login/page.tsx
│   │   ├── (auth)/signup/page.tsx
│   │   ├── borrower/dashboard/page.tsx
│   │   ├── borrower/apply/page.tsx
│   │   ├── borrower/repayments/page.tsx
│   │   ├── admin/applications/page.tsx
│   │   ├── admin/applications/[id]/page.tsx
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── LoanCard.tsx
│   │   ├── EMITable.tsx
│   │   ├── StatusBadge.tsx
│   │   └── Navbar.tsx
│   ├── lib/
│   │   ├── api.ts
│   │   └── auth.ts
│   ├── types/index.ts
│   ├── .env.local.example
│   ├── tailwind.config.ts
│   ├── next.config.js
│   └── package.json
│
├── .github/workflows/ci.yml
├── docs/api-spec.md
├── docker-compose.yml
└── README.md
```

---

## 6. Data Models (Mongoose schemas — exact fields & types)

### `User`
```ts
{
  name: string,            // required
  email: string,           // required, unique, lowercase
  passwordHash: string,    // required
  role: "borrower" | "admin",  // required, default "borrower"
  createdAt: Date          // default now
}
```

### `LoanApplication`
```ts
{
  applicantId: ObjectId,   // ref "User", required
  amount: number,          // required, min 1000, max 500000
  tenureMonths: number,    // required, min 3, max 60
  interestRate: number,    // annual %, default 12.0 (fixed for MVP)
  purpose: string,         // required, max 200 chars
  status: "PENDING" | "APPROVED" | "REJECTED" | "DISBURSED" | "CLOSED" | "DEFAULTED",
                            // default "PENDING"
  appliedAt: Date,         // default now
  decidedAt: Date | null,
  decidedBy: ObjectId | null  // ref "User" (admin)
}
```

### `Repayment`
```ts
{
  loanId: ObjectId,        // ref "LoanApplication", required
  emiNumber: number,       // required, 1-indexed
  dueDate: Date,           // required
  principalComponent: number,  // required, 2 decimal places
  interestComponent: number,   // required, 2 decimal places
  totalAmount: number,     // required, principal + interest
  status: "UPCOMING" | "PAID" | "OVERDUE",  // default "UPCOMING"
  paidAt: Date | null
}
```

### `AuditLog`
```ts
{
  loanId: ObjectId,        // ref "LoanApplication", required
  event: "APPLIED" | "APPROVED" | "REJECTED" | "DISBURSED" | "EMI_PAID" | "DEFAULTED",
  actor: ObjectId,         // ref "User" who triggered the event
  metadata: Record<string, unknown>,  // snapshot of relevant fields at event time
  timestamp: Date          // default now
}
```

---

## 7. Business Logic Rules (exact)

### 7.1 EMI Formula
```
r = (annualInterestRate / 12) / 100        // monthly rate as decimal
n = tenureMonths
EMI = P * r * (1 + r)^n / ((1 + r)^n - 1)

If r == 0 (edge case): EMI = P / n
```

Per-installment breakdown (amortization):
```
for each month i from 1 to n:
  interestComponent[i] = remainingPrincipal * r
  principalComponent[i] = EMI - interestComponent[i]
  remainingPrincipal -= principalComponent[i]
  totalAmount[i] = principalComponent[i] + interestComponent[i]  // ≈ EMI, last month may differ by rounding
```
Round every stored value to 2 decimal places. The last installment absorbs any
rounding remainder so the sum of all principalComponents exactly equals the
loan amount.

### 7.2 Eligibility Rules (MVP — simple, deterministic)
```
- amount must be between 1000 and 500000
- tenureMonths must be between 3 and 60
- a user may not have more than 1 loan in status PENDING or APPROVED or
  DISBURSED at a time (reject new application with 409 if they do)
```

### 7.3 Loan State Machine (only these transitions are valid)
```
PENDING    -> APPROVED   (admin action)
PENDING    -> REJECTED   (admin action)
APPROVED   -> DISBURSED  (system action, immediately after approval —
                           this is also when repayments are generated)
DISBURSED  -> CLOSED     (system action, when all repayments are PAID)
DISBURSED  -> DEFAULTED  (system action, when any repayment is > 30 days
                           overdue — for MVP this can be a manual/admin
                           trigger endpoint rather than a cron job)
```
Any other transition attempt returns `400` with error code `INVALID_STATE_TRANSITION`.

### 7.4 Overdue Detection
```
On any GET request that returns repayments, for each repayment with
status "UPCOMING" and dueDate < today: return it with status "OVERDUE"
computed on read (do not require a background job for MVP; a scheduled
job is a stretch goal, not required).
```

---

## 8. API Contract

Base URL: `/api`

### Auth

**POST `/auth/signup`**
Request:
```json
{ "name": "Asha Rao", "email": "asha@example.com", "password": "min8chars", "role": "borrower" }
```
Response `201`:
```json
{ "success": true, "data": { "id": "...", "name": "Asha Rao", "email": "asha@example.com", "role": "borrower" } }
```

**POST `/auth/login`**
Request:
```json
{ "email": "asha@example.com", "password": "min8chars" }
```
Response `200`:
```json
{ "success": true, "data": { "token": "<JWT>", "user": { "id": "...", "name": "...", "role": "borrower" } } }
```

### Loans (borrower)

**POST `/loans/apply`** — auth: borrower
Request:
```json
{ "amount": 50000, "tenureMonths": 12, "purpose": "Home renovation" }
```
Response `201`: created loan object, `status: "PENDING"`.
Error `409` if borrower already has an active loan (`code: "ACTIVE_LOAN_EXISTS"`).

**GET `/loans/mine`** — auth: borrower
Response `200`: array of the borrower's loan applications.

**GET `/loans/:id`** — auth: borrower (own loan only) or admin
Response `200`: loan detail. `403` if borrower requests someone else's loan.

### Admin

**GET `/admin/loans/pending`** — auth: admin
Response `200`: array of `PENDING` loans.

**PATCH `/admin/loans/:id/approve`** — auth: admin
Effect: status → `APPROVED` → immediately → `DISBURSED`; generates full
repayment schedule; writes `APPROVED` and `DISBURSED` audit entries.
Response `200`: updated loan + generated repayment schedule.

**PATCH `/admin/loans/:id/reject`** — auth: admin
Request: `{ "reason": "optional string" }`
Effect: status → `REJECTED`; writes audit entry.
Response `200`: updated loan.

### Repayments

**GET `/repayments/:loanId`** — auth: borrower (own) or admin
Response `200`: array of repayment records (with computed OVERDUE status per 7.4).

**PATCH `/repayments/:id/pay`** — auth: borrower
Effect: status → `PAID`, `paidAt` set to now; writes `EMI_PAID` audit entry;
if this was the last unpaid EMI, loan status → `CLOSED`.
Response `200`: updated repayment record.

### Audit

**GET `/admin/audit/:loanId`** — auth: admin
Response `200`: full ordered list of audit log entries for that loan.

### Error codes to implement
```
VALIDATION_ERROR        400
UNAUTHORIZED            401
FORBIDDEN               403
NOT_FOUND               404
ACTIVE_LOAN_EXISTS      409
INVALID_STATE_TRANSITION 400
INTERNAL_ERROR          500
```

---

## 9. Auth & RBAC Rules

- JWT payload: `{ sub: userId, role, iat, exp }`
- `authMiddleware`: verifies token, attaches `req.user = { id, role }`, else `401`.
- `roleMiddleware(...allowedRoles)`: checks `req.user.role` is in allowed list,
  else `403`.
- Borrower-only routes: `/loans/apply`, `/loans/mine`, `/repayments/:id/pay`.
- Admin-only routes: everything under `/admin/*`.
- Shared routes (`/loans/:id`, `/repayments/:loanId`) additionally check
  ownership for borrowers (loan.applicantId === req.user.id) inside the
  controller — this is NOT pure RBAC, so implement it as an explicit check,
  not middleware.

---

## 10. Implementation Task List (ordered — complete and test each before moving on)

```
[ ] 1.  Scaffold server/ with TypeScript, Express, ESLint, Prettier configs
[ ] 2.  Set up MongoDB connection (config/db.ts) + docker-compose for local Mongo
[ ] 3.  Implement models: User, LoanApplication, Repayment, AuditLog (section 6)
[ ] 4.  Implement authController + authRoutes (signup/login) + password hashing
[ ] 5.  Implement authMiddleware + roleMiddleware
[ ] 6.  Write integration tests for auth flow (tests/integration/auth.test.ts)
[ ] 7.  Implement eligibilityService (section 7.2) + unit tests
[ ] 8.  Implement loanController.apply + loanRoutes (POST /loans/apply, GET /loans/mine, GET /loans/:id)
[ ] 9.  Implement emiCalculator service (section 7.1) as a pure function
[ ] 10. Write unit tests for emiCalculator against 2-3 known amortization examples
[ ] 11. Implement adminController.approve/reject (section 7.3, 8) — approve
        triggers emiCalculator + bulk-inserts Repayment docs + writes AuditLog
[ ] 12. Implement auditService (writes AuditLog entries) and wire it into every
        state-changing action from step 11 onward
[ ] 13. Implement repaymentController (GET schedule with overdue computation
        per 7.4, PATCH mark-paid with CLOSED auto-transition)
[ ] 14. Write integration tests: full flow apply -> approve -> pay all EMIs -> CLOSED
[ ] 15. Implement adminController.getAuditLog (GET /admin/audit/:loanId)
[ ] 16. Add centralized errorHandler middleware + consistent error envelope
[ ] 17. Scaffold client/ (Next.js + Tailwind), lib/api.ts fetch wrapper with JWT
[ ] 18. Build auth pages (login/signup) wired to the API
[ ] 19. Build borrower dashboard + apply form + repayments view
[ ] 20. Build admin pending-applications list + approve/reject detail view
[ ] 21. Write .github/workflows/ci.yml (lint -> test -> build on every push)
[ ] 22. Write Dockerfile for server + verify docker-compose up works end-to-end
[ ] 23. Deploy backend to AWS (EC2 or Elastic Beanstalk) + MongoDB Atlas
[ ] 24. Deploy frontend to Vercel, point NEXT_PUBLIC_API_BASE_URL at AWS backend
[ ] 25. Write README.md (setup instructions, architecture summary, API reference
        link to docs/api-spec.md)
```

---

## 11. Testing Requirements (minimum bar)

```
Unit:
  - emiCalculator: standard case, r=0 edge case, single-month tenure,
    rounding correctness (sum of principal components == loan amount)
  - eligibilityService: amount below/above bounds, tenure below/above bounds,
    duplicate active loan rejection

Integration:
  - signup -> login -> access protected route with token -> 200
  - access protected route without token -> 401
  - borrower attempts admin route -> 403
  - full lifecycle: apply -> admin approve -> repayments generated ->
    pay all EMIs -> loan status becomes CLOSED
  - reject flow: apply -> admin reject -> status REJECTED, no repayments created
```

---

## 12. CI Pipeline (`.github/workflows/ci.yml`) — required steps

```
on: push, pull_request (branches: main)
jobs:
  - checkout code
  - setup Node 20
  - install deps (server + client)
  - run eslint
  - run server unit + integration tests (spin up a Mongo service container)
  - build server (tsc)
  - build client (next build)
```

---

## 13. Definition of Done

```
[ ] All endpoints in section 8 implemented and manually verified via Postman/curl
[ ] All tests in section 11 passing
[ ] CI pipeline green on main branch
[ ] Backend reachable on a public AWS URL
[ ] Frontend reachable on a public Vercel URL, successfully calling the AWS backend
[ ] README documents setup, architecture, and links to API spec
[ ] No secrets committed — .env files gitignored, .env.example provided
```
