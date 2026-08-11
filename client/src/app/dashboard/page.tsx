"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import { ApplyLoanModal } from "../../components/borrower/ApplyLoanModal";
import { RepaymentScheduleModal, RepaymentItem } from "../../components/borrower/RepaymentScheduleModal";
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
  PieChart as PieIcon,
  TrendingUp,
  ShieldCheck,
} from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

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
  const [repayments, setRepayments] = useState<RepaymentItem[]>([]);
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

      const activeDisbursed = data.find((l) => l.status === "DISBURSED" || l.status === "CLOSED");
      if (activeDisbursed) {
        try {
          const repData = await api.get<RepaymentItem[]>(`/repayments/${activeDisbursed.id}`);
          setRepayments(repData);
        } catch {
          setRepayments([]);
        }
      }
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

  // Amortization Chart Data for Active Loan
  const totalPaidPrincipal = repayments
    .filter((r) => r.status === "PAID")
    .reduce((sum, r) => sum + r.principalComponent, 0);

  const totalPaidInterest = repayments
    .filter((r) => r.status === "PAID")
    .reduce((sum, r) => sum + r.interestComponent, 0);

  const totalPaid = totalPaidPrincipal + totalPaidInterest;
  const totalExpected = repayments.reduce((sum, r) => sum + r.totalAmount, 0);
  const paidPercentage = totalExpected > 0 ? Math.round((totalPaid / totalExpected) * 100) : 0;

  const borrowerPieData = [
    { name: "Principal Repaid", value: Math.round(totalPaidPrincipal), color: "#6366f1" },
    { name: "Interest Component", value: Math.round(totalPaidInterest), color: "#10b981" },
  ].filter((item) => item.value > 0);

  return (
    <ProtectedRoute allowedRoles={["borrower"]}>
      <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 font-sans selection:bg-indigo-500/30 selection:text-indigo-200 relative overflow-hidden">
        
        {/* Subtle Ambient Indigo Background Glow */}
        <div className="absolute top-10 left-1/3 w-[500px] h-[300px] bg-indigo-600/10 blur-[140px] pointer-events-none rounded-full" />

        <div className="max-w-7xl mx-auto space-y-8 relative z-10">
          
          {/* Top Hero Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-2xl">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-400 bg-indigo-600/20 px-3 py-1 rounded-full border border-indigo-500/30">
                  FinTech Credit Suite
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-2">
                Borrower Credit Hub
              </h1>
              <p className="text-slate-400 text-sm mt-1 font-medium">
                Calculate EMIs in real-time, inspect repayment schedules, and make secure payments.
              </p>
            </div>

            <button
              onClick={() => setIsApplyModalOpen(true)}
              className="inline-flex items-center space-x-2 px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-sm shadow-xl shadow-indigo-950 transition-all shrink-0 hover:scale-[1.02]"
            >
              <PlusCircle className="w-5 h-5 text-white" />
              <span>Apply for New Loan</span>
            </button>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            
            {/* Card 1: Active Loan */}
            <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 flex items-center space-x-4 hover:border-indigo-500/40 transition-all shadow-xl">
              <div className="p-3.5 bg-indigo-600/20 text-indigo-400 rounded-2xl border border-indigo-500/30">
                <Building className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs uppercase font-mono text-slate-400 block tracking-wider font-bold">
                  Active Credit Status
                </span>
                <span className="text-lg font-bold font-mono">
                  {activeLoan ? (
                    <span className="text-emerald-400 font-extrabold">{activeLoan.status}</span>
                  ) : (
                    <span className="text-slate-500">No Active Loan</span>
                  )}
                </span>
              </div>
            </div>

            {/* Card 2: Total Disbursed */}
            <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 flex items-center space-x-4 hover:border-indigo-500/40 transition-all shadow-xl">
              <div className="p-3.5 bg-indigo-600/20 text-indigo-400 rounded-2xl border border-indigo-500/30">
                <IndianRupee className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs uppercase font-mono text-slate-400 block tracking-wider font-bold">
                  Total Disbursed Volume
                </span>
                <span className="text-2xl font-extrabold font-mono text-white">
                  ₹{totalBorrowed.toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            {/* Card 3: Total Applications */}
            <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 flex items-center space-x-4 hover:border-indigo-500/40 transition-all shadow-xl">
              <div className="p-3.5 bg-indigo-600/20 text-indigo-400 rounded-2xl border border-indigo-500/30">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs uppercase font-mono text-slate-400 block tracking-wider font-bold">
                  Total Applications
                </span>
                <span className="text-2xl font-extrabold font-mono text-white">
                  {loans.length}
                </span>
              </div>
            </div>

          </div>

          {/* Option B: Full-Width Detailed Active Repayment Progress Tracker */}
          {repayments.length > 0 && activeLoan && (
            <div className="bg-slate-900 p-6 sm:p-7 rounded-3xl border border-slate-800 shadow-2xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                      Active Credit Repayment Progress
                      <span className="text-xs font-mono text-indigo-400 font-bold bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
                        LFL-{activeLoan.id.substring(0, 8).toUpperCase()}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">
                      Sanctioned Amount: ₹{activeLoan.amount.toLocaleString("en-IN")} @ {activeLoan.interestRate}% p.a. Fixed
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-3.5 py-1.5 rounded-full border border-emerald-500/20">
                    {paidPercentage}% Repaid
                  </span>
                  {user && (
                    <button
                      onClick={() => generateSanctionLetter(activeLoan, user)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-bold rounded-xl border border-slate-700 transition-colors"
                      title="Download Official Sanction Certificate PDF"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Sanction Letter PDF</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Big Detailed Progress Indicator Bar */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs font-mono font-bold">
                  <span className="text-slate-400 font-sans font-medium">Total Capital Repaid to Date</span>
                  <span className="text-indigo-400 text-sm">
                    ₹{Math.round(totalPaid).toLocaleString("en-IN")} / ₹{Math.round(totalExpected).toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="w-full bg-slate-950 h-3.5 rounded-full p-0.5 border border-slate-800 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-indigo-500 via-indigo-400 to-emerald-400 h-full rounded-full transition-all duration-700 shadow-md shadow-indigo-500/30"
                    style={{ width: `${paidPercentage}%` }}
                  />
                </div>
              </div>

              {/* 4-Grid Detailed Financial Breakdown */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-950/70 rounded-2xl border border-slate-800/80 space-y-1">
                  <span className="text-xs font-medium text-slate-400 block">Principal Repaid</span>
                  <span className="text-base font-extrabold text-indigo-300 font-mono">
                    ₹{Math.round(totalPaidPrincipal).toLocaleString("en-IN")}
                  </span>
                </div>

                <div className="p-4 bg-slate-950/70 rounded-2xl border border-slate-800/80 space-y-1">
                  <span className="text-xs font-medium text-slate-400 block">Interest Component Paid</span>
                  <span className="text-base font-extrabold text-emerald-400 font-mono">
                    ₹{Math.round(totalPaidInterest).toLocaleString("en-IN")}
                  </span>
                </div>

                <div className="p-4 bg-slate-950/70 rounded-2xl border border-slate-800/80 space-y-1">
                  <span className="text-xs font-medium text-slate-400 block">Outstanding Balance</span>
                  <span className="text-base font-extrabold text-amber-400 font-mono">
                    ₹{Math.max(0, Math.round(totalExpected - totalPaid)).toLocaleString("en-IN")}
                  </span>
                </div>

                <div className="p-4 bg-slate-950/70 rounded-2xl border border-slate-800/80 space-y-1">
                  <span className="text-xs font-medium text-slate-400 block">Installments Progress</span>
                  <span className="text-base font-extrabold text-slate-100 font-mono">
                    {repayments.filter((r) => r.status === "PAID").length} of {repayments.length} EMIs
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Error Notice */}
          {error && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Applications Table Container */}
          <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
            <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div>
                <h2 className="font-extrabold text-lg text-white">My Loan Applications</h2>
                <p className="text-xs text-slate-400 font-medium">Historical & active credit submissions</p>
              </div>
            </div>

            {isLoading ? (
              <div className="p-12 text-center text-slate-400 space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto" />
                <p className="text-sm font-medium">Fetching credit records...</p>
              </div>
            ) : loans.length === 0 ? (
              <div className="p-16 text-center space-y-4">
                <Building className="w-12 h-12 text-slate-600 mx-auto" />
                <div>
                  <h3 className="text-base font-bold text-slate-200">No Loan Applications Found</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    You haven't submitted any loan requests yet. Click the button above to calculate EMIs and apply.
                  </p>
                </div>
                <button
                  onClick={() => setIsApplyModalOpen(true)}
                  className="inline-flex items-center space-x-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Apply Now</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-950/40 text-slate-400 uppercase text-[10px] sm:text-xs tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="px-6 py-4">Loan Reference</th>
                      <th className="px-6 py-4">Amount</th>
                      <th className="px-6 py-4">Tenure & Rate</th>
                      <th className="px-6 py-4">Purpose</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300 font-medium">
                    {loans.map((loan) => (
                      <tr key={loan.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-mono text-xs text-indigo-400 font-bold">
                            LFL-{loan.id.substring(0, 8).toUpperCase()}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Applied {new Date(loan.appliedAt).toLocaleDateString("en-IN")}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-white text-base">
                          ₹{loan.amount.toLocaleString("en-IN")}
                        </td>
                        <td className="px-6 py-4 text-slate-300">
                          {loan.tenureMonths} Months @ {loan.interestRate}%
                        </td>
                        <td className="px-6 py-4 text-slate-400 max-w-xs truncate">
                          {loan.purpose}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-extrabold border ${
                              loan.status === "DISBURSED"
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : loan.status === "PENDING"
                                ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                : loan.status === "CLOSED"
                                ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                                : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                            }`}
                          >
                            {loan.status === "DISBURSED" && <CheckCircle2 className="w-3.5 h-3.5" />}
                            {loan.status === "PENDING" && <Clock className="w-3.5 h-3.5" />}
                            {loan.status === "REJECTED" && <XCircle className="w-3.5 h-3.5" />}
                            <span>{loan.status}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            {["DISBURSED", "CLOSED"].includes(loan.status) && (
                              <>
                                <button
                                  onClick={() => setSelectedLoanIdForSchedule(loan.id)}
                                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95"
                                >
                                  <CreditCard className="w-3.5 h-3.5 text-white" />
                                  <span>Pay & View EMI Schedule</span>
                                </button>

                                <button
                                  onClick={() => user && generateSanctionLetter(loan, user)}
                                  className="p-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-xl transition-colors"
                                  title="Download Official Sanction Letter PDF"
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                              </>
                            )}

                            {loan.status === "PENDING" && (
                              <button
                                onClick={() => setSelectedLoanIdForSchedule(loan.id)}
                                className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl border border-slate-700 transition-all"
                              >
                                <Eye className="w-3.5 h-3.5 text-slate-400" />
                                <span>Inspect Status</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Modals */}
        <ApplyLoanModal
          isOpen={isApplyModalOpen}
          onClose={() => setIsApplyModalOpen(false)}
          onSuccess={fetchMyLoans}
        />

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
