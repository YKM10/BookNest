"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { AuthenticatedLayout } from "@/components/AuthenticatedLayout";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { LibrarianDashboard } from "@/components/LibrarianDashboard";
import { AdminDashboard } from "@/components/AdminDashboard";
import { useAuth } from "@/context/AuthContext";
import { api, Borrowing, ApiError } from "@/lib/api";
import { BookLoader } from "@/components/3d/BookLoader";
import {
  BookOpen,
  Calendar,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  TrendingUp,
  History,
} from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();
  const [borrowings, setBorrowings] = useState<Borrowing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Return modal state
  const [selectedBorrowingForReturn, setSelectedBorrowingForReturn] = useState<Borrowing | null>(null);
  const [isReturning, setIsReturning] = useState(false);

  const fetchBorrowings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.borrowings.my();
      setBorrowings(data);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.detail);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to load your active borrowings.");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBorrowings();
  }, [fetchBorrowings]);

  const confirmReturn = async () => {
    if (!selectedBorrowingForReturn) return;

    setIsReturning(true);
    setActionSuccess(null);
    setError(null);

    try {
      const result = await api.borrowings.returnBook(selectedBorrowingForReturn.id);
      const fineMsg =
        Number(result.fine_amount) > 0 ? ` (Overdue fine assessed: $${Number(result.fine_amount).toFixed(2)})` : "";
      setActionSuccess(`"${selectedBorrowingForReturn.book?.title || 'Book'}" returned successfully!${fineMsg}`);
      setSelectedBorrowingForReturn(null);
      await fetchBorrowings();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.detail);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to process book return.");
      }
    } finally {
      setIsReturning(false);
    }
  };

  const activeCount = borrowings.length;
  const overdueCount = borrowings.filter((b) => b.status === "OVERDUE").length;
  const totalFines = borrowings.reduce((sum, b) => sum + Number(b.fine_amount || 0), 0);

  if (user?.role === "ADMIN") {
    return (
      <AuthenticatedLayout>
        <AdminDashboard />
      </AuthenticatedLayout>
    );
  }

  if (user?.role === "LIBRARIAN") {
    return (
      <AuthenticatedLayout>
        <LibrarianDashboard />
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <div className="space-y-8">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Student Dashboard
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Welcome back, <span className="font-semibold text-slate-800">{user?.name}</span>. Manage your
              borrowed library titles, due dates, and active loans.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/history"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              <History className="h-4 w-4 text-slate-400" />
              View Loan History
            </Link>
            <Link
              href="/books"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
            >
              <BookOpen className="h-4 w-4" />
              Browse Catalog
            </Link>
          </div>
        </div>

        {/* Action feedback banners */}
        {actionSuccess && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
              <span>{actionSuccess}</span>
            </div>
            <button
              onClick={() => setActionSuccess(null)}
              className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold"
            >
              Dismiss
            </button>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 flex items-center justify-between animate-in fade-in">
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

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.05 }}
            whileHover={{ y: -3, transition: { duration: 0.15 } }}
            className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Active Borrowings
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <BookOpen className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900">{activeCount}</span>
              <span className="text-xs font-medium text-slate-400">/ 5 max active limit</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">Titles currently checked out</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.1 }}
            whileHover={{ y: -3, transition: { duration: 0.15 } }}
            className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Overdue Titles
              </span>
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                  overdueCount > 0 ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"
                }`}
              >
                <AlertTriangle className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className={`text-3xl font-extrabold ${overdueCount > 0 ? "text-amber-600" : "text-slate-900"}`}>
                {overdueCount}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {overdueCount > 0 ? "Fines accrue daily ($1.00/day)" : "All active loans are on schedule"}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.15 }}
            whileHover={{ y: -3, transition: { duration: 0.15 } }}
            className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Live Accrued Fines
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-600">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-extrabold text-slate-900">
                ${totalFines.toFixed(2)}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">Assessed by backend borrowing rules</p>
          </motion.div>
        </div>

        {/* Current Borrowings Table */}
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h2 className="text-base font-bold text-slate-900">Currently Borrowed Books</h2>
              <p className="text-xs text-slate-500">Active loans that require return before their due date</p>
            </div>
            <button
              onClick={fetchBorrowings}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition"
            >
              Refresh Active List
            </button>
          </div>

          {isLoading ? (
            <div className="p-12 text-center">
              <BookLoader size="md" label="Retrieving active loans..." />
            </div>
          ) : borrowings.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <BookOpen className="h-6 w-6" />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-slate-900">No active borrowings</h3>
              <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">
                You have no books currently checked out. Search our catalog to discover and borrow titles.
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
                    <th scope="col" className="px-6 py-3.5">Borrowed On</th>
                    <th scope="col" className="px-6 py-3.5">Due Date</th>
                    <th scope="col" className="px-6 py-3.5">Status</th>
                    <th scope="col" className="px-6 py-3.5">Fine Accrued</th>
                    <th scope="col" className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {borrowings.map((b) => {
                    const isOverdue = b.status === "OVERDUE";
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
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            {new Date(b.borrowed_at).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`text-xs font-semibold ${
                              isOverdue ? "text-red-600" : "text-slate-700"
                            }`}
                          >
                            {new Date(b.due_date).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              isOverdue
                                ? "bg-red-50 text-red-700 border border-red-200"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            }`}
                          >
                            {b.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs font-semibold text-slate-900">
                          ${Number(b.fine_amount || 0).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => setSelectedBorrowingForReturn(b)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-200 transition"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Return Book
                          </button>
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

      {/* Return Confirmation Modal */}
      <ConfirmationModal
        isOpen={Boolean(selectedBorrowingForReturn)}
        title="Confirm Book Return"
        description={
          selectedBorrowingForReturn
            ? `Are you sure you want to return "${selectedBorrowingForReturn.book?.title || 'this book'}"? This will check the book back in and restore an available copy to the library.`
            : ""
        }
        confirmText="Confirm Return"
        cancelText="Keep Book"
        variant="primary"
        isLoading={isReturning}
        onConfirm={confirmReturn}
        onCancel={() => setSelectedBorrowingForReturn(null)}
      />
    </AuthenticatedLayout>
  );
}
