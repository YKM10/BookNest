"use client";

import React from "react";
import { Borrowing } from "@/lib/api";
import { AlertTriangle, Calendar, RotateCcw, DollarSign } from "lucide-react";

interface OverdueTableProps {
  overdueList: Borrowing[];
  onReturnClick?: (borrowing: Borrowing) => void;
  isProcessingReturn?: boolean;
}

export function OverdueTable({
  overdueList,
  onReturnClick,
  isProcessingReturn = false,
}: OverdueTableProps) {
  if (overdueList.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
          <Calendar className="h-6 w-6" />
        </div>
        <p className="mt-3 text-base font-bold text-slate-900">No Overdue Books</p>
        <p className="mt-1 text-xs text-slate-500">All borrowed titles are currently within their active loan periods.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-red-200 bg-white shadow-sm">
      <div className="bg-red-50/70 px-5 py-3 border-b border-red-100 flex items-center justify-between">
        <div className="flex items-center gap-2 text-red-800 font-bold text-sm">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <span>{overdueList.length} Overdue Book{overdueList.length > 1 ? "s" : ""} Requiring Attention</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-5 py-3.5">Loan ID</th>
              <th className="px-5 py-3.5">Book Title</th>
              <th className="px-5 py-3.5">Borrower</th>
              <th className="px-5 py-3.5">Due Date</th>
              <th className="px-5 py-3.5">Accrued Fine</th>
              <th className="px-5 py-3.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {overdueList.map((b) => {
              const fine = Number(b.fine_amount || 0);

              return (
                <tr key={b.id} className="hover:bg-red-50/40 transition">
                  <td className="px-5 py-4 font-mono text-xs text-slate-500">#{b.id}</td>
                  <td className="px-5 py-4">
                    <p className="font-semibold text-slate-900 line-clamp-1">
                      {b.book?.title || `Book #${b.book_id}`}
                    </p>
                    <p className="text-xs text-slate-400 font-mono">ISBN: {b.book?.isbn || "N/A"}</p>
                  </td>
                  <td className="px-5 py-4 text-xs font-medium text-slate-700">
                    <span className="inline-flex items-center rounded bg-slate-100 px-2 py-0.5 font-mono text-slate-700">
                      User #{b.user_id}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-xs text-red-700 font-medium">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-red-500" />
                      {new Date(b.due_date).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-xs font-bold text-red-700">
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-3.5 w-3.5 text-red-600" />
                      {fine.toFixed(2)}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right text-xs">
                    {onReturnClick && (
                      <button
                        onClick={() => onReturnClick(b)}
                        disabled={isProcessingReturn}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-50 transition"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Assess & Return
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
