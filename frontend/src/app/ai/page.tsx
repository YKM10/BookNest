"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { api, Book, AIChatMessage, ApiError } from "@/lib/api";
import { BookLoader } from "@/components/3d/BookLoader";
import {
  Bot,
  Send,
  Sparkles,
  BookOpen,
  Search,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  User as UserIcon,
  Tag,
  ShieldCheck,
  Clock,
  Layers,
} from "lucide-react";
import { motion } from "framer-motion";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  books?: Book[];
  source?: string;
  timestamp: string;
}

export default function AILibrarianPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "intro",
      role: "assistant",
      content:
        "Welcome to the BookNest AI Librarian! I am powered by Google Gemini and connected directly to the BookNest catalog and borrowing rules.\n\n" +
        "You can ask me to:\n" +
        "• Find books matching natural descriptions (e.g. \"Find beginner Python books that are available\")\n" +
        "• Recommend literature based on topics, technologies, or genres\n" +
        "• Explain what any book in the library is about\n" +
        "• Check your current active loans, due dates, and overdue status",
      timestamp: "Just now",
      source: "gemini",
    },
  ]);

  const [inputMessage, setInputMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Quick Action Tabs / Mode
  const [activeMode, setActiveMode] = useState<"chat" | "search" | "recommend">("chat");

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [searchResults, setSearchResults] = useState<Book[]>([]);
  const [searchExplanation, setSearchExplanation] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Recommendation state
  const [preference, setPreference] = useState("");
  const [category, setCategory] = useState("");
  const [recommendations, setRecommendations] = useState<Book[]>([]);
  const [recExplanation, setRecExplanation] = useState<string | null>(null);
  const [isRecommending, setIsRecommending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending]);

  const examplePrompts = [
    "Find beginner Python books that are available.",
    "Recommend books about machine learning.",
    "Do I have any overdue books?",
    "What is the library borrowing and fine policy?",
  ];

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim() || isSending) return;

    if (!user) {
      setErrorBanner("Please sign in to converse with the AI Librarian.");
      return;
    }

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage("");
    setIsSending(true);
    setErrorBanner(null);

    try {
      const historyPayload: AIChatMessage[] = messages
        .filter((m) => m.id !== "intro")
        .slice(-8)
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      const res = await api.ai.chat({
        message: text.trim(),
        history: historyPayload,
      });

      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: res.reply,
        books: res.books,
        source: res.source,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: unknown) {
      let errStr = "Failed to communicate with AI Librarian.";
      if (err instanceof ApiError) errStr = err.detail;
      else if (err instanceof Error) errStr = err.message;

      const fallbackMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content:
          "I encountered an unexpected connection error. The BookNest catalog remains available directly through the catalog search tab.",
        source: "fallback",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
      setErrorBanner(errStr);
    } finally {
      setIsSending(false);
    }
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || isSearching) return;

    if (!user) {
      setErrorBanner("Please sign in to execute natural-language searches.");
      return;
    }

    setIsSearching(true);
    setErrorBanner(null);
    setSearchExplanation(null);

    try {
      const res = await api.ai.search({
        query: searchQuery.trim(),
        available_only: availableOnly,
      });
      setSearchResults(res.results);
      setSearchExplanation(res.explanation);
    } catch (err: unknown) {
      if (err instanceof ApiError) setErrorBanner(err.detail);
      else if (err instanceof Error) setErrorBanner(err.message);
    } finally {
      setIsSearching(false);
    }
  };

  const handleRecommendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRecommending) return;

    if (!user) {
      setErrorBanner("Please sign in to receive tailored book recommendations.");
      return;
    }

    setIsRecommending(true);
    setErrorBanner(null);
    setRecExplanation(null);

    try {
      const res = await api.ai.recommend({
        preference: preference.trim() || undefined,
        category: category.trim() || undefined,
        limit: 4,
      });
      setRecommendations(res.recommendations);
      setRecExplanation(res.explanation);
    } catch (err: unknown) {
      if (err instanceof ApiError) setErrorBanner(err.detail);
      else if (err instanceof Error) setErrorBanner(err.message);
    } finally {
      setIsRecommending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col space-y-4">
        {/* Header Banner */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-100">
              <Bot className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                  BookNest AI Librarian
                </h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-700 border border-purple-200">
                  <Sparkles className="h-3 w-3" />
                  Gemini API
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500">
                Natural-language assistance, personalized recommendations, and student borrowing oversight.
              </p>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex flex-wrap sm:inline-flex w-full sm:w-auto rounded-xl border border-slate-200 bg-white p-1 shadow-2xs text-xs font-semibold gap-1">
            <button
              onClick={() => setActiveMode("chat")}
              className={`flex-1 sm:flex-initial rounded-lg px-3 py-1.5 transition text-center ${
                activeMode === "chat" ? "bg-indigo-600 text-white shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              💬 Chat
            </button>
            <button
              onClick={() => setActiveMode("search")}
              className={`flex-1 sm:flex-initial rounded-lg px-3 py-1.5 transition text-center ${
                activeMode === "search" ? "bg-indigo-600 text-white shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              🔍 Search
            </button>
            <button
              onClick={() => setActiveMode("recommend")}
              className={`flex-1 sm:flex-initial rounded-lg px-3 py-1.5 transition text-center ${
                activeMode === "recommend" ? "bg-indigo-600 text-white shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              ✨ Recommendations
            </button>
          </div>
        </div>

        {/* Error notification */}
        {errorBanner && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs sm:text-sm text-red-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
              <span>{errorBanner}</span>
            </div>
            <button
              onClick={() => setErrorBanner(null)}
              className="text-xs text-red-700 hover:text-red-900 font-semibold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* MODE 1: Interactive Chat */}
        {activeMode === "chat" && (
          <div className="flex-1 flex flex-col rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden min-h-[550px]">
            {/* Scrollable Message History */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-slate-50/30">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "assistant" && (
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm mt-0.5">
                      <Bot className="h-5 w-5" />
                    </div>
                  )}

                  <div className="max-w-2xl space-y-3">
                    <div
                      className={`rounded-2xl px-5 py-4 text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-indigo-600 text-white shadow-sm rounded-br-xs"
                          : "bg-white text-slate-800 border border-slate-200/80 shadow-xs rounded-bl-xs"
                      }`}
                    >
                      <p className="whitespace-pre-line">{msg.content}</p>

                      <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-slate-100/30 text-[11px] opacity-70">
                        <span>{msg.timestamp}</span>
                        {msg.source && (
                          <span className="font-medium">
                            {msg.source === "gemini" ? "✨ Gemini 1.5 Flash" : "⚡ BookNest Engine"}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Inline Matched Book Cards */}
                    {msg.books && msg.books.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        {msg.books.map((b) => (
                          <div
                            key={b.id}
                            className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs hover:border-indigo-300 transition flex flex-col justify-between"
                          >
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                                {b.category || "General"}
                              </span>
                              <h4 className="font-bold text-sm text-slate-900 line-clamp-1">{b.title}</h4>
                              <p className="text-xs text-slate-500">by {b.author}</p>
                              <p className="text-[11px] text-slate-600 line-clamp-2 pt-1">{b.description}</p>
                            </div>
                            <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                              <span
                                className={`text-[11px] font-semibold ${
                                  b.available_copies > 0 ? "text-emerald-600" : "text-red-500"
                                }`}
                              >
                                {b.available_copies > 0 ? `${b.available_copies} available` : "Unavailable"}
                              </span>
                              <Link
                                href={`/books/${b.id}`}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                              >
                                View Details &rarr;
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {msg.role === "user" && (
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-600 shadow-sm mt-0.5">
                      <UserIcon className="h-5 w-5" />
                    </div>
                  )}
                </div>
              ))}

              {isSending && (
                <div className="flex items-center gap-3 text-sm text-slate-500">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <Sparkles className="h-5 w-5 animate-pulse" />
                  </div>
                  <span>AI Librarian is researching your library query...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompt Suggestions */}
            <div className="border-t border-slate-100 bg-white px-4 py-2.5 flex items-center gap-2 overflow-x-auto no-scrollbar">
              <span className="text-xs font-semibold text-slate-400 flex-shrink-0">Try asking:</span>
              {examplePrompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(p)}
                  className="whitespace-nowrap flex-shrink-0 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition"
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="border-t border-slate-100 p-4 bg-white flex items-center gap-3"
            >
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask about books, machine learning, due dates, or borrowing rules..."
                className="flex-1 rounded-xl border border-slate-300 px-3.5 sm:px-4 py-2.5 sm:py-3 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                disabled={isSending}
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || isSending}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 sm:px-5 py-2.5 sm:py-3 text-sm font-semibold text-white shadow-md shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition flex-shrink-0"
              >
                {isSending ? (
                  <Sparkles className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span className="hidden sm:inline">Send</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* MODE 2: Semantic Search */}
        {activeMode === "search" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900">Natural-Language Semantic Catalog Search</h3>
              <p className="text-xs text-slate-500">
                Type natural phrases like &quot;Find beginner Python books that are available&quot; or &quot;Books on scalable system design&quot;.
              </p>

              <form onSubmit={handleSearchSubmit} className="space-y-3">
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder='e.g. "Find beginner Python books that are available"'
                      className="w-full rounded-xl border border-slate-300 pl-4 pr-4 py-3 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!searchQuery.trim() || isSearching}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40 transition"
                  >
                    {isSearching ? <Sparkles className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    <span>AI Search</span>
                  </button>
                </div>

                <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={availableOnly}
                    onChange={(e) => setAvailableOnly(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Only return titles currently available to borrow</span>
                </label>
              </form>
            </div>

            {searchExplanation && (
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 text-sm text-indigo-900">
                <span className="font-bold">AI Librarian Synthesis: </span>
                {searchExplanation}
              </div>
            )}

            {isSearching ? (
              <div className="py-20 text-center">
                <BookLoader size="lg" label="Conducting semantic library search..." />
              </div>
            ) : searchResults.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {searchResults.map((book) => (
                  <div
                    key={book.id}
                    className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                          {book.category || "General"}
                        </span>
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            book.available_copies > 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                          }`}
                        >
                          {book.available_copies > 0 ? `${book.available_copies} available` : "Unavailable"}
                        </span>
                      </div>
                      <h4 className="font-bold text-base text-slate-900">{book.title}</h4>
                      <p className="text-xs text-slate-500 font-medium">by {book.author}</p>
                      <p className="text-xs text-slate-600 line-clamp-3 pt-1 leading-relaxed">
                        {book.description || "Part of the BookNest catalog."}
                      </p>
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-100 flex justify-between items-center">
                      <span className="text-[11px] text-slate-400 font-mono">ISBN: {book.isbn}</span>
                      <Link
                        href={`/books/${book.id}`}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                      >
                        View Title &rarr;
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              searchQuery && (
                <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500 text-sm">
                  No matching books found for your query. Try broadening your terms.
                </div>
              )
            )}
          </div>
        )}

        {/* MODE 3: Recommendations */}
        {activeMode === "recommend" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900">Personalized Reading Recommendations</h3>
              <p className="text-xs text-slate-500">
                Specify topics, technologies, or literary themes you want to explore.
              </p>

              <form onSubmit={handleRecommendSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Reading Interests
                    </label>
                    <input
                      type="text"
                      value={preference}
                      onChange={(e) => setPreference(e.target.value)}
                      placeholder='e.g. "Software architecture and design patterns"'
                      className="w-full mt-1.5 rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Category Filter (Optional)
                    </label>
                    <input
                      type="text"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="e.g. Programming, Architecture, Science"
                      className="w-full mt-1.5 rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isRecommending}
                  className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-purple-200 hover:bg-purple-700 disabled:opacity-40 transition"
                >
                  {isRecommending ? <Sparkles className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  <span>Generate Recommendations</span>
                </button>
              </form>
            </div>

            {recExplanation && (
              <div className="rounded-2xl border border-purple-100 bg-purple-50/70 p-4 text-sm text-purple-900">
                <span className="font-bold">Librarian Curation: </span>
                {recExplanation}
              </div>
            )}

            {isRecommending ? (
              <div className="py-20 text-center">
                <BookLoader size="lg" label="Curating personalized book recommendations..." />
              </div>
            ) : recommendations.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {recommendations.map((book) => (
                  <div
                    key={book.id}
                    className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                          {book.category || "Recommended"}
                        </span>
                        <span className="text-xs font-semibold text-slate-500">
                          {book.available_copies} available
                        </span>
                      </div>
                      <h4 className="font-bold text-base text-slate-900">{book.title}</h4>
                      <p className="text-xs text-slate-500 font-medium">by {book.author}</p>
                      <p className="text-xs text-slate-600 line-clamp-3 pt-1 leading-relaxed">
                        {book.description || "Part of the BookNest catalog."}
                      </p>
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-100 flex justify-between items-center">
                      <span className="text-[11px] text-slate-400 font-mono">ISBN: {book.isbn}</span>
                      <Link
                        href={`/books/${book.id}`}
                        className="text-xs font-semibold text-purple-600 hover:text-purple-800"
                      >
                        Explore Book &rarr;
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )}
      </main>
    </div>
  );
}
