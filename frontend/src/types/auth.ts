export type UserRole = 'learner' | 'content_manager' | 'admin';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  fullName?: string;
}

export type SessionUser = User;

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token?: string;
  user: User;
}

export interface RegisterRequest {
  email: string;
  password: string;
  role: 'learner' | 'content_manager';
  fullName?: string;
}

export interface RegisterResponse {
  user: User;
}

export interface ApiErrorDetail {
  code: string;
  message: string;
}

export interface ApiErrorResponse {
  error: ApiErrorDetail;
  request_id?: string;
}

export interface ApiSuccessResponse<T> {
  data: T;
}
