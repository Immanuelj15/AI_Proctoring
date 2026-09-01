import { LoginRequest, RegisterRequest, AuthResponse, User } from "./types";
import { getToken } from "./auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data: any = {}) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}, tokenOverride?: string): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = tokenOverride || getToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (err) {
    throw new ApiError("Network error. Backend server is unreachable.", 0);
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    let message = data.detail || "Something went wrong. Please try again.";
    if (response.status === 401) {
      message = "Invalid email or password.";
    } else if (response.status === 403) {
      message = data.detail || "Access forbidden. Your account may be pending approval.";
    } else if (response.status === 409) {
      message = "An account with this email already exists.";
    } else if (response.status >= 500) {
      message = "Something went wrong. Please try again.";
    }
    throw new ApiError(message, response.status, data);
  }

  return data as T;
}

export async function registerUser(data: RegisterRequest): Promise<User> {
  return request<User>("/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function loginUser(data: LoginRequest): Promise<AuthResponse> {
  return request<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getCurrentUser(tokenOverride?: string): Promise<User> {
  return request<User>("/users/me", {
    method: "GET",
  }, tokenOverride);
}

// User Management (Admin Only)
export async function listUsers(): Promise<User[]> {
  return request<User[]>("/users", {
    method: "GET",
  });
}

export async function approveUser(userId: number, isApproved: boolean = true): Promise<User> {
  return request<User>(`/users/${userId}/approve?is_approved=${isApproved}`, {
    method: "PUT",
  });
}

// Question Bank API
export async function createQuestion(data: any): Promise<any> {
  return request<any>("/questions", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function listQuestions(subject?: string): Promise<any[]> {
  const query = subject ? `?subject=${encodeURIComponent(subject)}` : "";
  return request<any[]>(`/questions${query}`, {
    method: "GET",
  });
}

export async function deleteQuestion(questionId: number): Promise<any> {
  return request<any>(`/questions/${questionId}`, {
    method: "DELETE",
  });
}

// Exam Configuration API
export async function createExam(data: any): Promise<any> {
  return request<any>("/exams", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function listExams(): Promise<any[]> {
  return request<any[]>("/exams", {
    method: "GET",
  });
}

export async function addQuestionToExam(examId: number, questionId: number, orderIndex: number = 1): Promise<any> {
  return request<any>(`/exams/${examId}/questions`, {
    method: "POST",
    body: JSON.stringify({ question_id: questionId, question_order: orderIndex }),
  });
}

// Timed Session API
export async function startExamSession(examId: number): Promise<any> {
  return request<any>("/exam-sessions/start", {
    method: "POST",
    body: JSON.stringify({ exam_id: examId }),
  });
}

export async function getExamSessionRemainingTime(sessionId: string): Promise<any> {
  return request<any>(`/exam-sessions/${sessionId}/time-remaining`, {
    method: "GET",
  });
}
