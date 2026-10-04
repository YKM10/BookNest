export interface User {
  id: number;
  name: string;
  email: string;
  role: "STUDENT" | "LIBRARIAN" | "ADMIN";
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Book {
  id: number;
  title: string;
  author: string;
  isbn: string;
  description?: string | null;
  category?: string | null;
  publisher?: string | null;
  publication_year?: number | null;
  cover_url?: string | null;
  total_copies: number;
  available_copies: number;
  created_at: string;
  updated_at: string;
}

export interface Borrowing {
  id: number;
  user_id: number;
  book_id: number;
  borrowed_at: string;
  due_date: string;
  returned_at?: string | null;
  status: "BORROWED" | "RETURNED" | "OVERDUE";
  fine_amount: number | string;
  created_at: string;
  book?: {
    id: number;
    title: string;
    author: string;
    isbn: string;
    cover_url?: string | null;
  } | null;
}

export interface ReturnResult {
  message: string;
  borrowing_id: number;
  returned_at: string;
  status: string;
  fine_amount: number;
  days_overdue: number;
  book_id: number;
  available_copies: number;
}

export interface SystemStats {
  total_users: number;
  total_students: number;
  total_librarians: number;
  total_admins: number;
  total_books: number;
  total_inventory_copies: number;
  total_available_copies: number;
  total_borrowings: number;
  active_borrowings: number;
  returned_borrowings: number;
  overdue_borrowings: number;
  total_fines_accrued: number;
}

export interface AuditLogItem {
  id: number;
  user_id?: number | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  description?: string | null;
  created_at: string;
}

export interface UserUpdateAdminInput {
  name?: string;
  role?: "STUDENT" | "LIBRARIAN" | "ADMIN";
  is_active?: boolean;
}

export interface AIChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AIChatResponse {
  reply: string;
  suggestions: string[];
  books: Book[];
  source: string;
}

export interface AIRecommendResponse {
  recommendations: Book[];
  explanation: string;
  source: string;
}

export interface AISearchResponse {
  results: Book[];
  explanation: string;
  total: number;
  source: string;
}

export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const getAuthToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("booknest_token");
};

export const setAuthToken = (token: string | null) => {
  if (typeof window === "undefined") return;
  if (token) {
    localStorage.setItem("booknest_token", token);
  } else {
    localStorage.removeItem("booknest_token");
  }
};

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint}`;

  let res: Response;
  try {
    res = await fetch(url, { ...options, headers });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to connect to backend server";
    throw new ApiError(0, message);
  }

  if (!res.ok) {
    let detail = `Error ${res.status}: ${res.statusText}`;
    try {
      const errorJson = await res.json();
      if (typeof errorJson.detail === "string") {
        detail = errorJson.detail;
      } else if (Array.isArray(errorJson.detail)) {
        detail = errorJson.detail.map((e: { msg?: string; loc?: string[] }) => e.msg || JSON.stringify(e)).join(", ");
      }
    } catch {
      // Keep default text
    }

    if (res.status === 401 && typeof window !== "undefined") {
      setAuthToken(null);
    }

    throw new ApiError(res.status, detail);
  }

  return res.json();
}

export interface BookCreateInput {
  title: string;
  author: string;
  isbn: string;
  description?: string;
  category?: string;
  publisher?: string;
  publication_year?: number;
  cover_url?: string;
  total_copies: number;
  available_copies?: number;
}

export interface BookUpdateInput {
  title?: string;
  author?: string;
  isbn?: string;
  description?: string;
  category?: string;
  publisher?: string;
  publication_year?: number;
  cover_url?: string;
  total_copies?: number;
  available_copies?: number;
}

export const api = {
  auth: {
    register: (name: string, email: string, password: string) =>
      request<User>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      }),

    login: (email: string, password: string) =>
      request<{ access_token: string; token_type: string }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),

    getMe: () => request<User>("/api/auth/me"),
  },

  books: {
    list: (params?: { search?: string; author?: string; category?: string; available?: boolean }) => {
      const searchParams = new URLSearchParams();
      if (params?.search) searchParams.set("search", params.search);
      if (params?.author) searchParams.set("author", params.author);
      if (params?.category) searchParams.set("category", params.category);
      if (params?.available !== undefined) searchParams.set("available", String(params.available));

      const query = searchParams.toString();
      return request<Book[]>(`/api/books${query ? `?${query}` : ""}`);
    },

    get: (id: number) => request<Book>(`/api/books/${id}`),

    create: (data: BookCreateInput) =>
      request<Book>("/api/books", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    update: (id: number, data: BookUpdateInput) =>
      request<Book>(`/api/books/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),

    delete: (id: number) =>
      request<{ message: string; id: number }>(`/api/books/${id}`, {
        method: "DELETE",
      }),
  },

  borrowings: {
    my: () => request<Borrowing[]>("/api/borrowings/my"),
    borrow: (bookId: number) =>
      request<Borrowing>(`/api/borrowings/borrow/${bookId}`, {
        method: "POST",
      }),
    returnBook: (borrowingId: number) =>
      request<ReturnResult>(`/api/borrowings/return/${borrowingId}`, {
        method: "POST",
      }),
    history: (userId?: number) => {
      const query = userId !== undefined ? `?user_id=${userId}` : "";
      return request<Borrowing[]>(`/api/borrowings/history${query}`);
    },
    overdue: () => request<Borrowing[]>("/api/borrowings/overdue"),
  },

  admin: {
    getStats: () => request<SystemStats>("/api/admin/stats"),
    getUsers: (params?: { role?: string; search?: string; is_active?: boolean }) => {
      const searchParams = new URLSearchParams();
      if (params?.role) searchParams.set("role", params.role);
      if (params?.search) searchParams.set("search", params.search);
      if (params?.is_active !== undefined) searchParams.set("is_active", String(params.is_active));
      const query = searchParams.toString();
      return request<User[]>(`/api/admin/users${query ? `?${query}` : ""}`);
    },
    getUser: (id: number) => request<User>(`/api/admin/users/${id}`),
    updateUser: (id: number, data: UserUpdateAdminInput) =>
      request<User>(`/api/admin/users/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    getAuditLogs: (limit: number = 50) =>
      request<AuditLogItem[]>(`/api/admin/audit-logs?limit=${limit}`),
  },

  ai: {
    chat: (data: { message: string; history?: AIChatMessage[]; book_id?: number }) =>
      request<AIChatResponse>("/api/ai/chat", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    recommend: (data?: { preference?: string; category?: string; limit?: number }) =>
      request<AIRecommendResponse>("/api/ai/recommend", {
        method: "POST",
        body: JSON.stringify(data || {}),
      }),
    search: (data: { query: string; available_only?: boolean }) =>
      request<AISearchResponse>("/api/ai/search", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },
};
