"use client";

import React, { useState } from "react";
import { api, ApiError } from "../../lib/api";
import { X, Calculator, IndianRupee, Calendar, FileText, AlertCircle, CheckCircle } from "lucide-react";

interface ApplyLoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ApplyLoanModal({ isOpen, onClose, onSuccess }: ApplyLoanModalProps) {
  const [amount, setAmount] = useState<number>(50000);
  const [tenureMonths, setTenureMonths] = useState<number>(12);
  const [purpose, setPurpose] = useState<string>("Home renovation");

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  // Real-time EMI estimation (12% annual rate = 1% monthly)
  const rateAnnual = 12.0;
  const r = rateAnnual / 12 / 100;
  const n = tenureMonths;
  
  const estimatedEmi =
    amount > 0 && n > 0
      ? Math.round((amount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1))
      : 0;

  const totalPayment = estimatedEmi * n;
  const totalInterest = Math.max(0, totalPayment - amount);

  const principalPercentage = totalPayment > 0 ? Math.round((amount / totalPayment) * 100) : 100;
  const interestPercentage = 100 - principalPercentage;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (amount < 1000 || amount > 500000) {
      setError("Amount must be between ₹1,000 and ₹5,00,000.");
      return;
    }

    if (tenureMonths < 3 || tenureMonths > 60) {
      setError("Tenure must be between 3 and 60 months.");
      return;
    }

    if (!purpose.trim()) {
      setError("Please describe the purpose of the loan.");
      return;
    }

    setIsSubmitting(true);

    try {
      await api.post("/loans/apply", {
        amount,
        tenureMonths,
        purpose: purpose.trim(),
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to submit loan application. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in font-sans">
      <div className="bg-slate-900 border border-purple-500/30 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden text-slate-100 shadow-purple-950/50">
        
        {/* Groww Purple Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-gradient-to-r from-purple-950/60 via-slate-900 to-slate-950">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-purple-500/20 text-purple-400 rounded-2xl border border-purple-500/30 shadow-md shadow-purple-950/50">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-xl text-white tracking-tight">EMI Loan Calculator</h3>
              <p className="text-xs text-purple-300 font-mono">12.0% p.a. Fixed Interest Rate</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {error && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Groww Purple Slider 1: Loan Amount */}
          <div className="space-y-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/90 hover:border-purple-500/30 transition-all">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Loan Amount
              </label>
              <div className="flex items-center space-x-1 px-3.5 py-1.5 bg-purple-500/15 border border-purple-500/30 rounded-xl shadow-sm">
                <IndianRupee className="w-4 h-4 text-purple-400" />
                <span className="font-bold font-mono text-purple-300 text-lg">
                  {amount.toLocaleString("en-IN")}
                </span>
              </div>
            </div>
            <input
              type="range"
              min={10000}
              max={500000}
              step={5000}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
            <div className="flex justify-between text-[11px] font-mono text-slate-500">
              <span>₹10,000</span>
              <span>₹2,50,000</span>
              <span>₹5,00,000</span>
            </div>
          </div>

          {/* Groww Purple Slider 2: Tenure Months */}
          <div className="space-y-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/90 hover:border-purple-500/30 transition-all">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Tenure (Months)
              </label>
              <div className="flex items-center space-x-1 px-3.5 py-1.5 bg-purple-500/15 border border-purple-500/30 rounded-xl shadow-sm">
                <Calendar className="w-4 h-4 text-purple-400" />
                <span className="font-bold font-mono text-purple-300 text-lg">
                  {tenureMonths} Months
                </span>
              </div>
            </div>
            <input
              type="range"
              min={3}
              max={60}
              step={3}
              value={tenureMonths}
              onChange={(e) => setTenureMonths(Number(e.target.value))}
              className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
            <div className="flex justify-between text-[11px] font-mono text-slate-500">
              <span>3 Mo</span>
              <span>12 Mo (1 Yr)</span>
              <span>36 Mo (3 Yrs)</span>
              <span>60 Mo (5 Yrs)</span>
            </div>
          </div>

          {/* Purpose Input */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Loan Purpose
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 pt-3 pointer-events-none text-slate-500">
                <FileText className="w-4 h-4" />
              </div>
              <textarea
                rows={2}
                maxLength={200}
                required
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="block w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                placeholder="e.g. Home renovation, business expansion..."
              />
            </div>
          </div>

          {/* Groww Purple Breakdown Box & Visual Progress Bar */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-950/60 via-slate-900 to-slate-950 border border-purple-500/30 space-y-4 shadow-xl">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-xs uppercase tracking-wider text-purple-400 font-bold block font-mono">
                  Monthly Payment (EMI)
                </span>
                <span className="text-xs text-slate-400">
                  Principal + Interest @ 12% p.a.
                </span>
              </div>
              <div className="text-right">
                <span className="text-3xl font-extrabold font-mono text-purple-300">
                  ₹{estimatedEmi.toLocaleString("en-IN")}
                </span>
                <span className="text-xs text-slate-400 block font-mono">/ month</span>
              </div>
            </div>

            {/* Principal vs Interest Breakdown Stats */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/80 text-xs">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-purple-500" />
                <span className="text-slate-400">Principal:</span>
                <span className="font-bold font-mono text-white">₹{amount.toLocaleString("en-IN")} ({principalPercentage}%)</span>
              </div>
              <div className="flex items-center space-x-2 justify-end">
                <div className="w-3 h-3 rounded-full bg-emerald-400" />
                <span className="text-slate-400">Total Interest:</span>
                <span className="font-bold font-mono text-emerald-300">₹{totalInterest.toLocaleString("en-IN")} ({interestPercentage}%)</span>
              </div>
            </div>

            {/* Groww Purple & Emerald Progress Bar */}
            <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden flex shadow-inner">
              <div
                style={{ width: `${principalPercentage}%` }}
                className="bg-gradient-to-r from-purple-600 to-indigo-500 h-full transition-all duration-300"
                title={`Principal: ${principalPercentage}%`}
              />
              <div
                style={{ width: `${interestPercentage}%` }}
                className="bg-emerald-400 h-full transition-all duration-300"
                title={`Interest: ${interestPercentage}%`}
              />
            </div>
          </div>

          {/* Submit Action */}
          <div className="flex justify-end space-x-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl border border-slate-800 text-slate-300 hover:bg-slate-800 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-purple-950 transition-all disabled:opacity-50 flex items-center space-x-2 hover:scale-[1.02]"
            >
              <CheckCircle className="w-4 h-4 text-white" />
              <span>{isSubmitting ? "Submitting..." : "Apply Now"}</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
