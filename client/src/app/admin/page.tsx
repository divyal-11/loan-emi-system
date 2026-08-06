"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import { AuditLogModal } from "../../components/admin/AuditLogModal";
import { RejectReasonModal } from "../../components/admin/RejectReasonModal";
import { api, ApiError } from "../../lib/api";
import {
  ShieldAlert,
  Clock,
  CheckCircle2,
  XCircle,
  History,
  IndianRupee,
  AlertCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";

export interface PendingLoanItem {
  id: string;
  applicantId: string;
  amount: number;
  tenureMonths: number;
  interestRate: number;
  purpose: string;
  status: "PENDING";
  appliedAt: string;
}

export default function AdminDashboardPage() {
  const [pendingLoans, setPendingLoans] = useState<PendingLoanItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectingLoanId, setRejectingLoanId] = useState<string | null>(null);
  const [auditLoanId, setAuditLoanId] = useState<string | null>(null);

  const fetchPendingLoans = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await api.get<PendingLoanItem[]>("/admin/loans/pending");
      setPendingLoans(data);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to fetch pending applications.");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPendingLoans();
  }, [fetchPendingLoans]);

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    setError(null);
    setActionSuccessMsg(null);

    try {
      await api.patch(`/admin/loans/${id}/approve`);
      setActionSuccessMsg(`Loan ${id.substring(0, 8)}... successfully approved and disbursed!`);
      await fetchPendingLoans();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to approve loan application.");
      }
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectConfirm = async (reason: string) => {
    if (!rejectingLoanId) return;

    try {
      await api.patch(`/admin/loans/${rejectingLoanId}/reject`, { reason });
      setActionSuccessMsg(`Loan ${rejectingLoanId.substring(0, 8)}... successfully rejected.`);
      await fetchPendingLoans();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        throw new Error(err.message);
      }
      throw new Error("Failed to reject loan application.");
    }
  };

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* Top Hero / Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 p-6 rounded-2xl border border-amber-500/20 shadow-xl">
            <div>
              <div className="flex items-center space-x-2">
                <ShieldAlert className="w-6 h-6 text-amber-400" />
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Admin Console
                </h1>
              </div>
              <p className="text-slate-400 text-sm mt-1">
                Review pending loan applications, disburse funds, and inspect audit trails.
              </p>
            </div>

            <button
              onClick={fetchPendingLoans}
              disabled={isLoading}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm border border-slate-700 transition-all shrink-0"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
              <span>Refresh Queue</span>
            </button>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 flex items-center space-x-4">
              <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs uppercase font-mono text-slate-400 block">
                  Pending Approval Queue
                </span>
                <span className="text-2xl font-bold font-mono text-white">
                  {pendingLoans.length} Applications
                </span>
              </div>
            </div>

            <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 flex items-center space-x-4">
              <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
                <IndianRupee className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs uppercase font-mono text-slate-400 block">
                  Total Pending Volume
                </span>
                <span className="text-2xl font-bold font-mono text-white">
                  ₹{pendingLoans.reduce((sum, l) => sum + l.amount, 0).toLocaleString("en-IN")}
                </span>
              </div>
            </div>

          </div>

          {/* Action Feedback Banners */}
          {actionSuccessMsg && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm flex items-start space-x-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <span>{actionSuccessMsg}</span>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Pending Applications Queue */}
          <div className="bg-slate-900/80 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="font-semibold text-lg text-white">Pending Approval Queue</h2>
              <span className="text-xs font-mono text-slate-400">
                {pendingLoans.length} items requiring decision
              </span>
            </div>

            {isLoading ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-2" />
                <p className="text-sm font-medium">Loading queue...</p>
              </div>
            ) : pendingLoans.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
                <p className="text-base font-medium text-white">Queue is clear!</p>
                <p className="text-xs text-slate-500 mt-1">
                  There are currently no pending loan applications requiring admin decision.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-950/60 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800 font-mono">
                    <tr>
                      <th className="px-6 py-3.5">Loan ID</th>
                      <th className="px-6 py-3.5">Applicant ID</th>
                      <th className="px-6 py-3.5">Amount</th>
                      <th className="px-6 py-3.5">Tenure</th>
                      <th className="px-6 py-3.5">Purpose</th>
                      <th className="px-6 py-3.5">Applied On</th>
                      <th className="px-6 py-3.5 text-right">Admin Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {pendingLoans.map((loan) => {
                      const isProcessingThis = processingId === loan.id;

                      return (
                        <tr key={loan.id} className="hover:bg-slate-900/50 transition-colors">
                          <td className="px-6 py-4 font-mono text-xs text-amber-400 font-medium">
                            {loan.id.substring(0, 10)}...
                          </td>
                          <td className="px-6 py-4 font-mono text-xs text-slate-400">
                            {loan.applicantId.substring(0, 10)}...
                          </td>
                          <td className="px-6 py-4 font-mono font-bold text-white">
                            ₹{loan.amount.toLocaleString("en-IN")}
                          </td>
                          <td className="px-6 py-4 font-mono text-slate-300">
                            {loan.tenureMonths} Months
                          </td>
                          <td className="px-6 py-4 text-slate-300 max-w-xs truncate">
                            {loan.purpose}
                          </td>
                          <td className="px-6 py-4 font-mono text-xs text-slate-400">
                            {new Date(loan.appliedAt).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              
                              {/* Audit Trail Button */}
                              <button
                                onClick={() => setAuditLoanId(loan.id)}
                                className="p-2 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
                                title="View Audit Trail"
                              >
                                <History className="w-4 h-4" />
                              </button>

                              {/* Reject Button */}
                              <button
                                onClick={() => setRejectingLoanId(loan.id)}
                                disabled={isProcessingThis}
                                className="px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 font-medium text-xs transition-all disabled:opacity-50 flex items-center space-x-1"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Reject</span>
                              </button>

                              {/* Approve Button */}
                              <button
                                onClick={() => handleApprove(loan.id)}
                                disabled={isProcessingThis}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-950 transition-all disabled:opacity-50 flex items-center space-x-1"
                              >
                                {isProcessingThis ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                )}
                                <span>{isProcessingThis ? "Approving..." : "Approve"}</span>
                              </button>

                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

          </div>

        </div>

        {/* Reject Reason Modal */}
        <RejectReasonModal
          isOpen={!!rejectingLoanId}
          loanId={rejectingLoanId}
          onClose={() => setRejectingLoanId(null)}
          onConfirm={handleRejectConfirm}
        />

        {/* Audit Log Modal */}
        <AuditLogModal
          isOpen={!!auditLoanId}
          loanId={auditLoanId}
          onClose={() => setAuditLoanId(null)}
        />

      </div>
    </ProtectedRoute>
  );
}
