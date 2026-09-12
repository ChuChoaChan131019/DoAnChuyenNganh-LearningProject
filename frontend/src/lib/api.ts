import type {
  RegisterRequest,
  RegisterResponse,
  LoginRequest,
  LoginResponse,
  ApiSuccessResponse,
  ApiErrorResponse,
} from '../types/auth';
import type { Category, CategoryCourse } from '../types/learning-content';
import { clearSession, getStoredToken } from './auth/session';
import type { ChapterOption, CourseOption, LessonOption, QuestionPayload } from '../types/question';

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
  const method = options.method || 'GET';

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  // Tự động gắn Bearer Token nếu có và chưa được chỉ định tường minh
  const token = getStoredToken();
  if (token && !headers['Authorization'] && !headers['authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  console.log('[API request]', { method, url });

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

  let responseBody: unknown = null;
  try {
    responseBody = await response.json();
  } catch {
    // Empty or non-JSON response body.
  }

  console.log('[API response]', {
    method,
    url,
    status: response.status,
    data: responseBody,
  });

  if (!response.ok) {
    let errorDetail: { code?: string; message?: string } = {};
    const errorJson = responseBody as ApiErrorResponse | null;
    if (errorJson?.error) {
      errorDetail = errorJson.error;
    }

    const code = errorDetail.code || `HTTP_${response.status}`;
    const message = errorDetail.message || response.statusText || 'Yêu cầu thất bại';

    if (response.status === 401 && typeof window !== 'undefined') {
      clearSession();
    }

    throw new ApiClientError(message, code, response.status);
  }

  const json = responseBody as ApiSuccessResponse<T>;
  if (!json || !('data' in json)) {
    throw new ApiClientError('Backend returned an invalid response envelope.', 'INVALID_RESPONSE', response.status);
  }
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

export const questionApi = {
  list: (filters: {
    search?: string;
    course_id?: string;
    difficulty?: import('../types/question').DifficultyLevel;
    status?: import('../types/question').QuestionStatus;
    is_ai_generated?: boolean;
    is_deleted?: boolean;
  } = {}): Promise<import('../types/question').QuestionItem[]> => {
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.course_id) params.set('course_id', filters.course_id);
    if (filters.difficulty) params.set('difficulty', filters.difficulty);
    if (filters.status) params.set('status', filters.status);
    if (filters.is_ai_generated !== undefined) params.set('is_ai_generated', String(filters.is_ai_generated));
    if (filters.is_deleted !== undefined) params.set('is_deleted', String(filters.is_deleted));
    const query = params.toString();
    return request<import('../types/question').QuestionItem[]>(`/api/v1/questions${query ? `?${query}` : ''}`);
  },
  // The detail response includes nested relations not covered by QuestionItem.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getById: (id: string) => request<any>(`/api/v1/questions/${id}`),
  listCourses: (): Promise<CourseOption[]> =>
    request<CourseOption[]>('/api/v1/courses'),
  listChapters: (courseId: string): Promise<ChapterOption[]> =>
    request<ChapterOption[]>(`/api/v1/courses/${encodeURIComponent(String(courseId))}/chapters`),
  listLessons: (courseId: string, chapterId: string): Promise<LessonOption[]> =>
    request<LessonOption[]>(
      `/api/v1/courses/${encodeURIComponent(String(courseId))}/chapters/${encodeURIComponent(String(chapterId))}/lessons`,
    ),
  create: (payload: QuestionPayload) => request<{ id: string }>('/api/v1/questions', {
    method: 'POST', body: JSON.stringify(payload),
  }),
  update: (id: string, payload: QuestionPayload) => request<{ id: string }>(`/api/v1/questions/${id}`, {
    method: 'PUT', body: JSON.stringify(payload),
  }),
  updateStatus: (id: string, status: import('../types/question').QuestionStatus) => request<{ id: string; status: string }>(`/api/v1/questions/${id}/status`, {
    method: 'PATCH', body: JSON.stringify({ status }),
  }),
  submitForReview: (id: string) => request<{ id: string; review_pending: boolean }>(`/api/v1/questions/${id}/submit-review`, {
    method: 'POST', body: JSON.stringify({}),
  }),
  remove: (id: string) => request<{ id: string; deleted: boolean }>(`/api/v1/questions/${id}`, {
    method: 'DELETE',
  }),
  delete: (id: string) => request<{ id: string; deleted: boolean }>(`/api/v1/questions/${id}`, {
    method: 'DELETE',
  }),
  restore: (id: string) => request<{ id: string; restored: boolean }>(`/api/v1/questions/${id}/restore`, {
    method: 'PATCH',
  }),
};

type QuizQuestionConfiguration = {
  question_id: string;
  score_weight: number;
};

type ConfiguredQuizQuestion = QuizQuestionConfiguration & {
  questions: import('../types/question').QuestionItem | null;
};

type ConfigureQuizQuestionsResponse = {
  quiz_id: string;
  total_questions: number;
  total_score: number;
};

export const quizApi = {
  getQuestions: (quizId: string): Promise<ConfiguredQuizQuestion[]> =>
    request<ConfiguredQuizQuestion[]>(
      `/api/v1/quizzes/${encodeURIComponent(quizId)}/questions`,
    ),
  configureQuestions: (
    quizId: string,
    questions: QuizQuestionConfiguration[],
  ): Promise<ConfigureQuizQuestionsResponse> =>
    request<ConfigureQuizQuestionsResponse>(
      `/api/v1/quizzes/${encodeURIComponent(quizId)}/questions`,
      {
        method: 'PUT',
        body: JSON.stringify({ questions }),
      },
    ),
};

export const topicApi = {
  list: () => request<Array<{ id: string; name: string; slug: string }>>('/api/v1/topics'),
  create: (name: string, description?: string) =>
    request<{ id: string; name: string; slug: string }>('/api/v1/topics', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    }),
};