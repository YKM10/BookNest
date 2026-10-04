"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { AuthenticatedLayout } from "@/components/AuthenticatedLayout";
import { useAuth } from "@/context/AuthContext";
import { api, Borrowing, ApiError } from "@/lib/api";
import {
  History,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Loader2,
  BookOpen,
  ArrowRight,
  Filter,
} from "lucide-react";

export default function HistoryPage() {
  const { user } = useAuth();
  const isStaff = user?.role === "LIBRARIAN" || user?.role === "ADMIN";
  const [history, setHistory] = useState<Borrowing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.borrowings.history();
      setHistory(data);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.detail);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to load borrowing history.");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const filteredHistory = history.filter((b) => {
    if (statusFilter === "ALL") return true;
    return b.status === statusFilter;
  });

  const totalBorrowed = history.length;
  const returnedCount = history.filter((b) => b.status === "RETURNED").length;
  const activeCount = history.filter((b) => b.status === "BORROWED" || b.status === "OVERDUE").length;
  const totalFines = history.reduce((sum, b) => sum + Number(b.fine_amount || 0), 0);

  return (
    <AuthenticatedLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
              <History className="h-7 w-7 text-indigo-600" />
              {isStaff ? "Library Borrowing Records" : "Borrowing History"}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {isStaff
                ? "Audit and review circulation records, active loans, returned books, and fines across the entire library."
                : "View your complete digital library loan history, returned items, and past fine receipts."}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchHistory}
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Refresh History
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-xs text-red-700 hover:text-red-900 font-semibold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Lifetime Borrows</p>
            <p className="mt-2 text-2xl font-extrabold text-slate-900">{totalBorrowed}</p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Returned Books</p>
            <p className="mt-2 text-2xl font-extrabold text-emerald-600">{returnedCount}</p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Currently Active</p>
            <p className="mt-2 text-2xl font-extrabold text-indigo-600">{activeCount}</p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Fines Assessed</p>
            <p className="mt-2 text-2xl font-extrabold text-slate-900">${totalFines.toFixed(2)}</p>
          </div>
        </div>

        {/* Table Card */}
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
          {/* Filter Bar */}
          <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Filter Status:</span>
              <div className="flex items-center gap-1.5">
                {["ALL", "RETURNED", "BORROWED", "OVERDUE"].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                      statusFilter === st
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {st === "ALL" ? "All Records" : st}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-xs text-slate-400">
              Showing {filteredHistory.length} of {history.length} records
            </p>
          </div>

          {isLoading ? (
            <div className="p-12 text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-indigo-600" />
              <p className="mt-2 text-sm text-slate-500">Loading your loan records...</p>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <BookOpen className="h-6 w-6" />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-slate-900">No borrowing records found</h3>
              <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">
                No past or present loans match your filter criteria.
              </p>
              <div className="mt-5">
                <Link
                  href="/books"
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
                >
                  Explore Catalog
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50/75 text-xs uppercase font-semibold text-slate-400 border-b border-slate-100">
                  <tr>
                    <th scope="col" className="px-6 py-3.5">Book Title</th>
                    {isStaff && <th scope="col" className="px-6 py-3.5">Borrower</th>}
                    <th scope="col" className="px-6 py-3.5">Borrowed Date</th>
                    <th scope="col" className="px-6 py-3.5">Due Date</th>
                    <th scope="col" className="px-6 py-3.5">Returned Date</th>
                    <th scope="col" className="px-6 py-3.5">Status</th>
                    <th scope="col" className="px-6 py-3.5 text-right">Fine Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredHistory.map((b) => {
                    const isOverdue = b.status === "OVERDUE";
                    const isReturned = b.status === "RETURNED";
                    return (
                      <tr key={b.id} className="hover:bg-slate-50/60 transition">
                        <td className="px-6 py-4 font-semibold text-slate-900">
                          <Link href={`/books/${b.book_id}`} className="hover:text-indigo-600 transition">
                            {b.book?.title || `Book #${b.book_id}`}
                          </Link>
                          {b.book?.author && (
                            <p className="text-xs text-slate-400 font-normal">{b.book.author}</p>
                          )}
                        </td>
                        {isStaff && (
                          <td className="px-6 py-4 text-xs font-mono text-slate-600">
                            <span className="rounded bg-slate-100 px-2 py-0.5">
                              User #{b.user_id}
                            </span>
                          </td>
                        )}
                        <td className="px-6 py-4 text-xs text-slate-500">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            {new Date(b.borrowed_at).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-600 font-medium">
                          {new Date(b.due_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-600">
                          {b.returned_at ? (
                            <span className="text-emerald-700 font-medium">
                              {new Date(b.returned_at).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="text-amber-600 font-medium italic">Active Loan</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              isReturned
                                ? "bg-slate-100 text-slate-700"
                                : isOverdue
                                ? "bg-red-50 text-red-700 border border-red-200"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            }`}
                          >
                            {b.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-slate-900 text-xs">
                          ${Number(b.fine_amount || 0).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
