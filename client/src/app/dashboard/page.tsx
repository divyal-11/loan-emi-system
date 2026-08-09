"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import { ApplyLoanModal } from "../../components/borrower/ApplyLoanModal";
import { RepaymentScheduleModal } from "../../components/borrower/RepaymentScheduleModal";
import { api, ApiError } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { generateSanctionLetter } from "../../lib/pdfGenerator";
import {
  PlusCircle,
  Clock,
  CheckCircle2,
  XCircle,
  FileCheck,
  IndianRupee,
  Calendar,
  AlertCircle,
  Loader2,
  Eye,
  CreditCard,
  Building,
  Download,
} from "lucide-react";

export interface LoanItem {
  id: string;
  applicantId: string;
  amount: number;
  tenureMonths: number;
  interestRate: number;
  purpose: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "DISBURSED" | "CLOSED" | "DEFAULTED";
  rejectionReason?: string | null;
  appliedAt: string;
  decidedAt: string | null;
  decidedBy: string | null;
}

export default function BorrowerDashboardPage() {
  const { user } = useAuth();
  const [loans, setLoans] = useState<LoanItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [isApplyModalOpen, setIsApplyModalOpen] = useState<boolean>(false);
  const [selectedLoanIdForSchedule, setSelectedLoanIdForSchedule] = useState<string | null>(null);

  const fetchMyLoans = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await api.get<LoanItem[]>("/loans/mine");
      setLoans(data);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to fetch loan applications.");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyLoans();
  }, [fetchMyLoans]);

  const activeLoan = loans.find((l) =>
    ["PENDING", "APPROVED", "DISBURSED"].includes(l.status),
  );

  const totalBorrowed = loans
    .filter((l) => ["DISBURSED", "CLOSED"].includes(l.status))
    .reduce((sum, l) => sum + l.amount, 0);

  return (
    <ProtectedRoute allowedRoles={["borrower"]}>
      <div className="min-h-screen bg-black text-zinc-100 p-4 sm:p-6 lg:p-8 font-sans selection:bg-red-500/30 selection:text-red-200">
        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* Top Hero / Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-red-950/40 via-zinc-900 to-zinc-950 p-6 rounded-2xl border border-red-500/20 shadow-2xl shadow-red-950/20">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Borrower Dashboard
              </h1>
              <p className="text-zinc-400 text-sm mt-1">
                Track active credit applications, repayment schedules, and loan analytics.
              </p>
            </div>

            <button
              onClick={() => setIsApplyModalOpen(true)}
              className="inline-flex items-center space-x-2 px-5 py-3 rounded-xl bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-semibold text-sm shadow-xl shadow-red-950 transition-all shrink-0 hover:scale-[1.02]"
            >
              <PlusCircle className="w-5 h-5" />
              <span>Apply for New Loan</span>
            </button>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            
            {/* Card 1: Active Loan */}
            <div className="bg-zinc-900/90 p-5 rounded-2xl border border-zinc-800 flex items-center space-x-4 hover:border-red-500/30 transition-all shadow-lg">
              <div className="p-3 bg-red-500/10 text-red-400 rounded-xl border border-red-500/20">
                <Building className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs uppercase font-mono text-zinc-400 block tracking-wider">
                  Active Loan Status
                </span>
                <span className="text-lg font-bold text-white">
                  {activeLoan ? (
                    <span className="text-red-400 font-mono">{activeLoan.status}</span>
                  ) : (
                    <span className="text-zinc-500">No Active Loan</span>
                  )}
                </span>
              </div>
            </div>

            {/* Card 2: Total Disbursed */}
            <div className="bg-zinc-900/90 p-5 rounded-2xl border border-zinc-800 flex items-center space-x-4 hover:border-red-500/30 transition-all shadow-lg">
              <div className="p-3 bg-red-500/10 text-red-400 rounded-xl border border-red-500/20">
                <IndianRupee className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs uppercase font-mono text-zinc-400 block tracking-wider">
                  Total Disbursed Volume
                </span>
                <span className="text-2xl font-bold font-mono text-white">
                  ₹{totalBorrowed.toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            {/* Card 3: Total Applications */}
            <div className="bg-zinc-900/90 p-5 rounded-2xl border border-zinc-800 flex items-center space-x-4 hover:border-red-500/30 transition-all shadow-lg">
              <div className="p-3 bg-red-500/10 text-red-400 rounded-xl border border-red-500/20">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs uppercase font-mono text-zinc-400 block tracking-wider">
                  Total Applications
                </span>
                <span className="text-2xl font-bold font-mono text-white">
                  {loans.length}
                </span>
              </div>
            </div>

          </div>

          {/* Error Notice */}
          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Applications List */}
          <div className="bg-zinc-900/90 rounded-2xl border border-zinc-800 overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/50">
              <h2 className="font-semibold text-lg text-white">My Loan Applications</h2>
              <span className="text-xs font-mono text-zinc-400">
                {loans.length} total records
              </span>
            </div>

            {isLoading ? (
              <div className="py-20 flex flex-col items-center justify-center text-zinc-400">
                <Loader2 className="w-8 h-8 animate-spin text-red-500 mb-2" />
                <p className="text-sm font-medium">Loading applications...</p>
              </div>
            ) : loans.length === 0 ? (
              <div className="py-16 text-center text-zinc-400">
                <p className="text-base font-medium text-zinc-300">No loan applications found.</p>
                <p className="text-xs text-zinc-500 mt-1">
                  Click &quot;Apply for New Loan&quot; above to submit your application.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-zinc-300">
                  <thead className="bg-zinc-950/80 text-xs uppercase tracking-wider text-zinc-400 border-b border-zinc-800 font-mono">
                    <tr>
                      <th className="px-6 py-3.5">Loan ID</th>
                      <th className="px-6 py-3.5">Amount</th>
                      <th className="px-6 py-3.5">Tenure</th>
                      <th className="px-6 py-3.5">Purpose</th>
                      <th className="px-6 py-3.5">Status</th>
                      <th className="px-6 py-3.5">Applied On</th>
                      <th className="px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {loans.map((loan) => {
                      return (
                        <React.Fragment key={loan.id}>
                          <tr className="hover:bg-zinc-900/80 transition-colors">
                            <td className="px-6 py-4 font-mono text-xs text-red-400 font-medium">
                              {loan.id.substring(0, 10)}...
                            </td>
                            <td className="px-6 py-4 font-mono font-bold text-white text-base">
                              ₹{loan.amount.toLocaleString("en-IN")}
                            </td>
                            <td className="px-6 py-4 font-mono text-zinc-300">
                              {loan.tenureMonths} Months
                            </td>
                            <td className="px-6 py-4 text-zinc-300 max-w-xs truncate">
                              {loan.purpose}
                            </td>
                            <td className="px-6 py-4">
                              {loan.status === "PENDING" && (
                                <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                                  <span>Pending</span>
                                </span>
                              )}
                              {loan.status === "DISBURSED" && (
                                <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>Disbursed</span>
                                </span>
                              )}
                              {loan.status === "CLOSED" && (
                                <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700">
                                  <FileCheck className="w-3.5 h-3.5 text-zinc-400" />
                                  <span>Closed</span>
                                </span>
                              )}
                              {loan.status === "REJECTED" && (
                                <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-300 border border-red-500/40 shadow-sm shadow-red-950">
                                  <XCircle className="w-3.5 h-3.5 text-red-400" />
                                  <span>Rejected</span>
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 font-mono text-xs text-zinc-400">
                              {new Date(loan.appliedAt).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </td>
                            <td className="px-6 py-4 text-right">
                              {["DISBURSED", "CLOSED"].includes(loan.status) ? (
                                <div className="flex items-center justify-end space-x-2">
                                  <button
                                    onClick={() => user && generateSanctionLetter(loan, user)}
                                    className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 font-medium text-xs transition-colors"
                                    title="Download Sanction Letter PDF"
                                  >
                                    <Download className="w-3.5 h-3.5 text-red-400" />
                                    <span>Sanction Letter</span>
                                  </button>
                                  <button
                                    onClick={() => setSelectedLoanIdForSchedule(loan.id)}
                                    className="inline-flex items-center space-x-1 px-3.5 py-1.5 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/40 font-medium text-xs transition-all shadow-md shadow-red-950"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>Schedule & Pay</span>
                                  </button>
                                </div>
                              ) : (
                                <span className="text-xs text-zinc-600 font-mono">—</span>
                              )}
                            </td>
                          </tr>

                          {/* Decline Reason Notice Card */}
                          {loan.status === "REJECTED" && (
                            <tr className="bg-red-950/30 border-b border-red-500/20">
                              <td colSpan={7} className="px-6 py-3.5">
                                <div className="flex items-start space-x-3 p-4 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs shadow-lg shadow-red-950/30">
                                  <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                                  <div className="space-y-1">
                                    <span className="font-bold text-red-200 block text-xs tracking-wider uppercase font-mono">
                                      DECLINE REASON NOTICE:
                                    </span>
                                    <p className="text-zinc-100 font-medium text-sm">
                                      &quot;{loan.rejectionReason || "Application did not meet internal credit risk & underwriting criteria."}&quot;
                                    </p>
                                    <p className="text-[11px] text-zinc-400">
                                      If you have questions regarding this credit decision, please contact underwriting support.
                                    </p>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

          </div>

        </div>

        {/* Apply Loan Modal */}
        <ApplyLoanModal
          isOpen={isApplyModalOpen}
          onClose={() => setIsApplyModalOpen(false)}
          onSuccess={fetchMyLoans}
        />

        {/* Schedule & Pay Modal */}
        <RepaymentScheduleModal
          loanId={selectedLoanIdForSchedule}
          isOpen={!!selectedLoanIdForSchedule}
          onClose={() => setSelectedLoanIdForSchedule(null)}
          onLoanUpdated={fetchMyLoans}
        />

      </div>
    </ProtectedRoute>
  );
}
