"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import { AuditLogModal } from "../../components/admin/AuditLogModal";
import { RejectReasonModal } from "../../components/admin/RejectReasonModal";
import { AdminLoanDetailModal, AdminLoanItem } from "../../components/admin/AdminLoanDetailModal";
import { api, ApiError } from "../../lib/api";
import {
  ShieldAlert,
  Clock,
  CheckCircle2,
  XCircle,
  History,
  IndianRupee,
  AlertCircle,
  Loader2,
  RefreshCw,
  Eye,
  User,
  Mail,
  PieChart as PieIcon,
  BarChart3,
  Layers,
  TrendingUp,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

interface AdminAllLoansResponse {
  loans: AdminLoanItem[];
  metrics: {
    totalLoans: number;
    totalDisbursedVolume: number;
    totalRepaymentsCollected: number;
    statusCounts: {
      PENDING: number;
      DISBURSED: number;
      CLOSED: number;
      REJECTED: number;
    };
  };
}

export default function AdminDashboardPage() {
  const [loans, setLoans] = useState<AdminLoanItem[]>([]);
  const [metrics, setMetrics] = useState<AdminAllLoansResponse["metrics"]>({
    totalLoans: 0,
    totalDisbursedVolume: 0,
    totalRepaymentsCollected: 0,
    statusCounts: { PENDING: 0, DISBURSED: 0, CLOSED: 0, REJECTED: 0 },
  });

  const [activeTab, setActiveTab] = useState<"ALL" | "PENDING" | "DISBURSED" | "CLOSED" | "REJECTED">("ALL");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectingLoanId, setRejectingLoanId] = useState<string | null>(null);
  const [auditLoanId, setAuditLoanId] = useState<string | null>(null);
  const [selectedLoanForInspect, setSelectedLoanForInspect] = useState<AdminLoanItem | null>(null);

  const fetchAllLoans = useCallback(async (tabFilter: string = "ALL") => {
    setIsLoading(true);
    setError(null);

    try {
      const endpoint = tabFilter === "ALL" ? "/admin/loans/all" : `/admin/loans/all?status=${tabFilter}`;
      const data = await api.get<AdminAllLoansResponse>(endpoint);
      setLoans(data.loans);
      setMetrics(data.metrics);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to fetch admin portfolio applications.");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllLoans(activeTab);
  }, [fetchAllLoans, activeTab]);

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    setError(null);
    setActionSuccessMsg(null);

    try {
      await api.patch(`/admin/loans/${id}/approve`);
      setActionSuccessMsg(`Loan ${id.substring(0, 8)}... successfully approved and disbursed!`);
      await fetchAllLoans(activeTab);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to approve loan application.");
      }
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectConfirm = async (reason: string) => {
    if (!rejectingLoanId) return;

    try {
      await api.patch(`/admin/loans/${rejectingLoanId}/reject`, { reason });
      setActionSuccessMsg(`Loan ${rejectingLoanId.substring(0, 8)}... successfully rejected.`);
      await fetchAllLoans(activeTab);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        throw new Error(err.message);
      }
      throw new Error("Failed to reject loan application.");
    }
  };

  // Prepare Recharts Data
  const pieData = [
    { name: "Pending", value: metrics.statusCounts.PENDING, color: "#f59e0b" }, // Amber
    { name: "Disbursed", value: metrics.statusCounts.DISBURSED, color: "#6366f1" }, // Indigo
    { name: "Closed", value: metrics.statusCounts.CLOSED, color: "#10b981" }, // Emerald
    { name: "Rejected", value: metrics.statusCounts.REJECTED, color: "#f43f5e" }, // Rose
  ].filter((item) => item.value > 0);

  const barData = [
    {
      category: "Disbursed Capital",
      amount: metrics.totalDisbursedVolume,
      fill: "#6366f1",
    },
    {
      category: "Repayments Collected",
      amount: metrics.totalRepaymentsCollected,
      fill: "#10b981",
    },
  ];

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 font-sans selection:bg-indigo-500/30 selection:text-indigo-200 relative overflow-hidden">
        
        {/* Ambient Indigo Background Glow */}
        <div className="absolute top-10 right-1/4 w-[500px] h-[300px] bg-indigo-600/10 blur-[140px] pointer-events-none rounded-full" />

        <div className="max-w-7xl mx-auto space-y-8 relative z-10">
          
          {/* Top Hero Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-2xl">
            <div>
              <div className="flex items-center space-x-2">
                <ShieldAlert className="w-6 h-6 text-indigo-400" />
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Admin Underwriting & Portfolio Console
                </h1>
              </div>
              <p className="text-slate-400 text-sm mt-1 font-medium">
                Manage underwriting queues, inspect borrower schedules, track collection metrics, and view visual analytics.
              </p>
            </div>

            <button
              onClick={() => fetchAllLoans(activeTab)}
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-all shadow-md disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 text-indigo-400 ${isLoading ? "animate-spin" : ""}`} />
              Refresh Console
            </button>
          </div>

          {/* Alert Messages */}
          {error && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-medium flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {actionSuccessMsg && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <span>{actionSuccessMsg}</span>
            </div>
          )}

          {/* Metric Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Portfolio Applications</span>
                <Layers className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-2xl font-bold text-slate-100">{metrics.totalLoans} Loans</div>
            </div>

            <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Disbursed Volume</span>
                <IndianRupee className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-emerald-400">₹{metrics.totalDisbursedVolume.toLocaleString("en-IN")}</div>
            </div>

            <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Repayments Collected</span>
                <TrendingUp className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-2xl font-bold text-indigo-400">₹{metrics.totalRepaymentsCollected.toLocaleString("en-IN")}</div>
            </div>

            <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending Underwriting</span>
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-bold text-amber-400">{metrics.statusCounts.PENDING} Pending</div>
            </div>
          </div>

          {/* Visual Analytics Graphs (Pie & Bar Charts) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie Chart: Loan Status Distribution */}
            <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <PieIcon className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-sm font-bold text-slate-200">Loan Status Distribution (Pie Graph)</h3>
                </div>
              </div>

              {pieData.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-slate-500 text-xs">
                  No portfolio loan data available for distribution graph.
                </div>
              ) : (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0f172a",
                          borderColor: "#334155",
                          borderRadius: "12px",
                          color: "#f8fafc",
                          fontSize: "12px",
                        }}
                      />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Bar Chart: Financial Volume Comparison */}
            <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-sm font-bold text-slate-200">Capital Volume vs Collections (Bar Graph)</h3>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="category" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} />
                    <Tooltip
                      formatter={(value: any) => `₹${Number(value || 0).toLocaleString("en-IN")}`}
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        borderColor: "#334155",
                        borderRadius: "12px",
                        color: "#f8fafc",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                      {barData.map((entry, index) => (
                        <Cell key={`bar-cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Status Filter Tabs & Table Section */}
          <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden">
            
            {/* Filter Tabs Header */}
            <div className="flex flex-wrap items-center justify-between p-4 sm:p-6 border-b border-slate-800 bg-slate-900/50 gap-4">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-100">Application Management Table</h2>
              </div>

              {/* Status Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1 rounded-2xl border border-slate-800">
                {(["ALL", "PENDING", "DISBURSED", "CLOSED", "REJECTED"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all ${
                      activeTab === tab
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                    }`}
                  >
                    {tab === "ALL" ? "All Loans" : tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Table Body */}
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                <p className="text-sm font-medium">Loading applications queue...</p>
              </div>
            ) : loans.length === 0 ? (
              <div className="p-16 text-center text-slate-400 space-y-2">
                <ShieldAlert className="w-12 h-12 text-slate-600 mx-auto" />
                <h3 className="text-base font-semibold text-slate-300">No applications match this filter</h3>
                <p className="text-xs text-slate-500">Select another filter tab above or check back later.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-800/40 text-slate-400 uppercase text-[10px] sm:text-xs tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="px-6 py-4">Borrower & Application</th>
                      <th className="px-6 py-4">Amount</th>
                      <th className="px-6 py-4">Tenure & Rate</th>
                      <th className="px-6 py-4">Purpose</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Applied Date</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {loans.map((loan) => (
                      <tr key={loan.id} className="hover:bg-slate-800/30 transition-colors">
                        
                        {/* Borrower Column */}
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="font-bold text-slate-100 flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-indigo-400" />
                              {loan.applicant?.name || "Registered Borrower"}
                            </div>
                            <div className="text-xs text-slate-400 flex items-center gap-1">
                              <Mail className="w-3 h-3 text-slate-500" />
                              {loan.applicant?.email || "N/A"}
                            </div>
                            <div className="text-[10px] font-mono text-slate-500">
                              ID: {loan.id.substring(0, 8)}...
                            </div>
                          </div>
                        </td>

                        {/* Amount Column */}
                        <td className="px-6 py-4 font-bold text-slate-100 font-mono">
                          ₹{loan.amount.toLocaleString("en-IN")}
                        </td>

                        {/* Tenure & Rate */}
                        <td className="px-6 py-4 font-medium text-slate-300">
                          {loan.tenureMonths} Months @ {loan.interestRate}%
                        </td>

                        {/* Purpose */}
                        <td className="px-6 py-4 max-w-xs truncate text-slate-400">
                          {loan.purpose}
                        </td>

                        {/* Status Badge */}
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full border ${
                            loan.status === "DISBURSED" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                            loan.status === "CLOSED" ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" :
                            loan.status === "REJECTED" ? "bg-rose-500/10 text-rose-400 border-rose-500/20" :
                            "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          }`}>
                            {loan.status}
                          </span>
                        </td>

                        {/* Applied Date */}
                        <td className="px-6 py-4 text-xs text-slate-400 font-mono">
                          {new Date(loan.appliedAt).toLocaleDateString("en-IN")}
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Inspect Schedule & User Details Button */}
                            <button
                              onClick={() => setSelectedLoanForInspect(loan)}
                              className="p-2 bg-slate-800 hover:bg-slate-700 text-indigo-400 rounded-xl transition-colors"
                              title="Inspect Borrower Details & EMI Schedule"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* View Audit Trail Button */}
                            <button
                              onClick={() => setAuditLoanId(loan.id)}
                              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors"
                              title="View Audit Trail"
                            >
                              <History className="w-4 h-4" />
                            </button>

                            {/* Approve Button (Pending Loans Only) */}
                            {loan.status === "PENDING" && (
                              <>
                                <button
                                  onClick={() => handleApprove(loan.id)}
                                  disabled={processingId === loan.id}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition-all disabled:opacity-50"
                                >
                                  {processingId === loan.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                  )}
                                  Approve
                                </button>

                                <button
                                  onClick={() => setRejectingLoanId(loan.id)}
                                  disabled={processingId === loan.id}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-semibold rounded-xl transition-all disabled:opacity-50"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  Reject
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Modals */}
        <AuditLogModal
          loanId={auditLoanId}
          isOpen={!!auditLoanId}
          onClose={() => setAuditLoanId(null)}
        />

        <RejectReasonModal
          loanId={rejectingLoanId}
          isOpen={!!rejectingLoanId}
          onClose={() => setRejectingLoanId(null)}
          onConfirm={handleRejectConfirm}
        />

        <AdminLoanDetailModal
          loan={selectedLoanForInspect}
          isOpen={!!selectedLoanForInspect}
          onClose={() => setSelectedLoanForInspect(null)}
        />
      </div>
    </ProtectedRoute>
  );
}
