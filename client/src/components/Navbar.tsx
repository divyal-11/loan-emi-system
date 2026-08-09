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
    <nav className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 text-slate-100 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Indigo FinTech Logo */}
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-600 text-white rounded-2xl border border-indigo-400/40 shadow-lg shadow-indigo-950">
              <Landmark className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-white">
                LoanFlex
              </span>
              <span className="text-xs block text-indigo-400 font-mono font-bold tracking-wider">FINTECH PLATFORM</span>
            </div>
          </div>

          {/* Nav Links */}
          <div className="flex items-center space-x-4">
            {!isAdmin ? (
              <Link
                href="/dashboard"
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  pathname === "/dashboard"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-950"
                    : "text-slate-300 hover:text-white hover:bg-slate-900"
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>My Dashboard</span>
              </Link>
            ) : (
              <Link
                href="/admin"
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  pathname === "/admin"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-950"
                    : "text-slate-300 hover:text-white hover:bg-slate-900"
                }`}
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Admin Console</span>
              </Link>
            )}

            {/* User Profile Badge */}
            <div className="flex items-center space-x-3 pl-4 border-l border-slate-800">
              <div className="flex items-center space-x-2 bg-slate-900 px-3.5 py-1.5 rounded-full border border-slate-800">
                <User className="w-4 h-4 text-indigo-400" />
                <span className="text-sm font-bold text-white">{user.name}</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-mono font-bold tracking-wider ${
                    isAdmin
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                      : "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40"
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
