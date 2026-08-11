"use client";

import React, { useState, useEffect } from "react";
import { api, ApiError } from "../../lib/api";
import {
  X,
  User,
  Mail,
  Calendar,
  IndianRupee,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  FileText,
  ShieldCheck,
} from "lucide-react";

export interface AdminLoanItem {
  id: string;
  applicantId: string;
  applicant?: {
    id: string;
    name: string;
    email: string;
  } | null;
  amount: number;
  tenureMonths: number;
  interestRate: number;
  purpose: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "DISBURSED" | "CLOSED";
  rejectionReason?: string | null;
  appliedAt: string;
  decidedAt?: string | null;
}

export interface AdminRepaymentItem {
  id: string;
  loanId: string;
  emiNumber: number;
  dueDate: string;
  principalComponent: number;
  interestComponent: number;
  totalAmount: number;
  status: "UPCOMING" | "PAID" | "OVERDUE";
  paidAt?: string | null;
}

interface AdminLoanDetailModalProps {
  loan: AdminLoanItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AdminLoanDetailModal({
  loan,
  isOpen,
  onClose,
}: AdminLoanDetailModalProps) {
  const [repayments, setRepayments] = useState<AdminRepaymentItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !loan) return;

    const fetchRepayments = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await api.get<AdminRepaymentItem[]>(`/repayments/${loan.id}`);
        setRepayments(data);
      } catch (err: unknown) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError("Repayment schedule not generated yet or unavailable.");
        }
        setRepayments([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRepayments();
  }, [isOpen, loan]);

  if (!isOpen || !loan) return null;

  const totalPaid = repayments
    .filter((r) => r.status === "PAID")
    .reduce((sum, r) => sum + r.totalAmount, 0);

  const totalExpected = repayments.reduce((sum, r) => sum + r.totalAmount, 0);
  const paidPercentage = totalExpected > 0 ? Math.round((totalPaid / totalExpected) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Loan Inspector & Borrower Profile
              </h3>
              <p className="text-xs text-slate-400">
                Loan ID: <span className="font-mono text-indigo-400">{loan.id}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {/* User Details & Status Bar */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Borrower Profile Card */}
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                <User className="w-4 h-4" />
                Borrower Profile
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Full Name:</span>
                  <span className="font-bold text-slate-100">{loan.applicant?.name || "Registered Borrower"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Email Address:</span>
                  <span className="font-medium text-slate-300 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    {loan.applicant?.email || "N/A"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Applicant ID:</span>
                  <span className="font-mono text-xs text-slate-400">{loan.applicantId}</span>
                </div>
              </div>
            </div>

            {/* Loan Terms Summary */}
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4" />
                Loan Terms Summary
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <div className="text-xs text-slate-400">Sanctioned Amount</div>
                  <div className="font-bold text-slate-100 text-base">₹{loan.amount.toLocaleString("en-IN")}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Tenure & Rate</div>
                  <div className="font-medium text-slate-200">{loan.tenureMonths} Mo @ {loan.interestRate}%</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Applied Date</div>
                  <div className="text-xs text-slate-300">{new Date(loan.appliedAt).toLocaleDateString("en-IN")}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Status</div>
                  <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full border ${
                    loan.status === "DISBURSED" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                    loan.status === "CLOSED" ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" :
                    loan.status === "REJECTED" ? "bg-rose-500/10 text-rose-400 border-rose-500/20" :
                    "bg-amber-500/10 text-amber-400 border-amber-500/20"
                  }`}>
                    {loan.status}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Repayment Progress Bar */}
          {repayments.length > 0 && (
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-slate-400">Portfolio Collection Progress</span>
                <span className="text-indigo-400 font-bold">
                  ₹{totalPaid.toLocaleString("en-IN")} / ₹{totalExpected.toLocaleString("en-IN")} ({paidPercentage}% Paid)
                </span>
              </div>
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${paidPercentage}%` }}
                />
              </div>
            </div>
          )}

          {/* EMI Repayment Schedule Table */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-300 flex items-center justify-between">
              <span>Repayment Schedule Ledger</span>
              <span className="text-xs font-normal text-slate-400">
                {repayments.length} Installments
              </span>
            </h4>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400 space-y-2">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                <p className="text-sm">Fetching EMI schedule ledger...</p>
              </div>
            ) : error ? (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            ) : repayments.length === 0 ? (
              <div className="p-8 text-center bg-slate-950/50 rounded-xl border border-slate-800 text-slate-400 text-sm">
                No repayment schedule generated for this application yet.
              </div>
            ) : (
              <div className="border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3">EMI #</th>
                      <th className="px-4 py-3">Due Date</th>
                      <th className="px-4 py-3">Principal</th>
                      <th className="px-4 py-3">Interest</th>
                      <th className="px-4 py-3">Total EMI</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Paid Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 text-slate-300 font-mono">
                    {repayments.map((rep) => (
                      <tr key={rep.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3 font-semibold text-slate-100">#{rep.emiNumber}</td>
                        <td className="px-4 py-3">{new Date(rep.dueDate).toLocaleDateString("en-IN")}</td>
                        <td className="px-4 py-3">₹{rep.principalComponent.toLocaleString("en-IN")}</td>
                        <td className="px-4 py-3">₹{rep.interestComponent.toLocaleString("en-IN")}</td>
                        <td className="px-4 py-3 font-bold text-slate-100">₹{rep.totalAmount.toLocaleString("en-IN")}</td>
                        <td className="px-4 py-3 font-sans">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            rep.status === "PAID" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                            rep.status === "OVERDUE" ? "bg-rose-500/10 text-rose-400 border-rose-500/20" :
                            "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          }`}>
                            {rep.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[11px] text-slate-400">
                          {rep.paidAt ? new Date(rep.paidAt).toLocaleString("en-IN") : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-colors"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
}
