import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { AILibrarianWidget } from "@/components/AILibrarianWidget";

export const metadata: Metadata = {
  title: "BookNest | Digital Library",
  description: "Modern digital library application connected to FastAPI and PostgreSQL",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#4f46e5",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased font-sans">
        <AuthProvider>
          {children}
          <AILibrarianWidget />
        </AuthProvider>
      </body>
    </html>
  );
}
