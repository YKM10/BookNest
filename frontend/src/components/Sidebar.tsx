"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard,
  Library,
  History,
  LogOut,
  Shield,
  Users,
  Sparkles,
} from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const isAdmin = user?.role === "ADMIN";
  const isLibrarian = user?.role === "LIBRARIAN";

  const navItems = [
    {
      label: isAdmin
        ? "Admin Console"
        : isLibrarian
        ? "Librarian Dashboard"
        : "Student Dashboard",
      href: "/dashboard",
      icon: isAdmin ? Shield : LayoutDashboard,
      active: pathname === "/dashboard" || pathname === "/admin" || pathname === "/librarian",
    },
    {
      label: "AI Librarian",
      href: "/ai",
      icon: Sparkles,
      active: pathname.startsWith("/ai"),
    },
    {
      label: "Book Catalog",
      href: "/books",
      icon: Library,
      active: pathname.startsWith("/books"),
    },
    {
      label: isAdmin
        ? "Borrowing Circulation"
        : isLibrarian
        ? "Borrowing Records"
        : "Borrowing History",
      href: "/history",
      icon: History,
      active: pathname === "/history",
    },
  ];

  return (
    <aside className="w-64 flex-shrink-0 border-r border-slate-200 bg-white min-h-[calc(100vh-4rem)] flex flex-col justify-between p-4">
      <div className="space-y-6">
        {/* User Card */}
        {user && (
          <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 text-white font-semibold shadow-sm">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="truncate text-sm font-semibold text-slate-900">{user.name}</p>
              <p className="truncate text-xs text-slate-500">{user.email}</p>
              <span className="mt-1 inline-block text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-100/70 px-1.5 py-0.5 rounded">
                {user.role}
              </span>
            </div>
          </div>
        )}

        {/* Navigation list */}
        <div className="space-y-1">
          <p className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Library Menu
          </p>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  item.active
                    ? "bg-indigo-50 text-indigo-700 font-semibold"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon className={`h-4 w-4 ${item.active ? "text-indigo-600" : "text-slate-400"}`} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Bottom section */}
      <div className="pt-4 border-t border-slate-100">
        <button
          onClick={logout}
          className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-700 transition"
        >
          <LogOut className="h-4 w-4 text-slate-400 group-hover:text-red-600" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
