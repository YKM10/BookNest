"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";

const FloatingBooksBackground = dynamic(
  () => import("@/components/3d/FloatingBooksBackground"),
  { ssr: false }
);
import {
  BookOpen,
  Search,
  ShieldCheck,
  BookmarkCheck,
  ArrowRight,
  Sparkles,
  Library,
} from "lucide-react";
import { motion } from "framer-motion";

export default function LandingPage() {
  const { user } = useAuth();

  const features = [
    {
      icon: Search,
      title: "Real-Time Catalog Search",
      description: "Search books instantly by title, author, category, or ISBN with live availability filters.",
    },
    {
      icon: BookmarkCheck,
      title: "Instant Digital Borrowing",
      description: "Borrow and return books in seconds with automated due date tracking and copy management.",
    },
    {
      icon: ShieldCheck,
      title: "Role-Based Security",
      description: "Enterprise RBAC architecture distinguishing Students, Librarians, and System Administrators.",
    },
    {
      icon: Sparkles,
      title: "Automated Fine Engine",
      description: "Fair, transparent backend fine calculation ensuring library fairness and availability.",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28">
        <FloatingBooksBackground />
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="lg:col-span-7 space-y-6 text-center lg:text-left"
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50/80 px-3.5 py-1.5 text-xs font-semibold text-indigo-700">
                <Sparkles className="h-3.5 w-3.5" />
                Modern University Digital Library
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-tight">
                Discover Knowledge with{" "}
                <span className="text-indigo-600 bg-clip-text">BookNest</span>
              </h1>

              <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                A modern digital library platform connecting students and faculty to extensive academic
                and general literature with automated borrowing, catalog search, and real-time inventory.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
                <Link
                  href="/books"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition"
                >
                  <Library className="h-5 w-5" />
                  Explore Catalog
                  <ArrowRight className="h-4 w-4" />
                </Link>

                {user ? (
                  <Link
                    href="/dashboard"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-base font-semibold text-slate-700 hover:bg-slate-50 transition"
                  >
                    Go to Dashboard
                  </Link>
                ) : (
                  <Link
                    href="/register"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-base font-semibold text-slate-700 hover:bg-slate-50 transition"
                  >
                    Create Free Account
                  </Link>
                )}
              </div>
            </motion.div>

            {/* Right Card / Graphic */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="lg:col-span-5"
            >
              <div className="relative mx-auto max-w-md rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-200/50">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Live Library Catalog</h3>
                      <p className="text-xs text-slate-500">Connected to FastAPI & PostgreSQL</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                    Online
                  </span>
                </div>

                <div className="mt-5 space-y-3.5">
                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600">
                          Programming
                        </span>
                        <h4 className="text-sm font-semibold text-slate-900">Fluent Python</h4>
                        <p className="text-xs text-slate-500">Luciano Ramalho</p>
                      </div>
                      <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                        Available
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600">
                          Architecture
                        </span>
                        <h4 className="text-sm font-semibold text-slate-900">Clean Architecture</h4>
                        <p className="text-xs text-slate-500">Robert C. Martin</p>
                      </div>
                      <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                        Available
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600">
                          Design
                        </span>
                        <h4 className="text-sm font-semibold text-slate-900">Design Patterns</h4>
                        <p className="text-xs text-slate-500">Gang of Four</p>
                      </div>
                      <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                        Available
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 text-center">
                  <Link
                    href="/books"
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition"
                  >
                    View full catalog in library &rarr;
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="bg-white py-16 border-t border-slate-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Modern Library Architecture
            </h2>
            <p className="mt-3 text-slate-600">
              Designed with robust backend consistency, strict authentication, and responsive frontend UI.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <div
                  key={i}
                  className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-6 hover:shadow-md transition hover:border-indigo-200"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 mb-4">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-900">{feature.title}</h3>
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-7xl px-4">
          <p>&copy; {new Date().getFullYear()} BookNest Digital Library System. Powered by FastAPI & Next.js.</p>
        </div>
      </footer>
    </div>
  );
}
