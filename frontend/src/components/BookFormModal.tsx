"use client";

import React, { useState, useEffect } from "react";
import { Book, BookCreateInput, BookUpdateInput } from "@/lib/api";
import { X, BookOpen, AlertCircle, Loader2, Save, Plus } from "lucide-react";

interface BookFormModalProps {
  isOpen: boolean;
  bookToEdit?: Book | null;
  isLoading?: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSubmit: (data: BookCreateInput | BookUpdateInput) => Promise<void>;
}

export function BookFormModal({
  isOpen,
  bookToEdit,
  isLoading = false,
  errorMessage,
  onClose,
  onSubmit,
}: BookFormModalProps) {
  const isEditing = Boolean(bookToEdit);

  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [isbn, setIsbn] = useState("");
  const [category, setCategory] = useState("");
  const [publisher, setPublisher] = useState("");
  const [publicationYear, setPublicationYear] = useState<string>("");
  const [totalCopies, setTotalCopies] = useState<number>(1);
  const [availableCopies, setAvailableCopies] = useState<number>(1);
  const [description, setDescription] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (bookToEdit) {
      setTitle(bookToEdit.title);
      setAuthor(bookToEdit.author);
      setIsbn(bookToEdit.isbn);
      setCategory(bookToEdit.category || "");
      setPublisher(bookToEdit.publisher || "");
      setPublicationYear(bookToEdit.publication_year ? String(bookToEdit.publication_year) : "");
      setTotalCopies(bookToEdit.total_copies);
      setAvailableCopies(bookToEdit.available_copies);
      setDescription(bookToEdit.description || "");
    } else {
      setTitle("");
      setAuthor("");
      setIsbn("");
      setCategory("");
      setPublisher("");
      setPublicationYear(new Date().getFullYear().toString());
      setTotalCopies(1);
      setAvailableCopies(1);
      setDescription("");
    }
    setValidationError(null);
  }, [bookToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const cleanTitle = title.trim();
    const cleanAuthor = author.trim();
    const cleanIsbn = isbn.trim();

    if (!cleanTitle) {
      setValidationError("Book title is required.");
      return;
    }
    if (!cleanAuthor) {
      setValidationError("Author is required.");
      return;
    }
    if (!cleanIsbn) {
      setValidationError("ISBN identifier is required.");
      return;
    }

    if (totalCopies < 0) {
      setValidationError("Total copies cannot be negative.");
      return;
    }

    if (availableCopies < 0) {
      setValidationError("Available copies cannot be negative.");
      return;
    }

    if (availableCopies > totalCopies) {
      setValidationError("Available copies cannot exceed total copies.");
      return;
    }

    const payload: BookCreateInput = {
      title: cleanTitle,
      author: cleanAuthor,
      isbn: cleanIsbn,
      category: category.trim() || undefined,
      publisher: publisher.trim() || undefined,
      publication_year: publicationYear ? parseInt(publicationYear, 10) : undefined,
      total_copies: Number(totalCopies),
      available_copies: Number(availableCopies),
      description: description.trim() || undefined,
    };

    await onSubmit(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl my-auto rounded-2xl bg-white p-4 sm:p-6 md:p-8 shadow-2xl border border-slate-100 max-h-[92dvh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {isEditing ? "Edit Catalog Book" : "Add New Book to Catalog"}
              </h2>
              <p className="text-xs text-slate-500">
                {isEditing
                  ? "Update title, ISBN, inventory stock, and catalog classification."
                  : "Create a new book record with inventory copies."}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error message alerts */}
        {(validationError || errorMessage) && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-800 flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
            <span>{validationError || errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Book Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Clean Architecture: A Craftsman's Guide"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Author <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="e.g. Robert C. Martin"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                ISBN <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={isbn}
                onChange={(e) => setIsbn(e.target.value)}
                placeholder="e.g. 978-0134494166"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-mono text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Category / Genre
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Software Engineering"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Publisher
              </label>
              <input
                type="text"
                value={publisher}
                onChange={(e) => setPublisher(e.target.value)}
                placeholder="e.g. Prentice Hall"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Publication Year
              </label>
              <input
                type="number"
                value={publicationYear}
                onChange={(e) => setPublicationYear(e.target.value)}
                placeholder="e.g. 2017"
                min="1000"
                max="2100"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Total Copies <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={totalCopies}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10) || 0;
                    setTotalCopies(val);
                    if (!isEditing && val < availableCopies) {
                      setAvailableCopies(val);
                    }
                  }}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Available <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  max={totalCopies}
                  value={availableCopies}
                  onChange={(e) => setAvailableCopies(parseInt(e.target.value, 10) || 0)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Description
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Comprehensive overview, topic coverage, and library notes..."
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : isEditing ? (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Create Book
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
