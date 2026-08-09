"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import {
  Landmark,
  Lock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ArrowLeft,
  QrCode,
  CreditCard,
  Building,
  Smartphone,
  IndianRupee,
  KeyRound,
  FileCheck,
} from "lucide-react";

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  const loanId = searchParams.get("loanId") || "";
  const repaymentId = searchParams.get("repaymentId") || "";
  const amount = Number(searchParams.get("amount") || "0");
  const emiNumber = searchParams.get("emiNumber") || "1";
  const principal = Number(searchParams.get("principal") || "0");
  const interest = Number(searchParams.get("interest") || "0");

  const [paymentMethod, setPaymentMethod] = useState<"upi" | "card" | "netbanking">("upi");
  const [upiId, setUpiId] = useState<string>("asha@okaxis");
  const [cardNumber, setCardNumber] = useState<string>("4532 •••• •••• 8892");
  const [expiry, setExpiry] = useState<string>("12/28");
  const [cvv, setCvv] = useState<string>("891");
  const [selectedBank, setSelectedBank] = useState<string>("HDFC Bank");

  // Step flow: SELECT -> OTP -> PROCESSING -> SUCCESS
  const [step, setStep] = useState<"SELECT" | "OTP" | "PROCESSING" | "SUCCESS">("SELECT");
  const [otp, setOtp] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleProceedToOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentMethod === "upi" && !upiId.includes("@")) {
      setError("Please enter a valid UPI VPA ID (e.g. name@upi).");
      return;
    }
    setError(null);
    setStep("OTP");
  };

  const handleFillDemoOtp = () => {
    setOtp("123456");
  };

  const handleVerifyOtpAndPay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 4) {
      setError("Please enter the 6-digit bank verification OTP.");
      return;
    }

    setError(null);
    setStep("PROCESSING");
    setIsSubmitting(true);

    try {
      // Simulate bank 3D-Secure 1.5s authorization delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      await api.patch(`/repayments/${repaymentId}/pay`);
      setStep("SUCCESS");

      // Redirect back to borrower dashboard after 2.5 seconds
      setTimeout(() => {
        router.push("/dashboard");
      }, 2500);
    } catch (err: unknown) {
      setStep("OTP");
      setIsSubmitting(false);
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to process payment authorization with bank.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 font-sans selection:bg-indigo-500/30 selection:text-indigo-200 relative overflow-hidden">
      
      {/* Background Accent */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-indigo-600/10 blur-[150px] pointer-events-none rounded-full" />

      <div className="max-w-4xl mx-auto space-y-6 relative z-10">
        
        {/* Top Gateway Header */}
        <div className="flex items-center justify-between bg-slate-900 px-6 py-4 rounded-3xl border border-slate-800 shadow-xl">
          <div className="flex items-center space-x-3">
            <Link
              href="/dashboard"
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="p-2.5 bg-indigo-600 text-white rounded-2xl border border-indigo-400/40 shadow-lg shadow-indigo-950">
              <Landmark className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-white tracking-tight">LoanFlex Secure Gateway</h1>
              <p className="text-xs text-indigo-400 font-mono font-bold">256-Bit SSL Encrypted Bank Checkout</p>
            </div>
          </div>
          
          <div className="hidden sm:flex items-center space-x-2 bg-emerald-500/10 text-emerald-300 px-3.5 py-1.5 rounded-full border border-emerald-500/20 text-xs font-bold font-mono">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>RBI Verified Gateway</span>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Column 1: Order Summary */}
          <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-5 h-fit shadow-xl">
            <div className="border-b border-slate-800 pb-3">
              <span className="text-xs uppercase font-mono text-indigo-400 font-bold tracking-wider">
                Order Summary
              </span>
              <h3 className="text-xl font-extrabold text-white mt-1">
                EMI Installment #{emiNumber}
              </h3>
            </div>

            <div className="space-y-3 text-xs font-medium">
              <div className="flex justify-between">
                <span className="text-slate-400">Borrower:</span>
                <span className="text-white font-bold">{user?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Loan ID:</span>
                <span className="text-indigo-400 font-mono font-bold">{loanId.substring(0, 10)}...</span>
              </div>
              {principal > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Principal Component:</span>
                  <span className="text-slate-200 font-mono">₹{principal.toLocaleString("en-IN")}</span>
                </div>
              )}
              {interest > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Interest Component:</span>
                  <span className="text-slate-200 font-mono">₹{interest.toLocaleString("en-IN")}</span>
                </div>
              )}
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-xs uppercase font-mono text-slate-400 font-bold">Total Payable</span>
              <div className="text-2xl font-extrabold font-mono text-white">
                ₹{amount.toLocaleString("en-IN")}
              </div>
            </div>

            <div className="flex items-center space-x-2 text-[11px] text-slate-400 pt-2">
              <Lock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span>Payments are processed directly via secure banking protocol.</span>
            </div>
          </div>

          {/* Column 2 & 3: Checkout Form / OTP / Success */}
          <div className="md:col-span-2 bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-xl space-y-6">
            
            {error && (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* STEP 1: SELECT PAYMENT METHOD */}
            {step === "SELECT" && (
              <form onSubmit={handleProceedToOtp} className="space-y-6">
                
                <div>
                  <h3 className="text-lg font-extrabold text-white">Select Payment Mode</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Choose your preferred Indian payment option</p>
                </div>

                {/* Tabs */}
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("upi")}
                    className={`p-3.5 rounded-2xl border text-xs font-bold flex flex-col items-center space-y-1.5 transition-all ${
                      paymentMethod === "upi"
                        ? "bg-indigo-600/20 text-indigo-300 border-indigo-500/50 shadow-md"
                        : "bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <Smartphone className="w-5 h-5" />
                    <span>UPI / QR</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("card")}
                    className={`p-3.5 rounded-2xl border text-xs font-bold flex flex-col items-center space-y-1.5 transition-all ${
                      paymentMethod === "card"
                        ? "bg-indigo-600/20 text-indigo-300 border-indigo-500/50 shadow-md"
                        : "bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <CreditCard className="w-5 h-5" />
                    <span>Debit Card</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("netbanking")}
                    className={`p-3.5 rounded-2xl border text-xs font-bold flex flex-col items-center space-y-1.5 transition-all ${
                      paymentMethod === "netbanking"
                        ? "bg-indigo-600/20 text-indigo-300 border-indigo-500/50 shadow-md"
                        : "bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <Building className="w-5 h-5" />
                    <span>NetBanking</span>
                  </button>
                </div>

                {/* UPI Fields */}
                {paymentMethod === "upi" && (
                  <div className="space-y-4 p-5 rounded-2xl bg-slate-950 border border-slate-800">
                    <div className="flex items-center space-x-3">
                      <QrCode className="w-10 h-10 text-indigo-400 p-2 bg-indigo-600/10 rounded-xl border border-indigo-500/20" />
                      <div>
                        <h4 className="text-sm font-bold text-white">Google Pay / PhonePe / Paytm</h4>
                        <p className="text-xs text-slate-400">Instant UPI VPA transaction</p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-mono uppercase text-slate-300 font-bold mb-1.5">
                        UPI VPA ID
                      </label>
                      <input
                        type="text"
                        required
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm font-mono text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="username@upi"
                      />
                    </div>
                  </div>
                )}

                {/* Card Fields */}
                {paymentMethod === "card" && (
                  <div className="space-y-4 p-5 rounded-2xl bg-slate-950 border border-slate-800">
                    <div>
                      <label className="block text-xs font-mono uppercase text-slate-300 font-bold mb-1.5">
                        Card Number
                      </label>
                      <input
                        type="text"
                        required
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm font-mono text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-mono uppercase text-slate-300 font-bold mb-1.5">
                          Expiry MM/YY
                        </label>
                        <input
                          type="text"
                          required
                          value={expiry}
                          onChange={(e) => setExpiry(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm font-mono text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-mono uppercase text-slate-300 font-bold mb-1.5">
                          CVV Code
                        </label>
                        <input
                          type="password"
                          maxLength={3}
                          required
                          value={cvv}
                          onChange={(e) => setCvv(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm font-mono text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Netbanking Fields */}
                {paymentMethod === "netbanking" && (
                  <div className="space-y-4 p-5 rounded-2xl bg-slate-950 border border-slate-800">
                    <label className="block text-xs font-mono uppercase text-slate-300 font-bold mb-1.5">
                      Select Your Bank
                    </label>
                    <select
                      value={selectedBank}
                      onChange={(e) => setSelectedBank(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="HDFC Bank">HDFC Bank</option>
                      <option value="Axis Bank">Axis Bank</option>
                      <option value="State Bank of India">State Bank of India (SBI)</option>
                      <option value="ICICI Bank">ICICI Bank</option>
                      <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
                    </select>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-4 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-sm shadow-xl shadow-indigo-950 transition-all hover:scale-[1.01] flex items-center justify-center space-x-2"
                >
                  <IndianRupee className="w-4 h-4 text-white" />
                  <span>Proceed to Pay ₹{amount.toLocaleString("en-IN")}</span>
                </button>

              </form>
            )}

            {/* STEP 2: 3D-SECURE BANK OTP VERIFICATION */}
            {step === "OTP" && (
              <form onSubmit={handleVerifyOtpAndPay} className="space-y-6 animate-fade-in">
                <div className="flex justify-between items-start border-b border-slate-800 pb-4">
                  <div>
                    <span className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-wider">
                      Bank 3D-Secure Authentication
                    </span>
                    <h3 className="text-xl font-extrabold text-white mt-1">
                      Enter Verification OTP
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      A 6-digit OTP has been sent to your registered mobile ending in <strong className="text-white font-mono">••92</strong>
                    </p>
                  </div>
                  <div className="p-2.5 bg-indigo-600/20 text-indigo-400 rounded-2xl border border-indigo-500/30">
                    <KeyRound className="w-6 h-6" />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-mono uppercase font-bold text-slate-300">
                      6-Digit Security Code
                    </label>
                    <button
                      type="button"
                      onClick={handleFillDemoOtp}
                      className="text-xs font-bold text-indigo-400 hover:text-indigo-300 underline font-mono"
                    >
                      Fill Demo OTP (123456)
                    </button>
                  </div>

                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full px-4 py-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-2xl font-mono tracking-widest text-center text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="123456"
                  />
                </div>

                <div className="flex space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep("SELECT")}
                    className="px-5 py-3 rounded-2xl border border-slate-800 text-slate-300 hover:bg-slate-800 text-xs font-semibold"
                  >
                    Change Method
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm shadow-xl shadow-emerald-950 transition-all hover:scale-[1.01] flex items-center justify-center space-x-2"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Authorize & Complete Payment</span>
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: BANK HANDSHAKE PROCESSING */}
            {step === "PROCESSING" && (
              <div className="py-16 flex flex-col items-center justify-center text-center space-y-4">
                <Loader2 className="w-14 h-14 animate-spin text-indigo-500" />
                <div>
                  <h3 className="text-xl font-extrabold text-white">Connecting to Bank Gateway...</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Authorizing ₹{amount.toLocaleString("en-IN")} payment for EMI #{emiNumber}. Please do not refresh.
                  </p>
                </div>
              </div>
            )}

            {/* STEP 4: SUCCESS & REDIRECT */}
            {step === "SUCCESS" && (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 animate-fade-in">
                <div className="p-4 bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/40">
                  <CheckCircle2 className="w-16 h-16 animate-bounce" />
                </div>
                <div>
                  <h3 className="text-2xl font-extrabold text-white">Payment Authorized!</h3>
                  <p className="text-sm text-emerald-300 font-semibold mt-1">
                    EMI Installment #{emiNumber} of ₹{amount.toLocaleString("en-IN")} is marked as PAID.
                  </p>
                  <p className="text-xs text-slate-400 mt-2 font-mono">
                    Redirecting back to dashboard...
                  </p>
                </div>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <ProtectedRoute allowedRoles={["borrower"]}>
      <Suspense fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 font-sans">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
        </div>
      }>
        <CheckoutContent />
      </Suspense>
    </ProtectedRoute>
  );
}
