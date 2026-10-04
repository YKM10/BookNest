"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Navbar } from "@/components/Navbar";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { useAuth } from "@/context/AuthContext";
import { api, Book, ApiError } from "@/lib/api";
import { BookLoader } from "@/components/3d/BookLoader";
import {
  BookOpen,
  Calendar,
  Building,
  Hash,
  BookmarkPlus,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  ShieldCheck,
  Tag,
  Sparkles,
  Bot,
} from "lucide-react";

const BookScene3D = dynamic(
  () => import("@/components/3d/BookScene3D").then((m) => m.BookScene3D),
  {
    ssr: false,
    loading: () => (
      <div className="h-72 w-full flex items-center justify-center">
        <BookLoader size="md" label="Rendering 3D Book..." />
      </div>
    ),
  }
);

export default function BookDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const bookId = parseInt(resolvedParams.id, 10);

  const { user } = useAuth();
  const [book, setBook] = useState<Book | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Borrow action & confirmation
  const [isBorrowing, setIsBorrowing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // AI explanation state
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);

  const fetchAiExplanation = async () => {
    if (!book || isLoadingAi) return;
    setIsLoadingAi(true);
    try {
      const res = await api.ai.chat({
        message: `Explain "${book.title}" by ${book.author}. What are the key takeaways, prerequisites, and who should read it?`,
        book_id: book.id,
      });
      setAiExplanation(res.reply);
    } catch {
      setAiExplanation(
        `"${book.title}" by ${book.author} is categorized under ${book.category || "Academic Literature"}. ${book.description || "A valuable title in the BookNest digital library."}`
      );
    } finally {
      setIsLoadingAi(false);
    }
  };

  const fetchBook = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.books.get(bookId);
      setBook(data);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.status === 404) {
          setError(`Book #${bookId} could not be found in the catalog.`);
        } else if (err.status === 401) {
          setError("You must be signed in to view detailed catalog information.");
        } else {
          setError(err.detail);
        }
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to load book details.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isNaN(bookId)) {
      fetchBook();
    } else {
      setError("Invalid book identifier.");
      setIsLoading(false);
    }
  }, [bookId]);

  const handleBorrow = async () => {
    if (!book) return;

    if (!user) {
      setError("Please sign in to borrow this book.");
      return;
    }

    setIsBorrowing(true);
    setActionSuccess(null);
    setError(null);

    try {
      await api.borrowings.borrow(book.id);
      setActionSuccess(`Successfully borrowed "${book.title}"! Due in 14 days.`);
      setShowConfirmModal(false);
      await fetchBook(); // Refresh available copies
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.detail);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to borrow book.");
      }
    } finally {
      setIsBorrowing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Navigation Breadcrumb */}
        <div>
          <Link
            href="/books"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-600 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Catalog
          </Link>
        </div>

        {/* Feedback Banners */}
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
            {error.includes("sign in") && (
              <Link
                href="/login"
                className="rounded-lg bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700 transition"
              >
                Sign In
              </Link>
            )}
          </div>
        )}

        {/* Main Content */}
        {isLoading ? (
          <div className="py-24 text-center">
            <BookLoader size="lg" label="Retrieving book details from catalog..." />
          </div>
        ) : !book ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-500">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-lg font-bold text-slate-900">Book Not Found</h2>
            <p className="mt-1 text-sm text-slate-500">
              The requested book does not exist or has been removed from the catalog.
            </p>
            <div className="mt-6">
              <Link
                href="/books"
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition"
              >
                Return to Catalog
              </Link>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-6 lg:p-8 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 items-start">
              {/* Left Column: 3D Book canvas & actions */}
              <div className="md:col-span-4 flex flex-col items-center">
                <div className="w-full flex flex-col items-center">
                  <div className="w-full max-w-[280px] h-72 sm:h-80 relative flex items-center justify-center rounded-2xl bg-gradient-to-b from-slate-100 to-indigo-50/40 p-2 shadow-inner border border-slate-200/80 overflow-hidden">
                    <BookScene3D
                      title={book.title}
                      author={book.author}
                      category={book.category || undefined}
                      className="w-full h-full"
                    />
                  </div>
                  <span className="mt-2 text-[11px] font-medium text-slate-400">
                    Interactive 3D Book (drag or touch to tilt)
                  </span>
                </div>

                <div className="mt-5 w-full space-y-2">
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5 text-center">
                    <p className="text-xs font-medium text-slate-400">Inventory Status</p>
                    <p className="mt-0.5 text-base font-extrabold text-slate-900">
                      {book.available_copies}{" "}
                      <span className="text-xs font-normal text-slate-500">
                        / {book.total_copies} copies available
                      </span>
                    </p>
                  </div>

                  {user ? (
                    <button
                      onClick={() => setShowConfirmModal(true)}
                      disabled={book.available_copies <= 0 || isBorrowing}
                      className="w-full flex justify-center items-center gap-2 rounded-xl bg-indigo-600 py-3 px-4 text-sm font-semibold text-white shadow-md shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      {isBorrowing ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : book.available_copies <= 0 ? (
                        "No Copies Available"
                      ) : (
                        <>
                          <BookmarkPlus className="h-4 w-4" />
                          Borrow This Book
                        </>
                      )}
                    </button>
                  ) : (
                    <Link
                      href="/login"
                      className="w-full flex justify-center items-center gap-2 rounded-xl bg-indigo-600 py-3 px-4 text-sm font-semibold text-white shadow-md shadow-indigo-200 hover:bg-indigo-700 transition"
                    >
                      Sign in to Borrow
                    </Link>
                  )}
                </div>
              </div>

              {/* Right Column: Book Metadata */}
              <div className="md:col-span-8 space-y-6">
                <div>
                  <div className="inline-flex items-center gap-1.5 rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 mb-2">
                    <Tag className="h-3 w-3" />
                    {book.category || "General Literature"}
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    {book.title}
                  </h1>
                  <p className="text-base text-slate-600 font-medium mt-1">by {book.author}</p>
                </div>

                {book.description && (
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Description / Overview
                    </h3>
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                      {book.description}
                    </p>
                  </div>
                )}

                {/* AI Librarian Insight Box */}
                <div className="rounded-2xl border border-purple-200/80 bg-gradient-to-br from-purple-50/70 to-indigo-50/50 p-4 sm:p-5 space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-600 text-white shadow-2xs">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider text-purple-900">
                        AI Librarian Insight
                      </span>
                    </div>

                    {!aiExplanation && (
                      <button
                        onClick={fetchAiExplanation}
                        disabled={isLoadingAi}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-purple-700 disabled:opacity-40 transition"
                      >
                        {isLoadingAi ? <Loader2 className="h-3 w-3 animate-spin" /> : <Bot className="h-3 w-3" />}
                        <span>{isLoadingAi ? "Analyzing..." : "Explain This Book"}</span>
                      </button>
                    )}
                  </div>

                  {aiExplanation ? (
                    <div className="pt-2 border-t border-purple-200/60">
                      <p className="text-xs sm:text-sm text-purple-950 leading-relaxed whitespace-pre-line">
                        {aiExplanation}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-purple-800/80 leading-relaxed">
                      Ask the AI Librarian for key takeaways, prerequisites, target audience, and related academic concepts.
                    </p>
                  )}
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-5 text-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                      <Hash className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-medium">ISBN Identifier</p>
                      <p className="font-mono text-xs font-semibold text-slate-800">{book.isbn}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                      <Building className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-medium">Publisher</p>
                      <p className="text-xs font-semibold text-slate-800">
                        {book.publisher || "Not specified"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-medium">Publication Year</p>
                      <p className="text-xs font-semibold text-slate-800">
                        {book.publication_year || "Unknown"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-medium">Library Policy</p>
                      <p className="text-xs font-semibold text-slate-800">14-day standard borrowing</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <ConfirmationModal
        isOpen={showConfirmModal}
        title="Confirm Book Borrowing"
        description={
          book
            ? `Are you sure you want to borrow "${book.title}" by ${book.author}? The loan period is 14 days.`
            : ""
        }
        confirmText="Confirm Borrow"
        variant="primary"
        isLoading={isBorrowing}
        onConfirm={handleBorrow}
        onCancel={() => setShowConfirmModal(false)}
      />
    </div>
  );
}
