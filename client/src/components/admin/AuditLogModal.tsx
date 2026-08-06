"use client";

import React, { useState, useEffect, useCallback } from "react";
import { api, ApiError } from "../../lib/api";
import { X, History, Clock, CheckCircle2, XCircle, ArrowRightLeft, FileCheck, Loader2, AlertCircle } from "lucide-react";

export interface AuditItem {
  id: string;
  loanId: string;
  event: "APPLIED" | "APPROVED" | "REJECTED" | "DISBURSED" | "EMI_PAID" | "CLOSED" | "DEFAULTED";
  actor: string;
  metadata: Record<string, unknown>;
  timestamp: string;
}

interface AuditLogModalProps {
  loanId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AuditLogModal({ loanId, isOpen, onClose }: AuditLogModalProps) {
  const [logs, setLogs] = useState<AuditItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAuditLogs = useCallback(async () => {
    if (!loanId) return;
    setIsLoading(true);
    setError(null);

    try {
      const data = await api.get<AuditItem[]>(`/admin/audit/${loanId}`);
      setLogs(data);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to fetch audit log trail.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [loanId]);

  useEffect(() => {
    if (isOpen && loanId) {
      fetchAuditLogs();
    }
  }, [isOpen, loanId, fetchAuditLogs]);

  if (!isOpen || !loanId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-white">Immutable Audit Trail</h3>
              <p className="text-xs text-slate-400 font-mono">Loan ID: {loanId}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-2" />
              <p className="text-sm font-medium">Fetching audit trail...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <p className="text-sm">No audit logs recorded for this loan.</p>
            </div>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-800">
              {logs.map((log) => {
                let badgeStyle = "bg-slate-800 text-slate-300 border-slate-700";
                let Icon = Clock;

                if (log.event === "APPLIED") {
                  badgeStyle = "bg-indigo-500/10 text-indigo-300 border-indigo-500/30";
                  Icon = Clock;
                } else if (log.event === "APPROVED") {
                  badgeStyle = "bg-emerald-500/10 text-emerald-300 border-emerald-500/30";
                  Icon = CheckCircle2;
                } else if (log.event === "DISBURSED") {
                  badgeStyle = "bg-teal-500/10 text-teal-300 border-teal-500/30";
                  Icon = ArrowRightLeft;
                } else if (log.event === "EMI_PAID") {
                  badgeStyle = "bg-sky-500/10 text-sky-300 border-sky-500/30";
                  Icon = CheckCircle2;
                } else if (log.event === "CLOSED") {
                  badgeStyle = "bg-violet-500/10 text-violet-300 border-violet-500/30";
                  Icon = FileCheck;
                } else if (log.event === "REJECTED") {
                  badgeStyle = "bg-rose-500/10 text-rose-300 border-rose-500/30";
                  Icon = XCircle;
                }

                return (
                  <div key={log.id} className="relative flex items-start space-x-3">
                    <div className="absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-slate-900 border-2 border-amber-500 shrink-0" />

                    <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 w-full space-y-2">
                      <div className="flex items-center justify-between">
                        <span
                          className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider border ${badgeStyle}`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span>{log.event}</span>
                        </span>
                        <span className="font-mono text-xs text-slate-400">
                          {new Date(log.timestamp).toLocaleString("en-IN")}
                        </span>
                      </div>

                      <div className="text-xs text-slate-400 font-mono">
                        Actor ID: <span className="text-slate-300">{log.actor}</span>
                      </div>

                      {Object.keys(log.metadata).length > 0 && (
                        <div className="mt-2 bg-slate-900 p-2.5 rounded-lg border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto">
                          <pre>{JSON.stringify(log.metadata, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
