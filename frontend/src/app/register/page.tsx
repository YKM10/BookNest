"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { BookOpen, AlertCircle, Loader2, Lock, Mail, User, ShieldCheck, ArrowRight } from "lucide-react";
import { ApiError } from "@/lib/api";

export default function RegisterPage() {
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters long.");
      return;
    }

    setIsSubmitting(true);
    try {
      await register(name, email, password);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setErrorMessage(err.detail);
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Registration failed. Please check your information and try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="flex justify-center items-center gap-2 mb-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-200">
            <BookOpen className="h-6 w-6" />
          </div>
          <span className="text-2xl font-extrabold tracking-tight text-slate-900">
            Book<span className="text-indigo-600">Nest</span>
          </span>
        </Link>
        <h2 className="text-center text-2xl font-bold tracking-tight text-slate-900">
          Create student account
        </h2>
        <p className="mt-1 text-center text-sm text-slate-500">
          Join the university library to explore and borrow titles
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="rounded-2xl border border-slate-200/80 bg-white py-8 px-6 shadow-xl shadow-slate-200/50 sm:px-10">
          {/* Security rule notice */}
          <div className="mb-6 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3.5 text-xs text-indigo-800 flex items-center gap-2.5">
            <ShieldCheck className="h-4 w-4 text-indigo-600 flex-shrink-0" />
            <span>Default role is automatically set to <strong>STUDENT</strong> per library security policy.</span>
          </div>

          {errorMessage && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Registration error: </span>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-semibold text-slate-700">
                Full Name
              </label>
              <div className="relative mt-1.5 rounded-lg shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <User className="h-4 w-4" />
                </div>
                <input
                  id="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Student"
                  className="block w-full rounded-lg border border-slate-300 pl-10 pr-3 py-2.5 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-slate-700">
                Email address
              </label>
              <div className="relative mt-1.5 rounded-lg shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane.student@example.com"
                  className="block w-full rounded-lg border border-slate-300 pl-10 pr-3 py-2.5 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-slate-700">
                Password (min 6 characters)
              </label>
              <div className="relative mt-1.5 rounded-lg shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full rounded-lg border border-slate-300 pl-10 pr-3 py-2.5 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 flex justify-center items-center gap-2 rounded-xl bg-indigo-600 py-3 px-4 text-sm font-semibold text-white shadow-md shadow-indigo-200 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-70 transition"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  Complete Registration
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-5 text-center text-sm text-slate-600">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-indigo-600 hover:text-indigo-800 transition">
              Sign in instead
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
