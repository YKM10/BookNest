"use client";

import React, { useState, useEffect } from "react";
import { User, UserUpdateAdminInput } from "@/lib/api";
import { X, Shield, AlertCircle, Loader2, Save } from "lucide-react";

interface UserManagementModalProps {
  isOpen: boolean;
  user: User | null;
  isLoading?: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSubmit: (userId: number, data: UserUpdateAdminInput) => Promise<void>;
}

export function UserManagementModal({
  isOpen,
  user,
  isLoading = false,
  errorMessage,
  onClose,
  onSubmit,
}: UserManagementModalProps) {
  const [name, setName] = useState("");
  const [role, setRole] = useState<"STUDENT" | "LIBRARIAN" | "ADMIN">("STUDENT");
  const [isActive, setIsActive] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setRole(user.role);
      setIsActive(user.is_active);
    }
    setValidationError(null);
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const cleanName = name.trim();
    if (!cleanName) {
      setValidationError("User name cannot be empty.");
      return;
    }

    const payload: UserUpdateAdminInput = {
      name: cleanName,
      role,
      is_active: isActive,
    };

    await onSubmit(user.id, payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Manage User Account</h3>
              <p className="text-xs text-slate-500 font-mono">User ID: #{user.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error message */}
        {(validationError || errorMessage) && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-800 flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
            <span>{validationError || errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Email Address (Immutable)
            </label>
            <input
              type="text"
              disabled
              value={user.email}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-mono text-slate-500 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Assigned Security Role <span className="text-red-500">*</span>
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "STUDENT" | "LIBRARIAN" | "ADMIN")}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none"
            >
              <option value="STUDENT">STUDENT — Regular borrowing and catalog searching</option>
              <option value="LIBRARIAN">LIBRARIAN — Book management and loan check-ins</option>
              <option value="ADMIN">ADMIN — Full system governance and user administration</option>
            </select>
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs font-semibold text-slate-700">
                Active Account Status (Uncheck to suspend/deactivate user)
              </span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving Changes...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save User
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
