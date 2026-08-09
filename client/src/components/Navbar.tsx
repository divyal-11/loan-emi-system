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
    <nav className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80 text-zinc-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-600/20 text-red-500 rounded-xl border border-red-500/30 shadow-lg shadow-red-950/50">
              <Landmark className="w-6 h-6" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-zinc-200 to-red-400 bg-clip-text text-transparent">
                LoanFlex
              </span>
              <span className="text-xs block text-zinc-400 font-mono tracking-wider">CRIMSON EDITION</span>
            </div>
          </div>

          {/* Nav Links */}
          <div className="flex items-center space-x-4">
            {!isAdmin ? (
              <Link
                href="/dashboard"
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                  pathname === "/dashboard"
                    ? "bg-red-600/20 text-red-300 border border-red-500/40 shadow-md shadow-red-950"
                    : "text-zinc-300 hover:text-white hover:bg-zinc-900"
                }`}
              >
                <LayoutDashboard className="w-4 h-4 text-red-400" />
                <span>My Dashboard</span>
              </Link>
            ) : (
              <Link
                href="/admin"
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                  pathname === "/admin"
                    ? "bg-red-600/20 text-red-300 border border-red-500/40 shadow-md shadow-red-950"
                    : "text-zinc-300 hover:text-white hover:bg-zinc-900"
                }`}
              >
                <ShieldAlert className="w-4 h-4 text-red-400" />
                <span>Admin Console</span>
              </Link>
            )}

            {/* User Profile Badge */}
            <div className="flex items-center space-x-3 pl-4 border-l border-zinc-800">
              <div className="flex items-center space-x-2 bg-zinc-900/90 px-3 py-1.5 rounded-full border border-zinc-800">
                <User className="w-4 h-4 text-red-400" />
                <span className="text-sm font-semibold text-zinc-100">{user.name}</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-mono font-bold tracking-wider ${
                    isAdmin
                      ? "bg-red-500/20 text-red-300 border border-red-500/30"
                      : "bg-zinc-800 text-zinc-300 border border-zinc-700"
                  }`}
                >
                  {user.role}
                </span>
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
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
