import { LoginRequest, RegisterRequest, AuthResponse, User } from "./types";
import { getToken } from "./auth";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

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

export async function updateQuestion(questionId: number, data: any): Promise<any> {
  return request<any>(`/questions/${questionId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteQuestion(questionId: number): Promise<any> {
  return request<any>(`/questions/${questionId}`, {
    method: "DELETE",
  });
}

export interface ExtractionOptions {
  subject?: string;
  easy_count?: number;
  medium_count?: number;
  hard_count?: number;
  question_types?: string[];
}

export interface ExtractedQuestionsResult {
  source_type: string;
  source_name: string;
  subject?: string;
  extracted_count: number;
  distribution: {
    requested: { easy: number; medium: number; hard: number };
    actual: { easy: number; medium: number; hard: number };
  };
  questions: any[];
}

export async function extractQuestionsFromFile(
  file: File,
  options: ExtractionOptions = {}
): Promise<ExtractedQuestionsResult> {
  const formData = new FormData();
  formData.append("file", file);
  if (options.subject) formData.append("subject", options.subject);
  if (options.easy_count !== undefined) formData.append("easy_count", String(options.easy_count));
  if (options.medium_count !== undefined) formData.append("medium_count", String(options.medium_count));
  if (options.hard_count !== undefined) formData.append("hard_count", String(options.hard_count));
  if (options.question_types && options.question_types.length > 0) {
    formData.append("question_types", options.question_types.join(","));
  }

  const token = getToken();
  const res = await fetch(`${API_BASE_URL}/questions/extract-file`, {
    method: "POST",
    headers: token ? { "Authorization": `Bearer ${token}` } : {},
    body: formData,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || "Failed to extract questions from file.");
  }
  return data;
}

export async function extractQuestionsFromUrl(
  payload: {
    url: string;
    subject?: string;
    easy_count?: number;
    medium_count?: number;
    hard_count?: number;
    question_types?: string[];
  }
): Promise<ExtractedQuestionsResult> {
  return request<ExtractedQuestionsResult>("/questions/extract-url", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function extractQuestionsFromPdf(file: File, subject?: string): Promise<{ filename: string; extracted_count: number; questions: any[] }> {
  const formData = new FormData();
  formData.append("file", file);
  if (subject) formData.append("subject", subject);
  const token = getToken();

  const res = await fetch(`${API_BASE_URL}/questions/extract-pdf`, {
    method: "POST",
    headers: token ? { "Authorization": `Bearer ${token}` } : {},
    body: formData,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || "Failed to extract questions from PDF.");
  }
  return data;
}

export async function batchCreateQuestions(questions: any[]): Promise<any[]> {
  return request<any[]>("/questions/batch", {
    method: "POST",
    body: JSON.stringify(questions),
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

export async function getExam(examId: number): Promise<any> {
  return request<any>(`/exams/${examId}`, {
    method: "GET",
  });
}

export async function addQuestionToExam(examId: number, questionId: number, orderIndex: number = 1): Promise<any> {
  return request<any>(`/exams/${examId}/questions`, {
    method: "POST",
    body: JSON.stringify({ question_id: questionId, question_order: orderIndex }),
  });
}

export async function removeQuestionFromExam(examId: number, questionId: number): Promise<any> {
  return request<any>(`/exams/${examId}/questions/${questionId}`, {
    method: "DELETE",
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

// Examiner Review & Integrity API
export async function getPendingReviewSessions(): Promise<any[]> {
  return request<any[]>("/exam-sessions/pending-review", {
    method: "GET",
  });
}

export async function getSessionFullDetails(sessionId: number): Promise<any> {
  return request<any>(`/exam-sessions/${sessionId}/full-details`, {
    method: "GET",
  });
}

export async function submitExaminerGrade(sessionId: number, payload: { overrides: any[]; feedback?: string }): Promise<any> {
  return request<any>(`/exam-sessions/${sessionId}/grade`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function submitIntegrityDecision(sessionId: number, payload: { decision: "publish" | "disqualify"; reason?: string }): Promise<any> {
  return request<any>(`/exam-sessions/${sessionId}/integrity-decision`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getExamReportPdfUrl(sessionId: string | number): string {
  return `${API_BASE_URL}/exam-sessions/${sessionId}/report.pdf`;
}

// Phase 1: Trust & Integrity Endpoints

export async function resumeExamSession(sessionId: string | number): Promise<any> {
  return request<any>(`/exam-sessions/${sessionId}/resume`, {
    method: "GET",
  });
}

export async function verifyIdentity(
  sessionId: string | number,
  formData: FormData
): Promise<{
  identity_verified: boolean;
  confidence: number;
  photo_url: string;
  retention_purge_date: string;
  policy: string;
}> {
  const token = getToken();
  const res = await fetch(`${API_BASE_URL}/exam-sessions/${sessionId}/verify-identity`, {
    method: "POST",
    headers: token ? { "Authorization": `Bearer ${token}` } : {},
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || "Identity verification failed.");
  }
  return data;
}

export async function periodicFaceCheck(
  sessionId: string | number,
  formData: FormData
): Promise<{ match_confidence: number; status: string; threshold: number }> {
  const token = getToken();
  const res = await fetch(`${API_BASE_URL}/exam-sessions/${sessionId}/periodic-face-check`, {
    method: "POST",
    headers: token ? { "Authorization": `Bearer ${token}` } : {},
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || "Periodic face check failed.");
  }
  return data;
}

export async function uploadRoomScan(
  sessionId: string | number,
  videoBlob: Blob
): Promise<{ room_scan_completed: boolean; room_scan_url: string }> {
  const token = getToken();
  const formData = new FormData();
  formData.append("video", videoBlob, "room_scan.webm");

  const res = await fetch(`${API_BASE_URL}/exam-sessions/${sessionId}/room-scan`, {
    method: "POST",
    headers: token ? { "Authorization": `Bearer ${token}` } : {},
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || "Failed to upload room scan.");
  }
  return data;
}

export async function getReviewQueue(statusFilter: string = "PENDING"): Promise<any[]> {
  const query = statusFilter ? `?status_filter=${encodeURIComponent(statusFilter)}` : "";
  return request<any[]>(`/api/v1/proctor/review-queue${query}`, {
    method: "GET",
  });
}

export async function reviewProctorEvent(
  eventId: string,
  decision: "CONFIRM" | "DISMISS",
  notes?: string
): Promise<any> {
  return request<any>(`/api/v1/proctor/events/${eventId}/review`, {
    method: "POST",
    body: JSON.stringify({ decision, notes }),
  });
}

