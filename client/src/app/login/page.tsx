"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { ApiError } from "../../lib/api";
import { Landmark, ArrowRight, Lock, Mail, AlertCircle, Sparkles, UserCheck, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const user = await login(email, password);
      if (user.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Invalid email or password. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillDemoBorrower = () => {
    setEmail("asha@example.com");
    setPassword("password123");
    setError(null);
  };

  const fillDemoAdmin = () => {
    setEmail("admin@example.com");
    setPassword("adminpass123");
    setError(null);
  };

  return (
    <div className="min-h-screen bg-black flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans selection:bg-red-500/30 selection:text-red-200">
      
      {/* Background Red Glow Accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-red-600/10 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[300px] bg-red-950/20 blur-[120px] rounded-full pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10">
        <div className="inline-flex items-center justify-center p-3.5 bg-red-600/20 text-red-500 rounded-2xl border border-red-500/30 mb-4 shadow-2xl shadow-red-950">
          <Landmark className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">
          Welcome back to LoanFlex
        </h2>
        <p className="mt-2 text-sm text-zinc-400 font-mono tracking-wide uppercase">
          Automated EMI Engine & Transparent Credit System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-zinc-900/90 backdrop-blur-xl py-8 px-6 shadow-2xl rounded-2xl border border-zinc-800/90 sm:px-10 shadow-red-950/30">

          {/* Quick Demo Fill Presets */}
          <div className="mb-6 bg-zinc-950/80 p-3.5 rounded-xl border border-zinc-800">
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-red-400 uppercase tracking-wider mb-2 font-mono">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Quick Demo Accounts</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={fillDemoBorrower}
                className="flex items-center justify-center space-x-1.5 text-xs py-2.5 px-3 rounded-xl bg-red-600/10 hover:bg-red-600/20 text-red-300 border border-red-500/30 transition-all text-left shadow-sm"
              >
                <UserCheck className="w-3.5 h-3.5 text-red-400" />
                <span className="font-semibold">Borrower (Asha)</span>
              </button>

              <button
                type="button"
                onClick={fillDemoAdmin}
                className="flex items-center justify-center space-x-1.5 text-xs py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-all text-left shadow-sm"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
                <span className="font-semibold">Admin User</span>
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-mono uppercase text-zinc-400 mb-1.5 tracking-wider">
                Email Address
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm transition-all"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-zinc-400 mb-1.5 tracking-wider">
                Password
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center items-center space-x-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-500 active:bg-red-700 disabled:opacity-50 transition-all shadow-xl shadow-red-950 hover:scale-[1.01]"
            >
              <span>{isSubmitting ? "Signing in..." : "Sign in to Dashboard"}</span>
              {!isSubmitting && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-zinc-400">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="font-bold text-red-400 hover:text-red-300 transition-colors"
            >
              Create borrower account
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
