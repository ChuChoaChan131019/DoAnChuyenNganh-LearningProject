import {
  RegisterRequest,
  RegisterResponse,
  LoginRequest,
  LoginResponse,
  ApiSuccessResponse,
  ApiErrorResponse,
} from '../types/auth';
import { getStoredToken } from './auth/session';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/+$/, '');

export class ApiClientError extends Error {
  code: string;
  status: number;

  constructor(message: string, code = 'INTERNAL_ERROR', status = 500) {
    super(message);
    this.name = 'ApiClientError';
    this.code = code;
    this.status = status;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  // Tự động gắn Bearer Token nếu có và chưa được chỉ định tường minh
  const token = getStoredToken();
  if (token && !headers['Authorization'] && !headers['authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Network error';
    throw new ApiClientError(
      `Không thể kết nối tới máy chủ (${errorMsg}). Vui lòng kiểm tra kết nối mạng.`,
      'NETWORK_ERROR',
      0,
    );
  }

  if (!response.ok) {
    let errorDetail: { code?: string; message?: string } = {};
    try {
      const errorJson = (await response.json()) as ApiErrorResponse;
      if (errorJson?.error) {
        errorDetail = errorJson.error;
      }
    } catch {
      // Body not json
    }

    const code = errorDetail.code || `HTTP_${response.status}`;
    const message = errorDetail.message || response.statusText || 'Yêu cầu thất bại';

    throw new ApiClientError(message, code, response.status);
  }

  const json = (await response.json()) as ApiSuccessResponse<T>;
  return json.data;
}

export const authApi = {
  register: (payload: RegisterRequest): Promise<RegisterResponse> => {
    return request<RegisterResponse>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  login: (payload: LoginRequest): Promise<LoginResponse> => {
    return request<LoginResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  logout: (): Promise<{ message: string }> => {
    return request<{ message: string }>('/api/v1/auth/logout', {
      method: 'POST',
    });
  },
};

export interface CreateNotificationPayload {
  title: string;
  content: string;
  scopeType: 'course' | 'individual';
  courseId: string;
  recipientIds?: string[];
}

export const notificationsApi = {
  getSent: (): Promise<any[]> => {
    return request<any[]>('/api/v1/notifications/sent', {
      method: 'GET',
    });
  },
  getCourseLearners: (courseId: string): Promise<any[]> => {
    return request<any[]>(`/api/v1/notifications/courses/${encodeURIComponent(courseId)}/learners`, {
      method: 'GET',
    });
  },
  send: (payload: CreateNotificationPayload): Promise<{ notification: any; recipientCount: number }> => {
    return request<{ notification: any; recipientCount: number }>('/api/v1/notifications', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};

