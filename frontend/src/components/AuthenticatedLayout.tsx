"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { Navbar } from "@/components/Navbar";
import { Sidebar } from "@/components/Sidebar";
import { BookLoader } from "@/components/3d/BookLoader";
import { LayoutDashboard, Library, History, Sparkles } from "lucide-react";

export function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-50">
        <BookLoader size="lg" label="Authenticating session..." />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const mobileNavItems = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      active: pathname === "/dashboard" || pathname === "/admin" || pathname === "/librarian",
    },
    {
      label: "Catalog",
      href: "/books",
      icon: Library,
      active: pathname.startsWith("/books"),
    },
    {
      label: "History",
      href: "/history",
      icon: History,
      active: pathname === "/history",
    },
    {
      label: "AI Assistant",
      href: "/ai",
      icon: Sparkles,
      active: pathname.startsWith("/ai"),
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <div className="flex flex-1 max-w-7xl w-full mx-auto">
        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          <Sidebar />
        </div>

        {/* Main Content Area */}
        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 pb-24 md:pb-8 overflow-y-auto">
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            {children}
          </motion.div>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Smartphones) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-lg border-t border-slate-200/80 px-2 py-1.5 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <div className="grid grid-cols-4 gap-1 items-center">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-xs transition ${
                  item.active
                    ? "text-indigo-600 font-bold bg-indigo-50/70"
                    : "text-slate-500 hover:text-slate-900 active:scale-95"
                }`}
              >
                <Icon className={`h-5 w-5 mb-0.5 ${item.active ? "text-indigo-600 stroke-[2.2]" : "text-slate-500"}`} />
                <span className="text-[10px] tracking-tight truncate max-w-full">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
export default AuthenticatedLayout;
