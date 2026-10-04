"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  api,
  Book,
  Borrowing,
  BookCreateInput,
  BookUpdateInput,
  ApiError,
} from "@/lib/api";
import { BookFormModal } from "@/components/BookFormModal";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { BorrowingTable } from "@/components/BorrowingTable";
import { OverdueTable } from "@/components/OverdueTable";
import { BookLoader } from "@/components/3d/BookLoader";
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  AlertTriangle,
  Library,
  Clock,
  Layers,
  FileText,
} from "lucide-react";

export function LibrarianDashboard() {
  // Navigation tabs: 'books' | 'borrowings' | 'returned' | 'overdue'
  const [activeTab, setActiveTab] = useState<"books" | "borrowings" | "returned" | "overdue">("books");

  // Books state
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoadingBooks, setIsLoadingBooks] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [availableOnly, setAvailableOnly] = useState(false);

  // Borrowings & Overdue state
  const [borrowings, setBorrowings] = useState<Borrowing[]>([]);
  const [overdueList, setOverdueList] = useState<Borrowing[]>([]);
  const [isLoadingBorrowings, setIsLoadingBorrowings] = useState(true);

  // Notifications
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Book Modal state (Add / Edit)
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [selectedBookForEdit, setSelectedBookForEdit] = useState<Book | null>(null);
  const [isSubmittingBook, setIsSubmittingBook] = useState(false);
  const [bookModalError, setBookModalError] = useState<string | null>(null);

  // Delete Book Modal state
  const [bookToDelete, setBookToDelete] = useState<Book | null>(null);
  const [isDeletingBook, setIsDeletingBook] = useState(false);

  // Return Borrowing Modal state
  const [borrowingToReturn, setBorrowingToReturn] = useState<Borrowing | null>(null);
  const [isProcessingReturn, setIsProcessingReturn] = useState(false);

  // Fetch all books
  const loadBooks = useCallback(async () => {
    setIsLoadingBooks(true);
    try {
      const data = await api.books.list({
        search: searchTerm.trim() || undefined,
        category: categoryFilter.trim() || undefined,
        available: availableOnly ? true : undefined,
      });
      setBooks(data);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setErrorMessage(err.detail);
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Failed to load catalog books.");
      }
    } finally {
      setIsLoadingBooks(false);
    }
  }, [searchTerm, categoryFilter, availableOnly]);

  // Fetch borrowing history and overdue list
  const loadBorrowingData = useCallback(async () => {
    setIsLoadingBorrowings(true);
    try {
      const [histData, overdueData] = await Promise.all([
        api.borrowings.history(),
        api.borrowings.overdue(),
      ]);
      setBorrowings(histData);
      setOverdueList(overdueData);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setErrorMessage(err.detail);
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Failed to load borrowing records.");
      }
    } finally {
      setIsLoadingBorrowings(false);
    }
  }, []);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  useEffect(() => {
    loadBorrowingData();
  }, [loadBorrowingData]);

  // Derived stats
  const totalUniqueBooks = books.length;
  const totalInventoryCopies = books.reduce((acc, b) => acc + (b.total_copies || 0), 0);
  const totalAvailableCopies = books.reduce((acc, b) => acc + (b.available_copies || 0), 0);
  const activeLoansCount = borrowings.filter((b) => b.status === "BORROWED" || b.status === "OVERDUE").length;
  const returnedCount = borrowings.filter((b) => b.status === "RETURNED").length;
  const overdueCount = overdueList.length;
  const totalOutstandingFines = overdueList.reduce((sum, b) => sum + Number(b.fine_amount || 0), 0);

  // Derive unique categories
  const categories = Array.from(
    new Set(books.map((b) => b.category).filter((c): c is string => Boolean(c)))
  );

  // Handlers for Book Management
  const handleOpenAddModal = () => {
    setSelectedBookForEdit(null);
    setBookModalError(null);
    setIsBookModalOpen(true);
  };

  const handleOpenEditModal = (book: Book) => {
    setSelectedBookForEdit(book);
    setBookModalError(null);
    setIsBookModalOpen(true);
  };

  const handleSaveBook = async (formData: BookCreateInput | BookUpdateInput) => {
    setIsSubmittingBook(true);
    setBookModalError(null);
    setSuccessMessage(null);

    try {
      if (selectedBookForEdit) {
        // Edit existing book
        const updated = await api.books.update(selectedBookForEdit.id, formData as BookUpdateInput);
        setSuccessMessage(`Book "${updated.title}" was updated successfully.`);
      } else {
        // Create new book
        const created = await api.books.create(formData as BookCreateInput);
        setSuccessMessage(`New book "${created.title}" was added to catalog.`);
      }
      setIsBookModalOpen(false);
      setSelectedBookForEdit(null);
      await loadBooks();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setBookModalError(err.detail);
      } else if (err instanceof Error) {
        setBookModalError(err.message);
      } else {
        setBookModalError("Failed to save book.");
      }
    } finally {
      setIsSubmittingBook(false);
    }
  };

  const handleDeleteBookConfirm = async () => {
    if (!bookToDelete) return;

    setIsDeletingBook(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await api.books.delete(bookToDelete.id);
      setSuccessMessage(`Book "${bookToDelete.title}" has been deleted from catalog.`);
      setBookToDelete(null);
      await loadBooks();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setErrorMessage(err.detail);
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Failed to delete book.");
      }
    } finally {
      setIsDeletingBook(false);
    }
  };

  // Handlers for Borrowing Return
  const handleConfirmReturn = async () => {
    if (!borrowingToReturn) return;

    setIsProcessingReturn(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await api.borrowings.returnBook(borrowingToReturn.id);
      const fineMsg =
        Number(res.fine_amount) > 0 ? ` with fine of $${Number(res.fine_amount).toFixed(2)}` : "";
      setSuccessMessage(`Book loan #${res.borrowing_id} returned successfully${fineMsg}.`);
      setBorrowingToReturn(null);
      await Promise.all([loadBorrowingData(), loadBooks()]);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setErrorMessage(err.detail);
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Failed to process book return.");
      }
    } finally {
      setIsProcessingReturn(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 mb-1.5">
            <Library className="h-3.5 w-3.5" />
            Librarian Administration
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Library Operations Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage catalog titles, inventory copies, member borrowings, and overdue fine monitoring.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              loadBooks();
              loadBorrowingData();
            }}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Refresh Data
          </button>
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-200 hover:bg-indigo-700 transition"
          >
            <Plus className="h-4 w-4" />
            Add New Book
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-xs text-red-700 hover:text-red-900 font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.04 }}
          whileHover={{ y: -3, transition: { duration: 0.15 } }}
          className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Catalog Titles</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <BookOpen className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-slate-900">{totalUniqueBooks}</p>
          <p className="mt-1 text-xs text-slate-500">
            {totalAvailableCopies} available / {totalInventoryCopies} total copies
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.08 }}
          whileHover={{ y: -3, transition: { duration: 0.15 } }}
          className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Active Loans</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-blue-600">{activeLoansCount}</p>
          <p className="mt-1 text-xs text-slate-500">Currently in circulation</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.12 }}
          whileHover={{ y: -3, transition: { duration: 0.15 } }}
          className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Returned Books</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <RotateCcw className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-emerald-600">{returnedCount}</p>
          <p className="mt-1 text-xs text-slate-500">Completed borrowing cycles</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.16 }}
          whileHover={{ y: -3, transition: { duration: 0.15 } }}
          className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Overdue Items</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-red-600">{overdueCount}</p>
          <p className="mt-1 text-xs text-slate-500">
            Fines: <span className="font-semibold text-red-700">${totalOutstandingFines.toFixed(2)}</span>
          </p>
        </motion.div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6">
          <button
            onClick={() => setActiveTab("books")}
            className={`flex items-center gap-2 py-3 text-sm font-semibold border-b-2 transition ${
              activeTab === "books"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <BookOpen className="h-4 w-4" />
            Book Management ({totalUniqueBooks})
          </button>

          <button
            onClick={() => setActiveTab("borrowings")}
            className={`flex items-center gap-2 py-3 text-sm font-semibold border-b-2 transition ${
              activeTab === "borrowings"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <FileText className="h-4 w-4" />
            All Borrowing Records ({borrowings.length})
          </button>

          <button
            onClick={() => setActiveTab("returned")}
            className={`flex items-center gap-2 py-3 text-sm font-semibold border-b-2 transition ${
              activeTab === "returned"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <RotateCcw className="h-4 w-4" />
            Returned Books ({returnedCount})
          </button>

          <button
            onClick={() => setActiveTab("overdue")}
            className={`flex items-center gap-2 py-3 text-sm font-semibold border-b-2 transition ${
              activeTab === "overdue"
                ? "border-red-600 text-red-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <AlertTriangle className="h-4 w-4" />
            Overdue Books ({overdueCount})
          </button>
        </nav>
      </div>

      {/* Tab 1: Book Management */}
      {activeTab === "books" && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-4 rounded-2xl border border-slate-200">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search title, author, or ISBN..."
                className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:border-indigo-600 focus:outline-none"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <label className="flex items-center gap-2 text-xs text-slate-600 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={availableOnly}
                  onChange={(e) => setAvailableOnly(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                Available only
              </label>
            </div>
          </div>

          {/* Books Table */}
          {isLoadingBooks ? (
            <div className="py-16 text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-indigo-600" />
              <p className="mt-2 text-xs text-slate-500">Loading catalog books...</p>
            </div>
          ) : books.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
              <BookOpen className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-2 text-base font-bold text-slate-800">No books found</p>
              <p className="text-xs text-slate-500 mt-1">
                Try modifying your search criteria or add a new book to the library catalog.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-5 py-3.5">Book</th>
                      <th className="px-5 py-3.5">ISBN</th>
                      <th className="px-5 py-3.5">Category</th>
                      <th className="px-5 py-3.5">Publisher / Year</th>
                      <th className="px-5 py-3.5">Stock (Available / Total)</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {books.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50/70 transition">
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-900 line-clamp-1">{b.title}</p>
                          <p className="text-xs text-slate-500">{b.author}</p>
                        </td>
                        <td className="px-5 py-4 font-mono text-xs text-slate-600">{b.isbn}</td>
                        <td className="px-5 py-4">
                          <span className="inline-block rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                            {b.category || "General"}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-xs text-slate-600">
                          {b.publisher || "N/A"} {b.publication_year ? `(${b.publication_year})` : ""}
                        </td>
                        <td className="px-5 py-4 text-xs font-medium">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-semibold ${
                              b.available_copies > 0
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-red-50 text-red-700 border border-red-200"
                            }`}
                          >
                            {b.available_copies} of {b.total_copies}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenEditModal(b)}
                              title="Edit book"
                              className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 hover:text-indigo-600 transition"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setBookToDelete(b)}
                              title="Delete book"
                              className="rounded-lg p-1.5 text-slate-600 hover:bg-red-50 hover:text-red-600 transition"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: All Borrowings */}
      {activeTab === "borrowings" && (
        <div className="space-y-4">
          {isLoadingBorrowings ? (
            <div className="py-16 text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-indigo-600" />
              <p className="mt-2 text-xs text-slate-500">Loading library borrowing records...</p>
            </div>
          ) : (
            <BorrowingTable
              borrowings={borrowings}
              onReturnClick={(b) => setBorrowingToReturn(b)}
              isProcessingReturn={isProcessingReturn}
            />
          )}
        </div>
      )}

      {/* Tab 3: Returned Books */}
      {activeTab === "returned" && (
        <div className="space-y-4">
          {isLoadingBorrowings ? (
            <div className="py-16 text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-indigo-600" />
              <p className="mt-2 text-xs text-slate-500">Loading returned records...</p>
            </div>
          ) : (
            <BorrowingTable
              borrowings={borrowings.filter((b) => b.status === "RETURNED")}
              isProcessingReturn={isProcessingReturn}
            />
          )}
        </div>
      )}

      {/* Tab 4: Overdue Books */}
      {activeTab === "overdue" && (
        <div className="space-y-4">
          {isLoadingBorrowings ? (
            <div className="py-16 text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-indigo-600" />
              <p className="mt-2 text-xs text-slate-500">Loading overdue records...</p>
            </div>
          ) : (
            <OverdueTable
              overdueList={overdueList}
              onReturnClick={(b) => setBorrowingToReturn(b)}
              isProcessingReturn={isProcessingReturn}
            />
          )}
        </div>
      )}

      {/* Book Form Modal (Add / Edit) */}
      <BookFormModal
        isOpen={isBookModalOpen}
        bookToEdit={selectedBookForEdit}
        isLoading={isSubmittingBook}
        errorMessage={bookModalError}
        onClose={() => {
          setIsBookModalOpen(false);
          setSelectedBookForEdit(null);
        }}
        onSubmit={handleSaveBook}
      />

      {/* Delete Book Confirmation Modal */}
      <ConfirmationModal
        isOpen={Boolean(bookToDelete)}
        title="Confirm Book Deletion"
        description={
          bookToDelete
            ? `Are you sure you want to permanently delete "${bookToDelete.title}" (ISBN: ${bookToDelete.isbn}) from the library catalog? This action cannot be reversed.`
            : ""
        }
        confirmText="Delete Book"
        variant="danger"
        isLoading={isDeletingBook}
        onConfirm={handleDeleteBookConfirm}
        onCancel={() => setBookToDelete(null)}
      />

      {/* Process Return Confirmation Modal */}
      <ConfirmationModal
        isOpen={Boolean(borrowingToReturn)}
        title="Process Book Return"
        description={
          borrowingToReturn
            ? `Confirm receipt and check-in for loan #${borrowingToReturn.id} (${borrowingToReturn.book?.title || 'Book'}). The backend will verify loan dates and calculate any applicable overdue fines.`
            : ""
        }
        confirmText="Confirm Check-In"
        variant="primary"
        isLoading={isProcessingReturn}
        onConfirm={handleConfirmReturn}
        onCancel={() => setBorrowingToReturn(null)}
      />
    </div>
  );
}
