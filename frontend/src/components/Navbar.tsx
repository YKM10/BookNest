"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import {
  BookOpen,
  LogIn,
  LogOut,
  User as UserIcon,
  LayoutDashboard,
  Library,
  Sparkles,
  Menu,
  X,
  History,
  Shield,
} from "lucide-react";

export function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu whenever user navigates
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-3.5 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link
          href="/"
          onClick={() => setMobileMenuOpen(false)}
          className="flex items-center gap-2.5 transition-opacity hover:opacity-90 flex-shrink-0"
        >
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-200">
            <BookOpen className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 leading-none">
              Book<span className="text-indigo-600">Nest</span>
            </span>
            <span className="text-[9px] sm:text-[10px] font-medium uppercase tracking-wider text-slate-400 mt-0.5">
              Digital Library
            </span>
          </div>
        </Link>

        {/* Center navigation (Desktop) */}
        <nav className="hidden md:flex items-center gap-1">
          <Link
            href="/books"
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
              pathname.startsWith("/books")
                ? "bg-indigo-50 text-indigo-700"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Library className="h-4 w-4" />
            Catalog
          </Link>

          <Link
            href="/ai"
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
              pathname.startsWith("/ai")
                ? "bg-purple-50 text-purple-700 font-semibold"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Sparkles className="h-4 w-4 text-purple-600" />
            AI Librarian
          </Link>

          {user && (
            <Link
              href="/dashboard"
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                pathname === "/dashboard"
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Link>
          )}
        </nav>

        {/* Right side Desktop Auth + Mobile Hamburger Button */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Desktop Auth Controls */}
          {user ? (
            <div className="hidden sm:flex items-center gap-2 sm:gap-3">
              <div className="hidden lg:flex flex-col items-end">
                <span className="text-sm font-semibold text-slate-900 leading-none">{user.name}</span>
                <span className="mt-1 inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700">
                  {user.role}
                </span>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                <UserIcon className="h-4 w-4" />
              </div>
              <button
                onClick={logout}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-red-600 hover:border-red-200"
                title="Log out"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Link
                href="/login"
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                <LogIn className="h-4 w-4" />
                Login
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-indigo-600 px-3.5 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition"
              >
                Sign Up
              </Link>
            </div>
          )}

          {/* Mobile Hamburger Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
            className="flex md:hidden h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 active:scale-95 transition"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer / Dropdown */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden border-t border-slate-200 bg-white/98 backdrop-blur-xl px-4 py-4 space-y-3 shadow-lg"
          >
            {/* User Info Bar if Logged In */}
            {user && (
              <div className="rounded-xl bg-slate-50 p-3 border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-sm shadow-sm">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 leading-none">{user.name}</p>
                    <p className="text-xs text-slate-500 mt-1">{user.email}</p>
                  </div>
                </div>
                <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-100">
                  {user.role}
                </span>
              </div>
            )}

            {/* Navigation Links */}
            <div className="space-y-1 pt-1">
              <Link
                href="/books"
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                  pathname.startsWith("/books")
                    ? "bg-indigo-50 text-indigo-700 font-semibold"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <Library className="h-4 w-4 text-indigo-600" />
                Book Catalog
              </Link>

              <Link
                href="/ai"
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                  pathname.startsWith("/ai")
                    ? "bg-purple-50 text-purple-700 font-semibold"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <Sparkles className="h-4 w-4 text-purple-600" />
                AI Librarian Hub
              </Link>

              {user ? (
                <>
                  <Link
                    href="/dashboard"
                    className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                      pathname === "/dashboard"
                        ? "bg-indigo-50 text-indigo-700 font-semibold"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <LayoutDashboard className="h-4 w-4 text-indigo-600" />
                    Dashboard
                  </Link>

                  <Link
                    href="/history"
                    className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                      pathname === "/history"
                        ? "bg-indigo-50 text-indigo-700 font-semibold"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <History className="h-4 w-4 text-indigo-600" />
                    Borrowing History
                  </Link>
                </>
              ) : (
                <div className="pt-2 grid grid-cols-2 gap-2">
                  <Link
                    href="/login"
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
                  >
                    <LogIn className="h-4 w-4" />
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 shadow-sm"
                  >
                    Register
                  </Link>
                </div>
              )}
            </div>

            {/* Logout on mobile */}
            {user && (
              <div className="pt-2 border-t border-slate-100">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-50 text-red-700 py-2.5 text-sm font-semibold hover:bg-red-100 transition"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
export default Navbar;
