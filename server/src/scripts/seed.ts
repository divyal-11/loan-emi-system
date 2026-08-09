import mongoose from "mongoose";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import path from "path";
import { User } from "../models/User";
import { LoanApplication } from "../models/LoanApplication";
import { Repayment } from "../models/Repayment";
import { AuditLog } from "../models/AuditLog";
import { calculateEmiSchedule } from "../services/emiCalculator";

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, "../../.env") });

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/loan-emi-system";
const SALT_ROUNDS = 12;

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

async function seed() {
  console.log("🌱 Starting Database Seed Process...");
  console.log(`Connecting to MongoDB at: ${MONGODB_URI}`);

  await mongoose.connect(MONGODB_URI);

  // 1. Clear existing database collections
  console.log("🧹 Clearing existing collections...");
  await Promise.all([
    User.deleteMany({}),
    LoanApplication.deleteMany({}),
    Repayment.deleteMany({}),
    AuditLog.deleteMany({}),
  ]);

  // 2. Create Users
  console.log("👤 Creating seed users...");
  const borrowerPasswordHash = await bcrypt.hash("password123", SALT_ROUNDS);
  const adminPasswordHash = await bcrypt.hash("adminpass123", SALT_ROUNDS);

  const borrower1 = await User.create({
    name: "Asha Rao",
    email: "asha@example.com",
    passwordHash: borrowerPasswordHash,
    role: "borrower",
  });

  const borrower2 = await User.create({
    name: "Ravi Kumar",
    email: "ravi@example.com",
    passwordHash: borrowerPasswordHash,
    role: "borrower",
  });

  const adminUser = await User.create({
    name: "System Admin",
    email: "admin@example.com",
    passwordHash: adminPasswordHash,
    role: "admin",
  });

  console.log("✅ Seed users created.");

  // 3. Create Sample Loans & Lifecycle Events

  // --- Loan 1: Asha Rao - DISBURSED with 1 EMI Paid ---
  console.log("📄 Creating Loan 1: Asha Rao (DISBURSED with 1 EMI paid)...");
  const appliedDate1 = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000); // 45 days ago
  const decidedDate1 = new Date(Date.now() - 44 * 24 * 60 * 60 * 1000); // 44 days ago

  const loan1 = await LoanApplication.create({
    applicantId: borrower1._id,
    amount: 50000,
    tenureMonths: 12,
    interestRate: 12.0,
    purpose: "Home renovation & repairs",
    status: "DISBURSED",
    appliedAt: appliedDate1,
    decidedAt: decidedDate1,
    decidedBy: adminUser._id,
  });

  await AuditLog.create({
    loanId: loan1._id,
    event: "APPLIED",
    actor: borrower1._id,
    metadata: { amount: 50000, tenureMonths: 12, purpose: "Home renovation & repairs" },
    timestamp: appliedDate1,
  });

  await AuditLog.create({
    loanId: loan1._id,
    event: "APPROVED",
    actor: adminUser._id,
    metadata: {},
    timestamp: decidedDate1,
  });

  await AuditLog.create({
    loanId: loan1._id,
    event: "DISBURSED",
    actor: adminUser._id,
    metadata: { repaymentCount: 12 },
    timestamp: decidedDate1,
  });

  // Schedule for Loan 1
  const schedule1 = calculateEmiSchedule(50000, 12.0, 12);
  const repaymentDocs1 = schedule1.map((inst, index) => {
    const isFirstEMI = index === 0;
    const dueDate = addMonths(appliedDate1, inst.emiNumber);
    const paidAt = isFirstEMI ? new Date(appliedDate1.getTime() + 30 * 24 * 60 * 60 * 1000) : null;

    return {
      loanId: loan1._id,
      emiNumber: inst.emiNumber,
      dueDate,
      principalComponent: inst.principalComponent,
      interestComponent: inst.interestComponent,
      totalAmount: inst.totalAmount,
      status: isFirstEMI ? "PAID" : "UPCOMING",
      paidAt,
    };
  });

  const repayments1 = await Repayment.insertMany(repaymentDocs1);

  // EMI_PAID log for 1st installment
  await AuditLog.create({
    loanId: loan1._id,
    event: "EMI_PAID",
    actor: borrower1._id,
    metadata: {
      repaymentId: repayments1[0]._id.toString(),
      emiNumber: 1,
      totalAmount: repayments1[0].totalAmount,
    },
    timestamp: repayments1[0].paidAt!,
  });

  // --- Loan 2: Ravi Kumar - PENDING ---
  console.log("📄 Creating Loan 2: Ravi Kumar (PENDING)...");
  const appliedDate2 = new Date();

  const loan2 = await LoanApplication.create({
    applicantId: borrower2._id,
    amount: 100000,
    tenureMonths: 24,
    interestRate: 12.0,
    purpose: "Business expansion & equipment purchase",
    status: "PENDING",
    appliedAt: appliedDate2,
  });

  await AuditLog.create({
    loanId: loan2._id,
    event: "APPLIED",
    actor: borrower2._id,
    metadata: { amount: 100000, tenureMonths: 24, purpose: "Business expansion & equipment purchase" },
    timestamp: appliedDate2,
  });

  // --- Loan 3: Asha Rao - REJECTED (Previous Loan) ---
  console.log("📄 Creating Loan 3: Asha Rao (REJECTED)...");
  const appliedDate3 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days ago
  const decidedDate3 = new Date(Date.now() - 89 * 24 * 60 * 60 * 1000);

  const loan3 = await LoanApplication.create({
    applicantId: borrower1._id,
    amount: 300000,
    tenureMonths: 60,
    interestRate: 12.0,
    purpose: "Luxury vehicle purchase",
    status: "REJECTED",
    rejectionReason: "Debt-to-income ratio exceeds policy limits.",
    appliedAt: appliedDate3,
    decidedAt: decidedDate3,
    decidedBy: adminUser._id,
  });

  await AuditLog.create({
    loanId: loan3._id,
    event: "APPLIED",
    actor: borrower1._id,
    metadata: { amount: 300000, tenureMonths: 60, purpose: "Luxury vehicle purchase" },
    timestamp: appliedDate3,
  });

  await AuditLog.create({
    loanId: loan3._id,
    event: "REJECTED",
    actor: adminUser._id,
    metadata: { reason: "Debt-to-income ratio exceeds policy limits." },
    timestamp: decidedDate3,
  });

  console.log("\n========================================================");
  console.log("🚀 DATABASE SEED COMPLETED SUCCESSFULLY!");
  console.log("========================================================");
  console.log("Available Test Accounts:\n");
  console.log("1. Borrower Account:");
  console.log("   - Email:    asha@example.com");
  console.log("   - Password: password123");
  console.log("   - Role:     borrower");
  console.log("   - Loans:    1 Disbursed (1 EMI Paid), 1 Rejected\n");
  console.log("2. Borrower Account 2:");
  console.log("   - Email:    ravi@example.com");
  console.log("   - Password: password123");
  console.log("   - Role:     borrower");
  console.log("   - Loans:    1 Pending application\n");
  console.log("3. Admin Account:");
  console.log("   - Email:    admin@example.com");
  console.log("   - Password: adminpass123");
  console.log("   - Role:     admin\n");
  console.log("========================================================\n");

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("❌ Seeding failed with error:", err);
  process.exit(1);
});
