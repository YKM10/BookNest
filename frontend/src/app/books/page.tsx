"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { useAuth } from "@/context/AuthContext";
import { api, Book, ApiError } from "@/lib/api";
import { BookLoader } from "@/components/3d/BookLoader";
import {
  Search,
  Filter,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Loader2,
  BookmarkPlus,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export default function BooksPage() {
  const { user } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [availableOnly, setAvailableOnly] = useState(false);

  // Borrow action feedback & confirmation
  const [borrowingId, setBorrowingId] = useState<number | null>(null);
  const [bookToBorrow, setBookToBorrow] = useState<Book | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchBooks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.books.list({
        search: searchTerm.trim() || undefined,
        category: selectedCategory.trim() || undefined,
        available: availableOnly ? true : undefined,
      });
      setBooks(data);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setError("You must be logged in to view the library catalog.");
        } else {
          setError(err.detail);
        }
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to retrieve books from catalog.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, selectedCategory, availableOnly]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBooks();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchBooks]);

  const handleBorrow = async (book: Book) => {
    if (!user) {
      setError("Please sign in first to borrow books from the library.");
      return;
    }

    setBorrowingId(book.id);
    setActionSuccess(null);
    setError(null);

    try {
      await api.borrowings.borrow(book.id);
      setActionSuccess(`Successfully borrowed "${book.title}"! Due in 14 days.`);
      setBookToBorrow(null);
      await fetchBooks();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.detail);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Unable to complete borrowing.");
      }
    } finally {
      setBorrowingId(null);
    }
  };

  // Derive unique categories from books list
  const categories = Array.from(
    new Set(books.map((b) => b.category).filter((c): c is string => Boolean(c)))
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Library Catalog
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Browse, search, and borrow available academic and reference titles.
            </p>
          </div>

          {user && (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition"
            >
              Go to My Dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>

        {/* Feedback Messages */}
        {actionSuccess && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 flex items-center justify-between">
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
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <div className="flex items-center gap-3">
              {error.includes("logged in") && (
                <Link
                  href="/login"
                  className="rounded-lg bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700 transition"
                >
                  Sign In
                </Link>
              )}
              <button
                onClick={() => setError(null)}
                className="text-xs text-red-700 hover:text-red-900 font-semibold"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Search & Filter Bar */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-center">
            {/* Search Input */}
            <div className="md:col-span-6 relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <Search className="h-4 w-4" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by title, author, ISBN, or topic..."
                className="w-full rounded-xl border border-slate-300 pl-10 pr-4 py-2.5 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
              />
            </div>

            {/* Category Select */}
            <div className="md:col-span-3">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-base sm:text-sm text-slate-700 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 bg-white"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Availability Toggle */}
            <div className="md:col-span-3 flex items-center justify-start md:justify-end gap-2.5">
              <label className="flex items-center gap-2 cursor-pointer select-none text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={availableOnly}
                  onChange={(e) => setAvailableOnly(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                Available Only
              </label>
            </div>
          </div>
        </div>

        {/* Books Grid */}
        {isLoading ? (
          <div className="py-20 text-center">
            <BookLoader size="lg" label="Querying library catalog..." />
          </div>
        ) : books.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-2xl border border-slate-200/80 p-8 shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <BookOpen className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-slate-900">No books found</h3>
            <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">
              No catalog entries match your search criteria. Try clearing search filters.
            </p>
            {(searchTerm || selectedCategory || availableOnly) && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setSelectedCategory("");
                  setAvailableOnly(false);
                }}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {books.map((book, idx) => {
              const isAvailable = book.available_copies > 0;
              return (
                <motion.div
                  key={book.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: Math.min(idx * 0.04, 0.4) }}
                  whileHover={{
                    y: -5,
                    rotateY: 2,
                    rotateX: -1,
                    transition: { duration: 0.2 },
                  }}
                  style={{ transformPerspective: 800 }}
                  className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:shadow-lg hover:border-indigo-200 transition-shadow flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                        {book.category || "General"}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          isAvailable
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-red-50 text-red-700 border border-red-200"
                        }`}
                      >
                        {isAvailable ? `${book.available_copies} of ${book.total_copies} available` : "Unavailable"}
                      </span>
                    </div>

                    <div>
                      <Link
                        href={`/books/${book.id}`}
                        className="text-lg font-bold text-slate-900 hover:text-indigo-600 transition line-clamp-1"
                      >
                        {book.title}
                      </Link>
                      <p className="text-sm text-slate-500 font-medium">{book.author}</p>
                    </div>

                    {book.description && (
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {book.description}
                      </p>
                    )}

                    <div className="text-[11px] text-slate-400">
                      ISBN: <span className="font-mono text-slate-600">{book.isbn}</span>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                    <Link
                      href={`/books/${book.id}`}
                      className="text-xs font-semibold text-slate-600 hover:text-indigo-600 transition"
                    >
                      View Details &rarr;
                    </Link>

                    {user && (
                      <button
                        onClick={() => setBookToBorrow(book)}
                        disabled={!isAvailable || borrowingId === book.id}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                      >
                        {borrowingId === book.id ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Borrowing...
                          </>
                        ) : (
                          <>
                            <BookmarkPlus className="h-3.5 w-3.5" />
                            Borrow
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      <ConfirmationModal
        isOpen={bookToBorrow !== null}
        title="Confirm Book Borrowing"
        description={
          bookToBorrow
            ? `Are you sure you want to borrow "${bookToBorrow.title}" by ${bookToBorrow.author}? Standard loan duration is 14 days.`
            : ""
        }
        confirmText="Confirm Borrow"
        variant="primary"
        isLoading={borrowingId !== null}
        onConfirm={() => {
          if (bookToBorrow) {
            handleBorrow(bookToBorrow);
          }
        }}
        onCancel={() => setBookToBorrow(null)}
      />
    </div>
  );
}
