"use client";

import React from "react";
import { Borrowing } from "@/lib/api";
import { Calendar, RotateCcw, AlertTriangle, CheckCircle2, Clock } from "lucide-react";

interface BorrowingTableProps {
  borrowings: Borrowing[];
  onReturnClick?: (borrowing: Borrowing) => void;
  isProcessingReturn?: boolean;
}

export function BorrowingTable({
  borrowings,
  onReturnClick,
  isProcessingReturn = false,
}: BorrowingTableProps) {
  if (borrowings.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-medium text-slate-500">No borrowing records found for this view.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-[650px] w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-5 py-3.5">ID</th>
              <th className="px-5 py-3.5">Book Title</th>
              <th className="px-5 py-3.5">Borrower (User ID)</th>
              <th className="px-5 py-3.5">Borrowed On</th>
              <th className="px-5 py-3.5">Due Date</th>
              <th className="px-5 py-3.5">Status</th>
              <th className="px-5 py-3.5">Fine</th>
              <th className="px-5 py-3.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {borrowings.map((b) => {
              const fineVal = Number(b.fine_amount || 0);
              const isActive = b.status === "BORROWED" || b.status === "OVERDUE";

              return (
                <tr key={b.id} className="hover:bg-slate-50/70 transition">
                  <td className="px-5 py-4 font-mono text-xs text-slate-500">#{b.id}</td>
                  <td className="px-5 py-4">
                    <p className="font-semibold text-slate-900 line-clamp-1">
                      {b.book?.title || `Book #${b.book_id}`}
                    </p>
                    <p className="text-xs text-slate-400 font-mono">ISBN: {b.book?.isbn || "N/A"}</p>
                  </td>
                  <td className="px-5 py-4 text-xs font-medium text-slate-700">
                    <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 font-mono text-slate-700">
                      User #{b.user_id}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      {new Date(b.borrowed_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      {new Date(b.due_date).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-xs">
                    {b.status === "RETURNED" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 font-semibold text-slate-700">
                        <CheckCircle2 className="h-3 w-3 text-slate-500" />
                        Returned
                      </span>
                    ) : b.status === "OVERDUE" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 font-semibold text-red-700">
                        <AlertTriangle className="h-3 w-3 text-red-600" />
                        Overdue
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 font-semibold text-emerald-700">
                        <Clock className="h-3 w-3 text-emerald-600" />
                        Active Loan
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-xs font-semibold">
                    {fineVal > 0 ? (
                      <span className="text-red-600 font-bold">${fineVal.toFixed(2)}</span>
                    ) : (
                      <span className="text-slate-400">$0.00</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right text-xs">
                    {isActive && onReturnClick ? (
                      <button
                        onClick={() => onReturnClick(b)}
                        disabled={isProcessingReturn}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 disabled:opacity-50 transition"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Process Return
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Completed</span>
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
