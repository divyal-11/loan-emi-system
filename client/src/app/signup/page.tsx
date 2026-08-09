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
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-indigo-600/15 blur-[140px] rounded-full pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10">
        <div className="inline-flex items-center justify-center p-3.5 bg-indigo-600 text-white rounded-3xl border border-indigo-400/40 mb-4 shadow-2xl shadow-indigo-950">
          <Landmark className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">
          Create your account
        </h2>
        <p className="mt-2 text-xs text-indigo-400 font-mono tracking-widest uppercase font-bold">
          Join LoanFlex Credit & EMI Platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-slate-900 backdrop-blur-xl py-8 px-6 shadow-2xl rounded-3xl border border-slate-800 sm:px-10">

          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-mono uppercase font-bold text-slate-300 mb-1.5 tracking-wider">
                Full Name
              </label>
              <div className="relative rounded-2xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition-all font-medium"
                  placeholder="Asha Rao"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase font-bold text-slate-300 mb-1.5 tracking-wider">
                Email Address
              </label>
              <div className="relative rounded-2xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition-all font-medium"
                  placeholder="asha@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase font-bold text-slate-300 mb-1.5 tracking-wider">
                Password (min 8 chars)
              </label>
              <div className="relative rounded-2xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition-all font-medium"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase font-bold text-slate-300 mb-1.5 tracking-wider">
                Account Role
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole("borrower")}
                  className={`flex items-center justify-center space-x-2 py-2.5 px-3 rounded-2xl border text-sm font-bold transition-all ${
                    role === "borrower"
                      ? "bg-indigo-600/20 text-indigo-300 border-indigo-500/50 shadow-md"
                      : "bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span>Borrower</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRole("admin")}
                  className={`flex items-center justify-center space-x-2 py-2.5 px-3 rounded-2xl border text-sm font-bold transition-all ${
                    role === "admin"
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-md"
                      : "bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700"
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
              className="w-full flex justify-center items-center space-x-2 py-3.5 px-4 rounded-2xl text-sm font-extrabold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition-all shadow-xl shadow-indigo-950 hover:scale-[1.01]"
            >
              <span>{isSubmitting ? "Creating account..." : "Create Account"}</span>
              {!isSubmitting && <ArrowRight className="w-4 h-4 text-white" />}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-400 font-medium">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Sign in
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
