"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { Landmark, LogOut, User, ShieldAlert, LayoutDashboard, FileText } from "lucide-react";

export function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  if (!user) return null;

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const isAdmin = user.role === "admin";

  return (
    <nav className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 text-slate-100 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Groww-style Logo */}
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20 shadow-lg shadow-emerald-950/40">
              <Landmark className="w-6 h-6" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-emerald-400 bg-clip-text text-transparent">
                LoanFlex
              </span>
              <span className="text-xs block text-emerald-400/90 font-mono font-medium">FINTECH SUITE</span>
            </div>
          </div>

          {/* Nav Links */}
          <div className="flex items-center space-x-4">
            {!isAdmin ? (
              <Link
                href="/dashboard"
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  pathname === "/dashboard"
                    ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-md shadow-emerald-950/50"
                    : "text-slate-300 hover:text-white hover:bg-slate-900"
                }`}
              >
                <LayoutDashboard className="w-4 h-4 text-emerald-400" />
                <span>My Dashboard</span>
              </Link>
            ) : (
              <Link
                href="/admin"
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  pathname === "/admin"
                    ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-md shadow-emerald-950/50"
                    : "text-slate-300 hover:text-white hover:bg-slate-900"
                }`}
              >
                <ShieldAlert className="w-4 h-4 text-emerald-400" />
                <span>Admin Console</span>
              </Link>
            )}

            {/* User Profile Badge */}
            <div className="flex items-center space-x-3 pl-4 border-l border-slate-800">
              <div className="flex items-center space-x-2 bg-slate-900/90 px-3.5 py-1.5 rounded-full border border-slate-800">
                <User className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-semibold text-slate-100">{user.name}</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-mono font-bold tracking-wider ${
                    isAdmin
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  }`}
                >
                  {user.role}
                </span>
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
                title="Log out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>

        </div>
      </div>
    </nav>
  );
}
