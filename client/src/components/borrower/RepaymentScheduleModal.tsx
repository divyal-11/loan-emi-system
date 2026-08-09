"use client";

import React, { useState, useEffect, useCallback } from "react";
import { api, ApiError } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { generatePaymentReceipt } from "../../lib/pdfGenerator";
import { X, Calendar, CheckCircle2, Clock, AlertTriangle, Loader2, IndianRupee, Download } from "lucide-react";

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
  const { user } = useAuth();
  const [repayments, setRepayments] = useState<RepaymentItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Payment Checkout Gateway Simulator State
  const [selectedRepaymentForPayment, setSelectedRepaymentForPayment] = useState<RepaymentItem | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"upi" | "card" | "netbanking">("upi");
  const [upiId, setUpiId] = useState<string>("user@okaxis");
  const [isProcessingGateway, setIsProcessingGateway] = useState<boolean>(false);
  const [gatewayStep, setGatewayStep] = useState<"SELECT" | "PROCESSING" | "SUCCESS">("SELECT");

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

  // Open Checkout Sheet
  const openCheckoutSheet = (repayment: RepaymentItem) => {
    setSelectedRepaymentForPayment(repayment);
    setGatewayStep("SELECT");
    setError(null);
  };

  // Process Final Payment
  const executePaymentGateway = async () => {
    if (!selectedRepaymentForPayment) return;
    setIsProcessingGateway(true);
    setGatewayStep("PROCESSING");

    try {
      // Simulate realistic 1.5s bank gateway network handshake delay
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      await api.patch(`/repayments/${selectedRepaymentForPayment.id}/pay`);
      await fetchSchedule();
      onLoanUpdated();
      setGatewayStep("SUCCESS");
      setTimeout(() => {
        setSelectedRepaymentForPayment(null);
        setIsProcessingGateway(false);
      }, 1200);
    } catch (err: unknown) {
      setGatewayStep("SELECT");
      setIsProcessingGateway(false);
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to process EMI payment with gateway.");
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in font-sans">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-600/20 text-indigo-400 rounded-2xl border border-indigo-500/30">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-xl text-white">EMI Repayment Schedule</h3>
              <p className="text-xs text-indigo-400 font-mono font-medium">Loan Reference: {loanId.substring(0, 14)}...</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          
          {error && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
              <p className="text-sm font-medium">Loading schedule...</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950">
              <table className="w-full text-left text-sm text-slate-200">
                <thead className="bg-slate-900 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800 font-mono">
                  <tr>
                    <th className="px-5 py-4">#</th>
                    <th className="px-5 py-4">Due Date</th>
                    <th className="px-5 py-4">Principal</th>
                    <th className="px-5 py-4">Interest</th>
                    <th className="px-5 py-4">Total EMI</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {repayments.map((rep) => {
                    const isPaid = rep.status === "PAID";
                    const isOverdue = rep.status === "OVERDUE";

                    return (
                      <tr key={rep.id} className="hover:bg-slate-900/60 transition-colors">
                        <td className="px-5 py-4 font-mono font-bold text-white text-base">
                          {rep.emiNumber}
                        </td>
                        <td className="px-5 py-4 font-mono text-xs text-slate-300">
                          {new Date(rep.dueDate).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-5 py-4 font-mono text-slate-200">
                          ₹{rep.principalComponent.toLocaleString("en-IN")}
                        </td>
                        <td className="px-5 py-4 font-mono text-slate-400">
                          ₹{rep.interestComponent.toLocaleString("en-IN")}
                        </td>
                        <td className="px-5 py-4 font-mono font-extrabold text-white text-base">
                          ₹{rep.totalAmount.toLocaleString("en-IN")}
                        </td>
                        <td className="px-5 py-4">
                          {isPaid && (
                            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              <span>PAID</span>
                            </span>
                          )}

                          {isOverdue && (
                            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                              <span>OVERDUE</span>
                            </span>
                          )}

                          {rep.status === "UPCOMING" && (
                            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                              <Clock className="w-3.5 h-3.5 text-amber-400" />
                              <span>UPCOMING</span>
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right">
                          {!isPaid ? (
                            <button
                              onClick={() => openCheckoutSheet(rep)}
                              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold text-xs shadow-lg shadow-indigo-950 transition-all hover:scale-[1.02]"
                            >
                              <IndianRupee className="w-3.5 h-3.5" />
                              <span>Pay EMI</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => user && generatePaymentReceipt(rep, 0, user)}
                              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors"
                              title="Download PDF Receipt"
                            >
                              <Download className="w-3.5 h-3.5 text-indigo-400" />
                              <span>Receipt</span>
                            </button>
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

      {/* Payment Gateway Checkout Modal Overlay */}
      {selectedRepaymentForPayment && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in font-sans">
          <div className="bg-slate-900 border border-indigo-500/40 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden text-slate-100 p-6 space-y-6">
            
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-mono font-bold uppercase text-indigo-400 tracking-wider">
                  Payment Gateway
                </span>
                <h4 className="text-xl font-extrabold text-white mt-0.5">
                  EMI Installment #{selectedRepaymentForPayment.emiNumber}
                </h4>
              </div>
              <button
                disabled={isProcessingGateway}
                onClick={() => setSelectedRepaymentForPayment(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {gatewayStep === "PROCESSING" ? (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                <Loader2 className="w-12 h-12 animate-spin text-indigo-500" />
                <div>
                  <h5 className="font-bold text-white text-lg">Connecting to Bank Gateway...</h5>
                  <p className="text-xs text-slate-400 mt-1">Authorizing ₹{selectedRepaymentForPayment.totalAmount.toLocaleString("en-IN")} via {paymentMethod.toUpperCase()}</p>
                </div>
              </div>
            ) : gatewayStep === "SUCCESS" ? (
              <div className="py-10 flex flex-col items-center justify-center text-center space-y-3">
                <CheckCircle2 className="w-14 h-14 text-emerald-400 animate-bounce" />
                <h5 className="font-extrabold text-white text-xl">Payment Successful!</h5>
                <p className="text-xs text-slate-300">EMI #{selectedRepaymentForPayment.emiNumber} is marked as PAID.</p>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-400">Total Payable Amount</span>
                  <span className="text-2xl font-extrabold font-mono text-white">
                    ₹{selectedRepaymentForPayment.totalAmount.toLocaleString("en-IN")}
                  </span>
                </div>

                {/* Payment Methods */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase font-mono text-slate-400">
                    Select Payment Method
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("upi")}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                        paymentMethod === "upi"
                          ? "bg-indigo-600/20 text-indigo-300 border-indigo-500/50 shadow-md"
                          : "bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      UPI / QR
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("card")}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                        paymentMethod === "card"
                          ? "bg-indigo-600/20 text-indigo-300 border-indigo-500/50 shadow-md"
                          : "bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      Debit Card
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("netbanking")}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                        paymentMethod === "netbanking"
                          ? "bg-indigo-600/20 text-indigo-300 border-indigo-500/50 shadow-md"
                          : "bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      NetBanking
                    </button>
                  </div>
                </div>

                {paymentMethod === "upi" && (
                  <div>
                    <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                      UPI VPA ID
                    </label>
                    <input
                      type="text"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="username@upi"
                    />
                  </div>
                )}

                <button
                  type="button"
                  onClick={executePaymentGateway}
                  className="w-full py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-sm shadow-xl shadow-indigo-950 transition-all hover:scale-[1.01]"
                >
                  Pay ₹{selectedRepaymentForPayment.totalAmount.toLocaleString("en-IN")} Securely
                </button>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
