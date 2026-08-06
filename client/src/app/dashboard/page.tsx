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
      <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* Top Hero / Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-indigo-900/40 via-slate-900 to-slate-900 p-6 rounded-2xl border border-indigo-500/20 shadow-xl">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Borrower Dashboard
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                Track your active applications, EMI schedules, and repayment status.
              </p>
            </div>

            <button
              onClick={() => setIsApplyModalOpen(true)}
              className="inline-flex items-center space-x-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 transition-all shrink-0"
            >
              <PlusCircle className="w-5 h-5" />
              <span>Apply for New Loan</span>
            </button>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            
            {/* Card 1: Active Loan */}
            <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 flex items-center space-x-4">
              <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
                <Building className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs uppercase font-mono text-slate-400 block">
                  Active Loan Status
                </span>
                <span className="text-lg font-bold text-white">
                  {activeLoan ? (
                    <span className="text-indigo-400">{activeLoan.status}</span>
                  ) : (
                    <span className="text-slate-500">No Active Loan</span>
                  )}
                </span>
              </div>
            </div>

            {/* Card 2: Total Disbursed */}
            <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 flex items-center space-x-4">
              <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                <IndianRupee className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs uppercase font-mono text-slate-400 block">
                  Total Disbursed Volume
                </span>
                <span className="text-2xl font-bold font-mono text-white">
                  ₹{totalBorrowed.toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            {/* Card 3: Total Applications */}
            <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 flex items-center space-x-4">
              <div className="p-3 bg-violet-500/10 text-violet-400 rounded-xl border border-violet-500/20">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs uppercase font-mono text-slate-400 block">
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
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Applications List */}
          <div className="bg-slate-900/80 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="font-semibold text-lg text-white">My Loan Applications</h2>
              <span className="text-xs font-mono text-slate-400">
                {loans.length} total records
              </span>
            </div>

            {isLoading ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
                <p className="text-sm font-medium">Loading applications...</p>
              </div>
            ) : loans.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <p className="text-base font-medium">No loan applications found.</p>
                <p className="text-xs text-slate-500 mt-1">
                  Click &quot;Apply for New Loan&quot; above to submit your first application.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-950/60 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800 font-mono">
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
                  <tbody className="divide-y divide-slate-800/60">
                    {loans.map((loan) => {
                      return (
                        <tr key={loan.id} className="hover:bg-slate-900/50 transition-colors">
                          <td className="px-6 py-4 font-mono text-xs text-indigo-400 font-medium">
                            {loan.id.substring(0, 10)}...
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
                              <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                                <FileCheck className="w-3.5 h-3.5 text-indigo-400" />
                                <span>Closed</span>
                              </span>
                            )}
                            {loan.status === "REJECTED" && (
                              <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/20">
                                <XCircle className="w-3.5 h-3.5 text-rose-400" />
                                <span>Rejected</span>
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 font-mono text-xs text-slate-400">
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
                                  className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-medium text-xs transition-colors"
                                  title="Download Sanction Letter PDF"
                                >
                                  <Download className="w-3.5 h-3.5 text-indigo-400" />
                                  <span>Sanction Letter</span>
                                </button>
                                <button
                                  onClick={() => setSelectedLoanIdForSchedule(loan.id)}
                                  className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 font-medium text-xs transition-colors"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Schedule & Pay</span>
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-500 font-mono">—</span>
                            )}
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
