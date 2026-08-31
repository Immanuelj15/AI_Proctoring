export type UserRole = "student" | "examiner" | "admin";

export interface User {
  id: number | string;
  name: string;
  email: string;
  role: UserRole;
  phone_number?: string;
  createdAt?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  role: UserRole;
}

export interface LoginRequest {
  email: string;
  password?: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password?: string;
  role: UserRole;
}
