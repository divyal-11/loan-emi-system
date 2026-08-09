import mongoose, { Schema } from "mongoose";

export type LoanStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "DISBURSED"
  | "CLOSED"
  | "DEFAULTED";

export interface ILoanApplication {
  applicantId: mongoose.Types.ObjectId;
  amount: number;
  tenureMonths: number;
  interestRate: number;
  purpose: string;
  status: LoanStatus;
  rejectionReason?: string | null;
  appliedAt: Date;
  decidedAt: Date | null;
  decidedBy: mongoose.Types.ObjectId | null;
}

const loanApplicationSchema = new Schema<ILoanApplication>(
  {
    applicantId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true, min: 1000, max: 500000 },
    tenureMonths: { type: Number, required: true, min: 3, max: 60 },
    interestRate: { type: Number, required: true, default: 12.0 },
    purpose: { type: String, required: true, maxlength: 200, trim: true },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED", "DISBURSED", "CLOSED", "DEFAULTED"] as LoanStatus[],
      required: true,
      default: "PENDING",
    },
    rejectionReason: { type: String, default: null },
    appliedAt: { type: Date, default: () => new Date() },
    decidedAt: { type: Date, default: null },
    decidedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: false },
);

export const LoanApplication = mongoose.model<ILoanApplication>(
  "LoanApplication",
  loanApplicationSchema,
);
