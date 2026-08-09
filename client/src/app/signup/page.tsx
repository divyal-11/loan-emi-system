"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { ApiError } from "../../lib/api";
import { Landmark, ArrowRight, Lock, Mail, User, AlertCircle, Shield } from "lucide-react";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"borrower" | "admin">("borrower");

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { signup, login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setIsSubmitting(true);

    try {
      await signup(name, email, password, role);
      // Auto-login after successful registration
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
        setError("Failed to create account. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070c18] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans selection:bg-teal-500/30 selection:text-teal-200">
      
      {/* Ambient Cyber Teal Background Glow Accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-teal-500/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[300px] bg-cyan-500/10 blur-[140px] rounded-full pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10">
        <div className="inline-flex items-center justify-center p-3.5 bg-gradient-to-br from-emerald-400 via-teal-400 to-cyan-400 text-slate-950 rounded-3xl border border-teal-300/40 mb-4 shadow-2xl shadow-teal-950/80">
          <Landmark className="w-8 h-8 text-slate-950" />
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">
          Create your account
        </h2>
        <p className="mt-2 text-xs text-teal-400 font-mono tracking-widest uppercase font-semibold">
          Join LoanFlex Credit & EMI Platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-[#0b1324]/90 backdrop-blur-xl py-8 px-6 shadow-2xl rounded-3xl border border-slate-800/90 sm:px-10 shadow-teal-950/30">

          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-mono uppercase font-semibold text-slate-400 mb-1.5 tracking-wider">
                Full Name
              </label>
              <div className="relative rounded-2xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full pl-10 pr-4 py-2.5 bg-[#070c18] border border-slate-800 rounded-2xl text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm transition-all"
                  placeholder="Asha Rao"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase font-semibold text-slate-400 mb-1.5 tracking-wider">
                Email Address
              </label>
              <div className="relative rounded-2xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-4 py-2.5 bg-[#070c18] border border-slate-800 rounded-2xl text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm transition-all"
                  placeholder="asha@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase font-semibold text-slate-400 mb-1.5 tracking-wider">
                Password (min 8 chars)
              </label>
              <div className="relative rounded-2xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-4 py-2.5 bg-[#070c18] border border-slate-800 rounded-2xl text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase font-semibold text-slate-400 mb-1.5 tracking-wider">
                Account Role
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole("borrower")}
                  className={`flex items-center justify-center space-x-2 py-2.5 px-3 rounded-2xl border text-sm font-semibold transition-all ${
                    role === "borrower"
                      ? "bg-teal-500/15 text-teal-300 border-teal-500/40 shadow-md shadow-teal-950"
                      : "bg-[#070c18] text-slate-400 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span>Borrower</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRole("admin")}
                  className={`flex items-center justify-center space-x-2 py-2.5 px-3 rounded-2xl border text-sm font-semibold transition-all ${
                    role === "admin"
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-md shadow-amber-950"
                      : "bg-[#070c18] text-slate-400 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  <span>Admin</span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center items-center space-x-2 py-3.5 px-4 rounded-2xl text-sm font-extrabold text-slate-950 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 hover:opacity-95 disabled:opacity-50 transition-all shadow-xl shadow-teal-950/80 hover:scale-[1.01]"
            >
              <span>{isSubmitting ? "Creating account..." : "Create Account"}</span>
              {!isSubmitting && <ArrowRight className="w-4 h-4 text-slate-950" />}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-400">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-bold text-teal-400 hover:text-teal-300 transition-colors"
            >
              Sign in
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
