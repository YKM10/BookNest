"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  api,
  User,
  SystemStats,
  AuditLogItem,
  UserUpdateAdminInput,
  ApiError,
  Book,
  Borrowing,
  BookCreateInput,
  BookUpdateInput,
} from "@/lib/api";
import { UserManagementModal } from "@/components/UserManagementModal";
import { BookFormModal } from "@/components/BookFormModal";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { BorrowingTable } from "@/components/BorrowingTable";
import { OverdueTable } from "@/components/OverdueTable";
import { BookLoader } from "@/components/3d/BookLoader";
import {
  Shield,
  Users,
  GraduationCap,
  Briefcase,
  BookOpen,
  Clock,
  RotateCcw,
  AlertTriangle,
  Search,
  Filter,
  Edit,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  Activity,
  Plus,
  DollarSign,
  ShieldCheck,
  UserCheck,
  UserX,
} from "lucide-react";

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "books" | "borrowings" | "audit">("overview");

  // System Stats
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // Users State
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [userRoleFilter, setUserRoleFilter] = useState<string>("ALL");
  const [userSearchTerm, setUserSearchTerm] = useState("");

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);

  // Books State (for Books tab)
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoadingBooks, setIsLoadingBooks] = useState(false);
  const [bookSearch, setBookSearch] = useState("");

  // Borrowings State (for Borrowings tab)
  const [borrowings, setBorrowings] = useState<Borrowing[]>([]);
  const [overdueList, setOverdueList] = useState<Borrowing[]>([]);
  const [isLoadingBorrowings, setIsLoadingBorrowings] = useState(false);

  // Modals & Notifications
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<User | null>(null);
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);
  const [userModalError, setUserModalError] = useState<string | null>(null);

  // Book Modal state
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [selectedBookForEdit, setSelectedBookForEdit] = useState<Book | null>(null);
  const [isSubmittingBook, setIsSubmittingBook] = useState(false);
  const [bookModalError, setBookModalError] = useState<string | null>(null);
  const [bookToDelete, setBookToDelete] = useState<Book | null>(null);
  const [isDeletingBook, setIsDeletingBook] = useState(false);

  // Borrowing Return Modal state
  const [borrowingToReturn, setBorrowingToReturn] = useState<Borrowing | null>(null);
  const [isProcessingReturn, setIsProcessingReturn] = useState(false);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 1. Fetch System Stats
  const loadStats = useCallback(async () => {
    setIsLoadingStats(true);
    try {
      const data = await api.admin.getStats();
      setStats(data);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setErrorMessage(err.detail);
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      }
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  // 2. Fetch Users
  const loadUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    try {
      const data = await api.admin.getUsers({
        role: userRoleFilter === "ALL" ? undefined : userRoleFilter,
        search: userSearchTerm.trim() || undefined,
      });
      setUsers(data);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setErrorMessage(err.detail);
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      }
    } finally {
      setIsLoadingUsers(false);
    }
  }, [userRoleFilter, userSearchTerm]);

  // 3. Fetch Audit Logs
  const loadAuditLogs = useCallback(async () => {
    setIsLoadingAudit(true);
    try {
      const data = await api.admin.getAuditLogs(100);
      setAuditLogs(data);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setErrorMessage(err.detail);
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      }
    } finally {
      setIsLoadingAudit(false);
    }
  }, []);

  // 4. Fetch Books
  const loadBooks = useCallback(async () => {
    setIsLoadingBooks(true);
    try {
      const data = await api.books.list({ search: bookSearch.trim() || undefined });
      setBooks(data);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setErrorMessage(err.detail);
      }
    } finally {
      setIsLoadingBooks(false);
    }
  }, [bookSearch]);

  // 5. Fetch Borrowings
  const loadBorrowings = useCallback(async () => {
    setIsLoadingBorrowings(true);
    try {
      const [hist, over] = await Promise.all([
        api.borrowings.history(),
        api.borrowings.overdue(),
      ]);
      setBorrowings(hist);
      setOverdueList(over);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setErrorMessage(err.detail);
      }
    } finally {
      setIsLoadingBorrowings(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
    loadUsers();
  }, [loadStats, loadUsers]);

  useEffect(() => {
    if (activeTab === "audit") {
      loadAuditLogs();
    } else if (activeTab === "books") {
      loadBooks();
    } else if (activeTab === "borrowings") {
      loadBorrowings();
    }
  }, [activeTab, loadAuditLogs, loadBooks, loadBorrowings]);

  // Handle User Update
  const handleUpdateUser = async (userId: number, formData: UserUpdateAdminInput) => {
    setIsUpdatingUser(true);
    setUserModalError(null);
    setSuccessMessage(null);

    try {
      const updated = await api.admin.updateUser(userId, formData);
      setSuccessMessage(`User #${updated.id} (${updated.name}) updated successfully.`);
      setSelectedUserForEdit(null);
      await Promise.all([loadUsers(), loadStats()]);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setUserModalError(err.detail);
      } else if (err instanceof Error) {
        setUserModalError(err.message);
      } else {
        setUserModalError("Failed to update user.");
      }
    } finally {
      setIsUpdatingUser(false);
    }
  };

  // Handle Book CRUD (Admin has full CRUD)
  const handleSaveBook = async (formData: BookCreateInput | BookUpdateInput) => {
    setIsSubmittingBook(true);
    setBookModalError(null);
    try {
      if (selectedBookForEdit) {
        await api.books.update(selectedBookForEdit.id, formData as BookUpdateInput);
        setSuccessMessage(`Book updated successfully.`);
      } else {
        await api.books.create(formData as BookCreateInput);
        setSuccessMessage(`New book added to catalog.`);
      }
      setIsBookModalOpen(false);
      setSelectedBookForEdit(null);
      await Promise.all([loadBooks(), loadStats()]);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setBookModalError(err.detail);
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
    try {
      await api.books.delete(bookToDelete.id);
      setSuccessMessage(`Book "${bookToDelete.title}" deleted.`);
      setBookToDelete(null);
      await Promise.all([loadBooks(), loadStats()]);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setErrorMessage(err.detail);
      }
    } finally {
      setIsDeletingBook(false);
    }
  };

  // Handle Borrowing Return
  const handleConfirmReturn = async () => {
    if (!borrowingToReturn) return;
    setIsProcessingReturn(true);
    try {
      const res = await api.borrowings.returnBook(borrowingToReturn.id);
      setSuccessMessage(`Loan #${res.borrowing_id} checked in successfully.`);
      setBorrowingToReturn(null);
      await Promise.all([loadBorrowings(), loadStats()]);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setErrorMessage(err.detail);
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
          <div className="inline-flex items-center gap-2 rounded-lg bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700 mb-1.5">
            <ShieldCheck className="h-3.5 w-3.5" />
            System Administrator Console
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Library Administration & Governance
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Monitor system-wide metrics, oversee registered users, audit permissions, and inspect catalog operations.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              loadStats();
              loadUsers();
              if (activeTab === "audit") loadAuditLogs();
              if (activeTab === "books") loadBooks();
              if (activeTab === "borrowings") loadBorrowings();
            }}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Refresh Data
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

      {/* System Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.04 }}
          whileHover={{ y: -3, transition: { duration: 0.15 } }}
          className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Users</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-slate-900">{stats?.total_users ?? "—"}</p>
          <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500">
            <span className="font-semibold text-indigo-600">{stats?.total_students ?? 0} Students</span>
            <span>•</span>
            <span className="font-semibold text-purple-600">{stats?.total_librarians ?? 0} Librarians</span>
            <span>•</span>
            <span className="font-semibold text-slate-700">{stats?.total_admins ?? 0} Admins</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.08 }}
          whileHover={{ y: -3, transition: { duration: 0.15 } }}
          className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Catalog Volume</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <BookOpen className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-blue-600">{stats?.total_books ?? "—"}</p>
          <p className="mt-1 text-xs text-slate-500">
            {stats?.total_available_copies ?? 0} available of {stats?.total_inventory_copies ?? 0} total copies
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.12 }}
          whileHover={{ y: -3, transition: { duration: 0.15 } }}
          className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Circulation History</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <RotateCcw className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-emerald-600">{stats?.total_borrowings ?? "—"}</p>
          <p className="mt-1 text-xs text-slate-500">
            {stats?.active_borrowings ?? 0} active loans • {stats?.returned_borrowings ?? 0} returned
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.16 }}
          whileHover={{ y: -3, transition: { duration: 0.15 } }}
          className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Overdue & Fines</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-red-600">{stats?.overdue_borrowings ?? 0}</p>
          <p className="mt-1 text-xs text-slate-500">
            Accrued fines: <span className="font-bold text-red-700">${Number(stats?.total_fines_accrued ?? 0).toFixed(2)}</span>
          </p>
        </motion.div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6">
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-2 py-3 text-sm font-semibold border-b-2 transition ${
              activeTab === "overview"
                ? "border-purple-600 text-purple-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Activity className="h-4 w-4" />
            System Overview
          </button>

          <button
            onClick={() => setActiveTab("users")}
            className={`flex items-center gap-2 py-3 text-sm font-semibold border-b-2 transition ${
              activeTab === "users"
                ? "border-purple-600 text-purple-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Users className="h-4 w-4" />
            Users Management ({users.length})
          </button>

          <button
            onClick={() => setActiveTab("books")}
            className={`flex items-center gap-2 py-3 text-sm font-semibold border-b-2 transition ${
              activeTab === "books"
                ? "border-purple-600 text-purple-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <BookOpen className="h-4 w-4" />
            Book Catalog
          </button>

          <button
            onClick={() => setActiveTab("borrowings")}
            className={`flex items-center gap-2 py-3 text-sm font-semibold border-b-2 transition ${
              activeTab === "borrowings"
                ? "border-purple-600 text-purple-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Clock className="h-4 w-4" />
            Borrowing Records
          </button>

          <button
            onClick={() => setActiveTab("audit")}
            className={`flex items-center gap-2 py-3 text-sm font-semibold border-b-2 transition ${
              activeTab === "audit"
                ? "border-purple-600 text-purple-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <FileText className="h-4 w-4" />
            Audit Logs
          </button>
        </nav>
      </div>

      {/* Tab 1: Overview Dashboard */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Distribution Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-600" />
              User Role Demographics
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">Students</p>
                    <p className="text-xs text-slate-500">Standard library patrons & readers</p>
                  </div>
                </div>
                <span className="text-lg font-extrabold text-indigo-700">{stats?.total_students ?? 0}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                    <Briefcase className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">Librarians</p>
                    <p className="text-xs text-slate-500">Catalog editors & circulation staff</p>
                  </div>
                </div>
                <span className="text-lg font-extrabold text-blue-700">{stats?.total_librarians ?? 0}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100 text-purple-700">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">Administrators</p>
                    <p className="text-xs text-slate-500">System governance & user management</p>
                  </div>
                </div>
                <span className="text-lg font-extrabold text-purple-700">{stats?.total_admins ?? 0}</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setActiveTab("users")}
                className="w-full text-center text-xs font-semibold text-indigo-600 hover:text-indigo-800 py-2 rounded-xl bg-indigo-50/50 hover:bg-indigo-50 transition"
              >
                Inspect User Directory &rarr;
              </button>
            </div>
          </div>

          {/* Quick Health & Inventory Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              System Governance Summary
            </h3>
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500">Total Unique Titles</p>
                  <p className="text-lg font-extrabold text-slate-900">{stats?.total_books ?? 0} Books</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Inventory Stock</p>
                  <p className="text-lg font-extrabold text-slate-900">{stats?.total_inventory_copies ?? 0} Copies</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Available</p>
                  <p className="text-lg font-extrabold text-emerald-600">{stats?.total_available_copies ?? 0} Copies</p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500">Lifetime Borrowings</p>
                  <p className="text-lg font-extrabold text-slate-900">{stats?.total_borrowings ?? 0} Loans</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Active Borrowed</p>
                  <p className="text-lg font-extrabold text-blue-600">{stats?.active_borrowings ?? 0}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Overdue Loans</p>
                  <p className="text-lg font-extrabold text-red-600">{stats?.overdue_borrowings ?? 0}</p>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setActiveTab("audit")}
                className="w-full text-center text-xs font-semibold text-purple-600 hover:text-purple-800 py-2 rounded-xl bg-purple-50/50 hover:bg-purple-50 transition"
              >
                View System Audit Logs &rarr;
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Users Management */}
      {activeTab === "users" && (
        <div className="space-y-4">
          {/* Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-4 rounded-2xl border border-slate-200">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                placeholder="Search user name or email..."
                className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Role:</span>
              {(["ALL", "STUDENT", "LIBRARIAN", "ADMIN"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setUserRoleFilter(r)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                    userRoleFilter === r
                      ? "bg-purple-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {r === "ALL" ? "All Users" : r}
                </button>
              ))}
            </div>
          </div>

          {/* Users Table */}
          {isLoadingUsers ? (
            <div className="py-16 text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-purple-600" />
              <p className="mt-2 text-xs text-slate-500">Loading user accounts...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
              <Users className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-2 text-base font-bold text-slate-800">No users found</p>
              <p className="text-xs text-slate-500 mt-1">
                Try modifying your search or role filter criteria.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-5 py-3.5">User</th>
                      <th className="px-5 py-3.5">Email</th>
                      <th className="px-5 py-3.5">Role</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5">Registered On</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {users.map((u) => {
                      const isStudent = u.role === "STUDENT";
                      const isLibrarian = u.role === "LIBRARIAN";
                      const isAdmin = u.role === "ADMIN";

                      return (
                        <tr key={u.id} className="hover:bg-slate-50/70 transition">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div
                                className={`flex h-9 w-9 items-center justify-center rounded-xl font-bold text-xs ${
                                  isAdmin
                                    ? "bg-purple-100 text-purple-700"
                                    : isLibrarian
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-indigo-100 text-indigo-700"
                                }`}
                              >
                                {u.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-semibold text-slate-900">{u.name}</p>
                                <p className="text-[11px] font-mono text-slate-400">ID #{u.id}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 font-mono text-xs text-slate-600">{u.email}</td>
                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold ${
                                isAdmin
                                  ? "bg-purple-100 text-purple-700"
                                  : isLibrarian
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-indigo-50 text-indigo-700"
                              }`}
                            >
                              {isAdmin && <Shield className="h-3 w-3" />}
                              {isLibrarian && <Briefcase className="h-3 w-3" />}
                              {isStudent && <GraduationCap className="h-3 w-3" />}
                              {u.role}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-xs">
                            {u.is_active ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700 border border-emerald-200">
                                <UserCheck className="h-3 w-3" />
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 font-semibold text-red-700 border border-red-200">
                                <UserX className="h-3 w-3" />
                                Deactivated
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-xs text-slate-500">
                            {new Date(u.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <button
                              onClick={() => {
                                setUserModalError(null);
                                setSelectedUserForEdit(u);
                              }}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200 transition"
                            >
                              <Edit className="h-3.5 w-3.5" />
                              Manage
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Books Management */}
      {activeTab === "books" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-4 rounded-2xl border border-slate-200">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={bookSearch}
                onChange={(e) => setBookSearch(e.target.value)}
                placeholder="Search catalog books..."
                className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none"
              />
            </div>

            <button
              onClick={() => {
                setSelectedBookForEdit(null);
                setBookModalError(null);
                setIsBookModalOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-purple-700 transition"
            >
              <Plus className="h-4 w-4" />
              Add New Book
            </button>
          </div>

          {isLoadingBooks ? (
            <div className="py-16 text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-purple-600" />
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-5 py-3.5">Title & Author</th>
                      <th className="px-5 py-3.5">ISBN</th>
                      <th className="px-5 py-3.5">Category</th>
                      <th className="px-5 py-3.5">Inventory Stock</th>
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
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                            {b.category || "General"}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-xs font-medium">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-semibold ${
                              b.available_copies > 0
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-red-50 text-red-700 border border-red-200"
                            }`}
                          >
                            {b.available_copies} of {b.total_copies} available
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setSelectedBookForEdit(b);
                                setBookModalError(null);
                                setIsBookModalOpen(true);
                              }}
                              className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 hover:text-purple-600 transition"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setBookToDelete(b)}
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

      {/* Tab 4: Circulation & Borrowings */}
      {activeTab === "borrowings" && (
        <div className="space-y-6">
          {isLoadingBorrowings ? (
            <div className="py-16 text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-purple-600" />
            </div>
          ) : (
            <>
              {overdueList.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-red-700 uppercase tracking-wider">Overdue Alerts</h3>
                  <OverdueTable
                    overdueList={overdueList}
                    onReturnClick={(b) => setBorrowingToReturn(b)}
                    isProcessingReturn={isProcessingReturn}
                  />
                </div>
              )}

              <div className="space-y-2">
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">All Library Borrowings</h3>
                <BorrowingTable
                  borrowings={borrowings}
                  onReturnClick={(b) => setBorrowingToReturn(b)}
                  isProcessingReturn={isProcessingReturn}
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab 5: Audit Information */}
      {activeTab === "audit" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Security & Action Audit Logs</h3>
              <p className="text-xs text-slate-500">Immutable ledger of administrative mutations and changes.</p>
            </div>
            <button
              onClick={loadAuditLogs}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Refresh Logs
            </button>
          </div>

          {isLoadingAudit ? (
            <div className="py-16 text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-purple-600" />
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
              <FileText className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-2 text-base font-bold text-slate-800">No audit logs recorded</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-5 py-3.5">Log ID</th>
                      <th className="px-5 py-3.5">Action</th>
                      <th className="px-5 py-3.5">Entity</th>
                      <th className="px-5 py-3.5">Description</th>
                      <th className="px-5 py-3.5">Admin ID</th>
                      <th className="px-5 py-3.5">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/70 transition font-mono text-xs">
                        <td className="px-5 py-3.5 text-slate-400">#{log.id}</td>
                        <td className="px-5 py-3.5 font-bold text-purple-700">{log.action}</td>
                        <td className="px-5 py-3.5 text-slate-600">
                          {log.entity_type} {log.entity_id ? `(${log.entity_id})` : ""}
                        </td>
                        <td className="px-5 py-3.5 font-sans text-xs text-slate-700">{log.description || "—"}</td>
                        <td className="px-5 py-3.5 text-slate-500">
                          {log.user_id ? `Admin #${log.user_id}` : "System"}
                        </td>
                        <td className="px-5 py-3.5 font-sans text-xs text-slate-400">
                          {new Date(log.created_at).toLocaleString()}
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

      {/* User Management Modal */}
      <UserManagementModal
        isOpen={Boolean(selectedUserForEdit)}
        user={selectedUserForEdit}
        isLoading={isUpdatingUser}
        errorMessage={userModalError}
        onClose={() => setSelectedUserForEdit(null)}
        onSubmit={handleUpdateUser}
      />

      {/* Book Form Modal */}
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

      {/* Delete Book Modal */}
      <ConfirmationModal
        isOpen={Boolean(bookToDelete)}
        title="Confirm Book Deletion"
        description={
          bookToDelete
            ? `Are you sure you want to delete "${bookToDelete.title}" (ISBN: ${bookToDelete.isbn})? This action cannot be reversed.`
            : ""
        }
        confirmText="Delete Book"
        variant="danger"
        isLoading={isDeletingBook}
        onConfirm={handleDeleteBookConfirm}
        onCancel={() => setBookToDelete(null)}
      />

      {/* Process Return Modal */}
      <ConfirmationModal
        isOpen={Boolean(borrowingToReturn)}
        title="Process Book Return"
        description={
          borrowingToReturn
            ? `Confirm check-in of loan #${borrowingToReturn.id} (${borrowingToReturn.book?.title || 'Book'}).`
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
