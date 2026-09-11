import {
  RegisterRequest,
  RegisterResponse,
  LoginRequest,
  LoginResponse,
  ApiSuccessResponse,
  ApiErrorResponse,
} from '../types/auth';
import type { Category, CategoryCourse } from '../types/learning-content';
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

export const categoryApi = {
  list: (): Promise<Category[]> => {
    return request<Category[]>('/api/v1/categories');
  },
  create: (payload: {
    name: string;
    slug: string;
    description?: string;
  }): Promise<Category> => {
    return request<Category>('/api/v1/categories', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  detail: (slug: string): Promise<{
    category: Category;
    courses: CategoryCourse[];
  }> => {
    return request(`/api/v1/categories/${encodeURIComponent(slug)}`);
  },
  update: (
    id: string,
    payload: { name: string; slug: string; description?: string },
  ): Promise<Category> => {
    return request<Category>(`/api/v1/categories/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
  remove: (id: string): Promise<{ id: string; message: string }> => {
    return request<{ id: string; message: string }>(
      `/api/v1/categories/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
    );
  },
};

export const courseApi = {
  list: (): Promise<import('../types/learning-content').Course[]> => {
    return request('/api/v1/courses');
  },
  detail: (slug: string) => {
    return request<import('../types/learning-content').CourseDetail>(
      `/api/v1/courses/${encodeURIComponent(slug)}`,
    );
  },
  lesson: (lessonId: string): Promise<{
    id: string;
    chapter_id: string;
    title: string;
    content: string | null;
    code_example: string | null;
    estimated_duration_minutes: number;
    order_index: number;
    status: string;
    is_ai_generated: boolean;
    chapter: { id: string; title: string };
    course: { id: string; title: string; slug: string };
    exercises: Array<{
      id: string;
      content: string;
      type: string;
      difficulty: string;
      status: string;
    }>;
  }> => {
    return request(`/api/v1/courses/lessons/${encodeURIComponent(lessonId)}`);
  },
  updateLesson: (lessonId: string, payload: {
    title?: string;
    estimated_duration_minutes?: number;
    content?: string;
    code_example?: string;
    status?: 'draft' | 'in_review' | 'approved' | 'published';
  }) => request(`/api/v1/courses/lessons/${encodeURIComponent(lessonId)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }),
  removeLesson: (lessonId: string) => request<{ id: string; message: string }>(
    `/api/v1/courses/lessons/${encodeURIComponent(lessonId)}`,
    { method: 'DELETE' },
  ),
  learnerLessons: (slug: string): Promise<{
    course: { id: string; title: string; slug: string };
    chapters: Array<{
      id: string;
      title: string;
      lessons: Array<{
        id: string;
        title: string;
        duration: number;
        status: string;
        content: string | null;
        codeExample: string | null;
      }>;
    }>;
  }> => {
    return request(`/api/v1/learner/courses/${encodeURIComponent(slug)}/lessons`);
  },
  chapters: (courseId: string): Promise<import('../types/learning-content').Chapter[]> => {
    return request(`/api/v1/courses/${encodeURIComponent(courseId)}/chapters`);
  },
  createLesson: (courseId: string, chapterId: string, payload: {
    title: string;
    estimated_duration_minutes?: number;
    content?: string;
    code_example?: string;
    status?: 'draft' | 'in_review' | 'approved' | 'published';
  }) => {
    return request<import('../types/learning-content').Lesson>(
      `/api/v1/courses/${encodeURIComponent(courseId)}/chapters/${encodeURIComponent(chapterId)}/lessons`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
  },
  createChapter: (courseId: string, payload: { title: string; description?: string }) => {
    return request<{
      id: string;
      title: string;
      description: string | null;
      order_index: number;
      status: string;
      course_id: string;
    }>(`/api/v1/courses/${encodeURIComponent(courseId)}/chapters`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  updateChapter: (courseId: string, chapterId: string, payload: { title: string; description?: string }) => {
    return request<{
      id: string;
      title: string;
      description: string | null;
      order_index: number;
      status: string;
      course_id: string;
    }>(`/api/v1/courses/${encodeURIComponent(courseId)}/chapters/${encodeURIComponent(chapterId)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
  removeChapter: (courseId: string, chapterId: string) => {
    return request<{ id: string; message: string }>(
      `/api/v1/courses/${encodeURIComponent(courseId)}/chapters/${encodeURIComponent(chapterId)}`,
      { method: 'DELETE' },
    );
  },
  reorderChapters: (courseId: string, chapterIds: string[]) => {
    return request<{ message: string }>(
      `/api/v1/courses/${encodeURIComponent(courseId)}/chapters/reorder`,
      {
        method: 'PATCH',
        body: JSON.stringify({ chapter_ids: chapterIds }),
      },
    );
  },
  reorderLessons: (courseId: string, chapterId: string, lessonIds: string[]) => {
    return request<{ message: string }>(
      `/api/v1/courses/${encodeURIComponent(courseId)}/chapters/${encodeURIComponent(chapterId)}/lessons/reorder`,
      {
        method: 'PATCH',
        body: JSON.stringify({ chapter_ids: lessonIds }),
      },
    );
  },
  create: (payload: {
    title: string;
    slug: string;
    description?: string;
    level: 'Beginner' | 'Intermediate' | 'Advanced';
    category_id: string;
    thumbnail_url?: string;
  }) => {
    return request<{
      id: string;
      title: string;
      slug: string;
      status: string;
    }>('/api/v1/courses', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  update: (id: string, payload: {
    title: string;
    slug: string;
    description?: string;
    level: 'Beginner' | 'Intermediate' | 'Advanced';
    category_id?: string;
  }): Promise<import('../types/learning-content').Course> => request('/api/v1/courses/' + encodeURIComponent(id), {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }),
  remove: (id: string) => request<{ id: string; message: string }>(
    '/api/v1/courses/' + encodeURIComponent(id),
    { method: 'DELETE' },
  ),
};
