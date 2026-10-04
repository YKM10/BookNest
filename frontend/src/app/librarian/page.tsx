"use client";

import { AuthenticatedLayout } from "@/components/AuthenticatedLayout";
import { LibrarianDashboard } from "@/components/LibrarianDashboard";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export default function LibrarianPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <AuthenticatedLayout>
        <div className="py-24 text-center">
          <p className="text-sm text-slate-500">Loading library staff operations...</p>
        </div>
      </AuthenticatedLayout>
    );
  }

  // Frontend guard with friendly message; backend enforces authorization
  if (user && user.role !== "LIBRARIAN" && user.role !== "ADMIN") {
    return (
      <AuthenticatedLayout>
        <div className="rounded-2xl border border-red-200 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-slate-900">Access Restricted</h2>
          <p className="mt-1 text-sm text-slate-500">
            This area requires Librarian or Administrator privileges.
          </p>
          <div className="mt-6">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition"
            >
              Return to Student Dashboard
            </Link>
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <LibrarianDashboard />
    </AuthenticatedLayout>
  );
}
