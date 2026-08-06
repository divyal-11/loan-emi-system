"use client";

import React, { useState, useEffect, useCallback } from "react";
import { api, ApiError } from "../../lib/api";
import { X, Calendar, CheckCircle2, Clock, AlertTriangle, Loader2, IndianRupee } from "lucide-react";

export interface RepaymentItem {
  id: string;
  loanId: string;
  emiNumber: number;
  dueDate: string;
  principalComponent: number;
  interestComponent: number;
  totalAmount: number;
  status: "UPCOMING" | "PAID" | "OVERDUE";
  paidAt: string | null;
}

interface RepaymentScheduleModalProps {
  loanId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onLoanUpdated: () => void;
}

export function RepaymentScheduleModal({
  loanId,
  isOpen,
  onClose,
  onLoanUpdated,
}: RepaymentScheduleModalProps) {
  const [repayments, setRepayments] = useState<RepaymentItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchSchedule = useCallback(async () => {
    if (!loanId) return;
    setIsLoading(true);
    setError(null);

    try {
      const data = await api.get<RepaymentItem[]>(`/repayments/${loanId}`);
      setRepayments(data);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to load repayment schedule.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [loanId]);

  useEffect(() => {
    if (isOpen && loanId) {
      fetchSchedule();
    }
  }, [isOpen, loanId, fetchSchedule]);

  if (!isOpen || !loanId) return null;

  const handlePay = async (repaymentId: string) => {
    setPayingId(repaymentId);
    setError(null);

    try {
      await api.patch(`/repayments/${repaymentId}/pay`);
      await fetchSchedule();
      onLoanUpdated();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to process EMI payment.");
      }
    } finally {
      setPayingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-white">EMI Repayment Schedule</h3>
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
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
              <p className="text-sm font-medium">Loading schedule...</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-900 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800 font-mono">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Due Date</th>
                    <th className="px-4 py-3">Principal</th>
                    <th className="px-4 py-3">Interest</th>
                    <th className="px-4 py-3">Total Amount</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {repayments.map((rep) => {
                    const isPaid = rep.status === "PAID";
                    const isOverdue = rep.status === "OVERDUE";
                    const isPayingThis = payingId === rep.id;

                    return (
                      <tr key={rep.id} className="hover:bg-slate-900/50 transition-colors">
                        <td className="px-4 py-3 font-mono font-medium text-slate-200">
                          {rep.emiNumber}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-400">
                          {new Date(rep.dueDate).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-200">
                          ₹{rep.principalComponent.toLocaleString("en-IN")}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-400">
                          ₹{rep.interestComponent.toLocaleString("en-IN")}
                        </td>
                        <td className="px-4 py-3 font-mono font-semibold text-white">
                          ₹{rep.totalAmount.toLocaleString("en-IN")}
                        </td>
                        <td className="px-4 py-3">
                          {isPaid && (
                            <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Paid</span>
                            </span>
                          )}

                          {isOverdue && (
                            <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/20 animate-pulse">
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                              <span>Overdue</span>
                            </span>
                          )}

                          {rep.status === "UPCOMING" && (
                            <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <span>Upcoming</span>
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {!isPaid ? (
                            <button
                              onClick={() => handlePay(rep.id)}
                              disabled={isPayingThis}
                              className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-medium text-xs shadow-md shadow-emerald-950 transition-all disabled:opacity-50"
                            >
                              {isPayingThis ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <IndianRupee className="w-3.5 h-3.5" />
                              )}
                              <span>{isPayingThis ? "Paying..." : "Pay EMI"}</span>
                            </button>
                          ) : (
                            <span className="text-xs text-slate-500 font-mono">
                              Paid {new Date(rep.paidAt!).toLocaleDateString("en-IN")}
                            </span>
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
    </div>
  );
}
