import mongoose, { Schema } from "mongoose";

export type AuditEvent =
  | "APPLIED"
  | "APPROVED"
  | "REJECTED"
  | "DISBURSED"
  | "EMI_PAID"
  | "DEFAULTED";

export interface IAuditLog {
  loanId: mongoose.Types.ObjectId;
  event: AuditEvent;
  actor: mongoose.Types.ObjectId;
  metadata: Record<string, unknown>;
  timestamp: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    loanId: { type: Schema.Types.ObjectId, ref: "LoanApplication", required: true },
    event: {
      type: String,
      enum: ["APPLIED", "APPROVED", "REJECTED", "DISBURSED", "EMI_PAID", "DEFAULTED"] as AuditEvent[],
      required: true,
    },
    actor: { type: Schema.Types.ObjectId, ref: "User", required: true },
    // Free-form snapshot of relevant fields at the time of the event.
    // Mixed type is intentional — spec §6 says Record<string, unknown>.
    metadata: { type: Schema.Types.Mixed, default: {} },
    timestamp: { type: Date, default: () => new Date() },
  },
  {
    // No updatedAt — audit entries are immutable by design
    timestamps: false,
  },
);

export const AuditLog = mongoose.model<IAuditLog>("AuditLog", auditLogSchema);
