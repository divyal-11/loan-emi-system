# 🏦 LoanFlex — Automated Loan Processing & EMI Engine

[![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?logo=nodedotjs)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![Next.js](https://img.shields.io/badge/Next.js-16.x-000000?logo=nextdotjs)](https://nextjs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.0-47A248?logo=mongodb)](https://www.mongodb.com)
[![Recharts](https://img.shields.io/badge/Analytics-Recharts-22b8cf?logo=recharts)](https://recharts.org)

LoanFlex is a production-grade, full-stack financial technology application built with **Node.js, Express, TypeScript, MongoDB, Next.js 16 (App Router), and Recharts**. It features an automated loan state machine, a pure mathematical EMI amortization engine with rounding remainder absorption, timing-safe authentication, read-time overdue calculation, a dedicated 3D-Secure Payment Gateway simulator, interactive visual charts, and an immutable audit log trail.

---

## 📐 System Architecture

```
                                  ┌────────────────────────┐
                                  │   Next.js 16 Client    │
                                  │(Recharts + Tailwind CSS)│
                                  └───────────┬────────────┘
                                              │ HTTP / JSON (JWT)
                                              ▼
                                  ┌────────────────────────┐
                                  │   Express API Server   │
                                  │  (TypeScript Node.js)  │
                                  └───────────┬────────────┘
                                              │
         ┌────────────────────────────────────┼────────────────────────────────────┐
         │                                    │                                    │
         ▼                                    ▼                                    ▼
┌─────────────────┐                 ┌──────────────────┐                 ┌──────────────────┐
│  Auth & RBAC    │                 │ Business Logic   │                 │ Audit Logging    │
│  - JWT Bearer   │                 │ - emiCalculator  │                 │ - AuditLog Model │
│  - bcrypt (12)  │                 │ - eligibilitySvc │                 │ - Immutable      │
└────────┬────────┘                 └────────┬─────────┘                 └────────┬─────────┘
         │                                   │                                    │
         └───────────────────────────────────┼────────────────────────────────────┘
                                             │ Mongoose ORM
                                             ▼
                                  ┌────────────────────────┐
                                  │    MongoDB Database    │
                                  │  (4 Core Collections)  │
                                  └────────────────────────┘
```

---

## 🔥 Key Engineering Highlights & Advanced Features

### 1. Visual Financial Analytics & Recharts Suite
- **Donut/Pie Chart Graphs**: Displays live percentages of **Pending (Amber)**, **Disbursed (Indigo)**, **Closed (Emerald)**, and **Rejected (Rose)** loans for Admins, and **Principal vs Interest Split** for Borrowers.
- **Capital Volume Bar Graph**: Compares total **Sanctioned Disbursed Capital (₹)** vs **Total Repayments Collected (₹)** side-by-side.

### 2. Dedicated 3D-Secure Payment Checkout Gateway (`/checkout`)
- **Payment Method Selectors**: UPI / QR Code (Google Pay, PhonePe, Paytm VPA), Debit Card (`4532 •••• •••• 8892`), and NetBanking.
- **3D-Secure Bank OTP Handshake**: 6-digit OTP verification screen with quick **"Fill Demo OTP (123456)"** helper button.
- **Processing Handshake & Auto-Redirect**: Displays a 1.5s *"Connecting to Bank Gateway..."* spinner, marks repayment as `PAID` via API, shows *"Payment Authorized!"* checkmark, and auto-redirects back to `/dashboard`.

### 3. Admin Portfolio Console & Borrower Inspector Modal
- **Status Filter Bar**: Easily toggle between `All Loans`, `Pending Underwriting`, `Disbursed & Active`, `Closed`, and `Rejected`.
- **Borrower Profile Details**: Displays applicant **Name & Email Address** for every loan application row.
- **Admin Loan Inspector Modal**: Inspect any borrower's profile, full repayment schedule ledger, payment timestamps (`paidAt`), and portfolio collection progress bar.

### 4. Exact Amortization & Rounding Remainder Absorption (`emiCalculator.ts`)
The monthly EMI is calculated using the compound amortization formula:
$$\text{EMI} = \frac{P \cdot r \cdot (1+r)^n}{(1+r)^n - 1}$$
Standard floating-point operations accumulate rounding errors across multi-year tenures. LoanFlex enforces a **last-installment remainder absorption rule**:
$$\text{Principal}_{\text{last}} = P_{\text{original}} - \sum_{i=1}^{n-1} \text{Principal}_i$$
This guarantees that $\sum_{i=1}^{n} \text{Principal}_i = P_{\text{original}}$ **to the exact cent**, preventing balance leakage.

### 5. Timing-Safe User Enumeration Protection
In `authController.login`, `bcrypt.compare` is executed **unconditionally** against a pre-computed dummy hash even when the email is not registered:
```typescript
const passwordMatch = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
```
This keeps execution timing identical regardless of email existence, neutralizing side-channel timing attacks that allow attackers to harvest valid email addresses.

### 6. Read-Time Overdue Calculation (Zero DB Writes on Reads)
Installment status is computed dynamically during JSON serialization:
```typescript
if (repayment.status === "UPCOMING" && repayment.dueDate < new Date()) {
  computedStatus = "OVERDUE";
}
```
This avoids expensive background polling jobs or database write-churn while guaranteeing 100% accurate status reporting to clients.

### 7. PDF Sanction Letter & Payment Receipt Exporter (`pdfGenerator.ts`)
Generates official, client-side PDF documents featuring digital verification seals and transaction reference IDs:
- **Loan Sanction & Disbursal Certificate**: Official approval document with applicant details, terms, and SHA-256 verification hash.
- **EMI Payment Receipt**: Instant payment confirmation with itemized principal/interest breakdown and `STATUS: PAID` stamp.

---

## 🔑 Demo Test Credentials

When running `npm run seed`, the database is populated with the following ready-to-use accounts:

| Role | Email | Password | Pre-loaded Data |
| :--- | :--- | :--- | :--- |
| **Borrower** | `asha@example.com` | `password123` | 1 Disbursed Loan (5 EMIs Paid), 1 Rejected Loan |
| **Borrower** | `ravi@example.com` | `password123` | 1 Rejected Loan Application |
| **Admin** | `admin@example.com` | `adminpass123` | Full admin privileges for approvals, inspection & audit logs |

---

## 🔌 API Reference Table

| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| **POST** | `/api/auth/signup` | Public | Register new user (`borrower` / `admin`) |
| **POST** | `/api/auth/login` | Public | Authenticate user, return JWT token |
| **GET** | `/api/auth/me` | Protected | Fetch current user profile |
| **POST** | `/api/loans/apply` | Borrower | Submit loan application (checks 4 eligibility rules) |
| **GET** | `/api/loans/mine` | Borrower | List current borrower's loan applications |
| **GET** | `/api/loans/:id` | Shared | Fetch loan details (explicit in-controller ownership check) |
| **GET** | `/api/admin/loans/all` | Admin | List all loan applications with populated applicant details & portfolio metrics |
| **GET** | `/api/admin/loans/pending` | Admin | List all pending loan applications |
| **PATCH** | `/api/admin/loans/:id/approve` | Admin | Approve & Disburse loan, generate EMI schedule |
| **PATCH** | `/api/admin/loans/:id/reject` | Admin | Reject loan application with optional reason |
| **GET** | `/api/repayments/:loanId` | Shared | Fetch EMI schedule with read-time `OVERDUE` computation |
| **PATCH** | `/api/repayments/:id/pay` | Borrower | Mark EMI as paid (auto-closes loan when final EMI paid) |
| **GET** | `/api/admin/audit/:loanId` | Admin | Fetch full, ordered audit trail for a loan |

---

## 🚀 Cloud Deployment & Containerization

LoanFlex is fully configured for zero-downtime cloud deployment:
- **Cloud Deployment Guide**: Detailed step-by-step instructions in [`docs/deployment-guide.md`](file:///c:/Users/divya/Projects/loan-emi-system/docs/deployment-guide.md).
- **Docker Production Container**: [`server/Dockerfile`](file:///c:/Users/divya/Projects/loan-emi-system/server/Dockerfile) (Multi-stage Node.js build).
- **Render.com Blueprint**: [`server/render.yaml`](file:///c:/Users/divya/Projects/loan-emi-system/server/render.yaml) (Express API backend).
- **Vercel Configuration**: [`client/vercel.json`](file:///c:/Users/divya/Projects/loan-emi-system/client/vercel.json) (Next.js 16 App Router).

---

## 🛠️ Local Development & Setup

### Prerequisites
- Node.js `20.x` or later
- Docker & Docker Compose (for MongoDB) or local MongoDB instance

### 1. Database Setup (Docker)
```bash
docker-compose up -d
```

### 2. Backend Server Setup
```bash
cd server
npm install
npm run seed     # Populate test accounts & sample loans
npm run dev      # Server starts on http://localhost:5000
```

### 3. Frontend Client Setup
```bash
cd client
npm install
npm run dev      # Client starts on http://localhost:3000
```

---

## 📄 License
Licensed under the [ISC License](LICENSE).
