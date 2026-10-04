"use client";

import Link from "next/link";
import { AuthenticatedLayout } from "@/components/AuthenticatedLayout";
import { AdminDashboard } from "@/components/AdminDashboard";
import { useAuth } from "@/context/AuthContext";
import { ShieldAlert, Loader2 } from "lucide-react";

export default function AdminPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <AuthenticatedLayout>
        <div className="py-24 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-purple-600" />
          <p className="mt-2 text-sm text-slate-500">Authenticating administrator permissions...</p>
        </div>
      </AuthenticatedLayout>
    );
  }

  // Frontend guard: Students and Librarians see access restricted
  if (user && user.role !== "ADMIN") {
    return (
      <AuthenticatedLayout>
        <div className="rounded-2xl border border-red-200 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-slate-900">Administrator Access Required</h2>
          <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
            You are signed in as <span className="font-semibold text-slate-700">{user.email}</span> with role{" "}
            <span className="font-bold text-red-600">{user.role}</span>. This administrative portal is restricted to system administrators.
          </p>
          <div className="mt-6">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <AdminDashboard />
    </AuthenticatedLayout>
  );
}
