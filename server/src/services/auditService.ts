import mongoose from "mongoose";
import { AuditLog, type AuditEvent } from "../models/AuditLog";

/**
 * Writes a single immutable AuditLog entry for a loan state change.
 * Must be called within the same request that caused the state change
 * (spec §3: "no separate cleanup job").
 */
export async function writeAuditEntry({
  loanId,
  event,
  actor,
  metadata = {},
}: {
  loanId: mongoose.Types.ObjectId | string;
  event: AuditEvent;
  actor: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await AuditLog.create({ loanId, event, actor, metadata });
}
