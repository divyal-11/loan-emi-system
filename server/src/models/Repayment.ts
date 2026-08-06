import mongoose, { Schema } from "mongoose";

export type RepaymentStatus = "PENDING" | "PAID";

export interface IRepayment {
  loanId: mongoose.Types.ObjectId;
  emiNumber: number;
  dueDate: Date;
  principalComponent: number;
  interestComponent: number;
  totalAmount: number;
  status: RepaymentStatus;
  paidAt: Date | null;
}

const repaymentSchema = new Schema<IRepayment>(
  {
    loanId: { type: Schema.Types.ObjectId, ref: "LoanApplication", required: true },
    emiNumber: { type: Number, required: true, min: 1 },
    dueDate: { type: Date, required: true },
    principalComponent: { type: Number, required: true },
    interestComponent: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["PENDING", "PAID"] as RepaymentStatus[],
      required: true,
      default: "PENDING",
    },
    paidAt: { type: Date, default: null },
  },
  { timestamps: false },
);

export const Repayment = mongoose.model<IRepayment>("Repayment", repaymentSchema);
