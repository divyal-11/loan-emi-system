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
  const r = (12 / 12) / 100;
  const n = tenureMonths;
  const estimatedEmi =
    amount > 0 && n > 0
      ? Math.round((amount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1))
      : 0;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-white">Apply for a New Loan</h3>
              <p className="text-xs text-slate-400">Fixed 12% p.a. interest rate</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Amount Input */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Loan Amount (₹1,000 – ₹5,00,000)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <IndianRupee className="w-4 h-4" />
              </div>
              <input
                type="number"
                min={1000}
                max={500000}
                step={1000}
                required
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="block w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-mono"
              />
            </div>
          </div>

          {/* Tenure Input */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Tenure (3 – 60 Months)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Calendar className="w-4 h-4" />
              </div>
              <select
                value={tenureMonths}
                onChange={(e) => setTenureMonths(Number(e.target.value))}
                className="block w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-mono"
              >
                {[3, 6, 12, 18, 24, 36, 48, 60].map((m) => (
                  <option key={m} value={m}>
                    {m} Months ({m / 12 >= 1 ? `${m / 12} Yr` : `${m} Mo`})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Purpose Input */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
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
                className="block w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                placeholder="e.g. Home renovation, Laptop purchase..."
              />
            </div>
          </div>

          {/* Real-time Calculator Box */}
          <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/20 text-indigo-200 flex justify-between items-center">
            <div>
              <span className="text-xs uppercase tracking-wider text-indigo-400 font-semibold block">
                Estimated Monthly EMI
              </span>
              <span className="text-xs text-indigo-300/80">
                @ 12% p.a. fixed interest rate
              </span>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold font-mono text-indigo-300">
                ₹{estimatedEmi.toLocaleString()}
              </span>
              <span className="text-xs text-indigo-400 block">/ month</span>
            </div>
          </div>

          {/* Submit Action */}
          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-800 text-slate-300 hover:bg-slate-800 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 flex items-center space-x-2"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{isSubmitting ? "Submitting..." : "Submit Application"}</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
