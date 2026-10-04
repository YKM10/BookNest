"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { api, Book, AIChatMessage, ApiError } from "@/lib/api";
import {
  Sparkles,
  X,
  Send,
  Loader2,
  Bot,
  User as UserIcon,
  BookOpen,
  ArrowRight,
  RotateCcw,
  Search,
  ThumbsUp,
  Tag,
  AlertCircle,
  Minimize2,
  Maximize2,
} from "lucide-react";

interface ChatEntry {
  id: string;
  role: "user" | "assistant";
  content: string;
  books?: Book[];
  source?: string;
  timestamp: string;
}

interface AILibrarianWidgetProps {
  initialBookId?: number;
  initialQuery?: string;
}

export function AILibrarianWidget({ initialBookId, initialQuery }: AILibrarianWidgetProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "search" | "recommend">("chat");

  // Chat State
  const [messages, setMessages] = useState<ChatEntry[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hello! I am your BookNest AI Librarian powered by Gemini. You can ask me to find books, explain complex topics, check your borrowing records, or recommend your next great read!",
      timestamp: "Just now",
      source: "gemini",
    },
  ]);
  const [inputMessage, setInputMessage] = useState(initialQuery || "");
  const [isSending, setIsSending] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [searchResults, setSearchResults] = useState<Book[]>([]);
  const [searchExplanation, setSearchExplanation] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Recommend State
  const [recPreference, setRecPreference] = useState("");
  const [recCategory, setRecCategory] = useState("");
  const [recResults, setRecResults] = useState<Book[]>([]);
  const [recExplanation, setRecExplanation] = useState<string | null>(null);
  const [isRecommending, setIsRecommending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Suggested prompt pills
  const samplePrompts = [
    "Find beginner Python books that are available",
    "Recommend books about machine learning",
    "Do I have any overdue books or fines?",
    "What is BookNest's borrowing duration policy?",
  ];

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim() || isSending) return;

    if (!user) {
      setErrorBanner("Please sign in to interact with the AI Librarian.");
      return;
    }

    const userEntry: ChatEntry = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text.trim(),
      timestamp: "Just now",
    };

    setMessages((prev) => [...prev, userEntry]);
    setInputMessage("");
    setIsSending(true);
    setErrorBanner(null);

    try {
      // Build conversation history format
      const historyPayload: AIChatMessage[] = messages
        .filter((m) => m.id !== "welcome")
        .slice(-6)
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      const response = await api.ai.chat({
        message: text.trim(),
        history: historyPayload,
        book_id: initialBookId,
      });

      const assistantEntry: ChatEntry = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: response.reply,
        books: response.books,
        source: response.source,
        timestamp: "Just now",
      };

      setMessages((prev) => [...prev, assistantEntry]);
    } catch (err: unknown) {
      let msg = "Failed to communicate with AI Librarian.";
      if (err instanceof ApiError) msg = err.detail;
      else if (err instanceof Error) msg = err.message;

      const fallbackEntry: ChatEntry = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content:
          "I experienced a momentary connection issue. You can still browse our catalog directly or ask about borrowing rules.",
        timestamp: "Just now",
        source: "fallback",
      };
      setMessages((prev) => [...prev, fallbackEntry]);
      setErrorBanner(msg);
    } finally {
      setIsSending(false);
    }
  };

  const handleRunSearch = async () => {
    if (!searchQuery.trim() || isSearching) return;
    if (!user) {
      setErrorBanner("Please sign in to execute AI semantic searches.");
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

  const handleRunRecommend = async () => {
    if (isRecommending) return;
    if (!user) {
      setErrorBanner("Please sign in to receive tailored recommendations.");
      return;
    }

    setIsRecommending(true);
    setErrorBanner(null);
    setRecExplanation(null);

    try {
      const res = await api.ai.recommend({
        preference: recPreference.trim() || undefined,
        category: recCategory.trim() || undefined,
        limit: 4,
      });
      setRecResults(res.recommendations);
      setRecExplanation(res.explanation);
    } catch (err: unknown) {
      if (err instanceof ApiError) setErrorBanner(err.detail);
      else if (err instanceof Error) setErrorBanner(err.message);
    } finally {
      setIsRecommending(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <motion.button
          onClick={() => setIsOpen((prev) => !prev)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white shadow-xl shadow-indigo-300 transition focus:outline-none focus:ring-4 focus:ring-indigo-300"
          title="Ask AI Librarian"
        >
          {isOpen ? <X className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
          {!isOpen && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-indigo-500 border-2 border-white" />
            </span>
          )}
        </motion.button>
      </div>

      {/* Floating Drawer / Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-4 sm:right-6 z-50 flex h-[620px] max-h-[85vh] w-[95vw] sm:w-[480px] flex-col rounded-3xl border border-slate-200/80 bg-white shadow-2xl overflow-hidden backdrop-blur-md"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 p-4 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm text-white">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm leading-none">AI Librarian</h3>
                    <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold text-white/90">
                      Gemini
                    </span>
                  </div>
                  <p className="text-[11px] text-indigo-100 mt-1">BookNest Digital Assistant</p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setMessages([
                      {
                        id: "welcome",
                        role: "assistant",
                        content:
                          "Chat reset! What literature, borrowing question, or catalog search can I assist you with?",
                        timestamp: "Just now",
                      },
                    ]);
                  }}
                  className="rounded-lg p-1.5 text-indigo-100 hover:bg-white/10 transition"
                  title="Reset Conversation"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg p-1.5 text-indigo-100 hover:bg-white/10 transition"
                  title="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Navigation Tabs inside Widget */}
            <div className="flex border-b border-slate-100 bg-slate-50/75 text-xs font-semibold text-slate-600">
              <button
                onClick={() => setActiveTab("chat")}
                className={`flex-1 py-2.5 text-center transition ${
                  activeTab === "chat"
                    ? "border-b-2 border-indigo-600 bg-white font-bold text-indigo-700"
                    : "hover:bg-slate-100"
                }`}
              >
                💬 Chat & Q&A
              </button>
              <button
                onClick={() => setActiveTab("search")}
                className={`flex-1 py-2.5 text-center transition ${
                  activeTab === "search"
                    ? "border-b-2 border-indigo-600 bg-white font-bold text-indigo-700"
                    : "hover:bg-slate-100"
                }`}
              >
                🔍 Natural Search
              </button>
              <button
                onClick={() => setActiveTab("recommend")}
                className={`flex-1 py-2.5 text-center transition ${
                  activeTab === "recommend"
                    ? "border-b-2 border-indigo-600 bg-white font-bold text-indigo-700"
                    : "hover:bg-slate-100"
                }`}
              >
                ✨ Recommend
              </button>
            </div>

            {/* Error Banner */}
            {errorBanner && (
              <div className="flex items-center justify-between border-b border-red-100 bg-red-50 px-4 py-2 text-xs text-red-700">
                <div className="flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate">{errorBanner}</span>
                </div>
                <button onClick={() => setErrorBanner(null)} className="font-bold ml-2">
                  ×
                </button>
              </div>
            )}

            {/* TAB 1: Chat Content */}
            {activeTab === "chat" && (
              <div className="flex flex-1 flex-col overflow-hidden">
                {/* Message Scroll Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/40">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      {msg.role === "assistant" && (
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
                          <Bot className="h-4 w-4" />
                        </div>
                      )}

                      <div className="max-w-[82%] space-y-2">
                        <div
                          className={`rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed ${
                            msg.role === "user"
                              ? "bg-indigo-600 text-white shadow-xs rounded-br-xs"
                              : "bg-white text-slate-800 border border-slate-200/80 shadow-xs rounded-bl-xs"
                          }`}
                        >
                          <p className="whitespace-pre-line">{msg.content}</p>

                          {msg.source && (
                            <span className="mt-2 block text-[10px] font-medium opacity-60 text-right">
                              {msg.source === "gemini" ? "✨ Gemini AI" : "⚡ Catalog System"}
                            </span>
                          )}
                        </div>

                        {/* Inline Book Cards if returned */}
                        {msg.books && msg.books.length > 0 && (
                          <div className="space-y-1.5 pt-1">
                            {msg.books.map((b) => (
                              <div
                                key={b.id}
                                className="flex items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-white p-2.5 shadow-2xs hover:border-indigo-200 transition"
                              >
                                <div className="overflow-hidden">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                                    {b.category || "General"}
                                  </span>
                                  <h5 className="truncate text-xs font-bold text-slate-900">{b.title}</h5>
                                  <p className="truncate text-[11px] text-slate-500">by {b.author}</p>
                                </div>
                                <Link
                                  href={`/books/${b.id}`}
                                  onClick={() => setIsOpen(false)}
                                  className="flex-shrink-0 inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100 transition"
                                >
                                  View
                                  <ArrowRight className="h-3 w-3" />
                                </Link>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {msg.role === "user" && (
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-600">
                          <UserIcon className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                  ))}

                  {isSending && (
                    <div className="flex items-center gap-2 text-xs text-slate-500 italic">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      </div>
                      <span>AI Librarian is researching catalog...</span>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Prompt suggestions pills */}
                <div className="border-t border-slate-100 bg-white px-3 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  {samplePrompts.map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(p)}
                      className="whitespace-nowrap flex-shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition"
                    >
                      {p}
                    </button>
                  ))}
                </div>

                {/* Input form */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="border-t border-slate-100 p-3 bg-white flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Ask about books, borrowing, or due dates..."
                    className="flex-1 rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                    disabled={isSending}
                  />
                  <button
                    type="submit"
                    disabled={!inputMessage.trim() || isSending}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition flex-shrink-0"
                  >
                    {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                </form>
              </div>
            )}

            {/* TAB 2: Semantic Search */}
            {activeTab === "search" && (
              <div className="flex flex-1 flex-col overflow-hidden p-4 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Natural-Language Query
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder='e.g. "Find beginner Python books that are available"'
                      className="flex-1 rounded-xl border border-slate-300 px-3.5 py-2 text-xs sm:text-sm text-slate-900 focus:border-indigo-600 focus:outline-none"
                    />
                    <button
                      onClick={handleRunSearch}
                      disabled={!searchQuery.trim() || isSearching}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-40"
                    >
                      {isSearching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                      Search
                    </button>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={availableOnly}
                      onChange={(e) => setAvailableOnly(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 h-3.5 w-3.5"
                    />
                    Only show books currently available to borrow
                  </label>
                </div>

                {searchExplanation && (
                  <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 text-xs text-indigo-900 leading-relaxed">
                    <span className="font-bold">AI Insight: </span>
                    {searchExplanation}
                  </div>
                )}

                <div className="flex-1 overflow-y-auto space-y-2">
                  {searchResults.length === 0 && !isSearching ? (
                    <div className="py-12 text-center text-xs text-slate-400">
                      Enter a natural phrase to find matching books in the catalog.
                    </div>
                  ) : (
                    searchResults.map((b) => (
                      <div
                        key={b.id}
                        className="rounded-xl border border-slate-200/80 bg-white p-3 hover:border-indigo-200 transition space-y-1.5 shadow-2xs"
                      >
                        <div className="flex justify-between items-start">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                            {b.category || "General"}
                          </span>
                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                              b.available_copies > 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                            }`}
                          >
                            {b.available_copies > 0 ? `${b.available_copies} available` : "Checked out"}
                          </span>
                        </div>
                        <h4 className="font-bold text-xs text-slate-900">{b.title}</h4>
                        <p className="text-[11px] text-slate-500">by {b.author}</p>
                        <div className="pt-2 flex justify-end">
                          <Link
                            href={`/books/${b.id}`}
                            onClick={() => setIsOpen(false)}
                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                          >
                            View Book Details &rarr;
                          </Link>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: Recommendations */}
            {activeTab === "recommend" && (
              <div className="flex flex-1 flex-col overflow-hidden p-4 space-y-4">
                <div className="space-y-2">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Reading Interests
                    </label>
                    <input
                      type="text"
                      value={recPreference}
                      onChange={(e) => setRecPreference(e.target.value)}
                      placeholder='e.g. "Software Architecture, Microservices, Python"'
                      className="w-full mt-1 rounded-xl border border-slate-300 px-3.5 py-2 text-xs sm:text-sm text-slate-900 focus:border-indigo-600 focus:outline-none"
                    />
                  </div>

                  <div className="pt-1 flex gap-2">
                    <input
                      type="text"
                      value={recCategory}
                      onChange={(e) => setRecCategory(e.target.value)}
                      placeholder="Category filter (optional)"
                      className="flex-1 rounded-xl border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none"
                    />
                    <button
                      onClick={handleRunRecommend}
                      disabled={isRecommending}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-40"
                    >
                      {isRecommending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                      Get Recommendations
                    </button>
                  </div>
                </div>

                {recExplanation && (
                  <div className="rounded-xl border border-purple-100 bg-purple-50/60 p-3 text-xs text-purple-900 leading-relaxed">
                    <span className="font-bold">Librarian Note: </span>
                    {recExplanation}
                  </div>
                )}

                <div className="flex-1 overflow-y-auto space-y-2">
                  {recResults.length === 0 && !isRecommending ? (
                    <div className="py-12 text-center text-xs text-slate-400">
                      Specify what you want to learn or explore to get grounded recommendations.
                    </div>
                  ) : (
                    recResults.map((b) => (
                      <div
                        key={b.id}
                        className="rounded-xl border border-slate-200/80 bg-white p-3 hover:border-indigo-200 transition space-y-1.5 shadow-2xs"
                      >
                        <div className="flex justify-between items-start">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">
                            {b.category || "Recommended"}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">
                            {b.available_copies} in stock
                          </span>
                        </div>
                        <h4 className="font-bold text-xs text-slate-900">{b.title}</h4>
                        <p className="text-[11px] text-slate-500">by {b.author}</p>
                        <div className="pt-2 flex justify-end">
                          <Link
                            href={`/books/${b.id}`}
                            onClick={() => setIsOpen(false)}
                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                          >
                            Explore Title &rarr;
                          </Link>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
export default AILibrarianWidget;
