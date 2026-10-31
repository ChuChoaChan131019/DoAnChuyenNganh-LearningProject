import type {
  RegisterRequest,
  RegisterResponse,
  LoginRequest,
  LoginResponse,
  ApiSuccessResponse,
  ApiErrorResponse,
} from '../types/auth';
import { clearSession, getStoredRefreshToken, getStoredToken, saveSession } from './auth/session';
import type { ChapterOption, CourseOption, LessonOption, QuestionPayload } from '../types/question';
import type {
  QuizItem,
  QuizData,
  QuizQuestionItem,
  QuizAttempt,
  QuizAttemptQuestion,
  QuizResultResponse,
  QuizSubmissionPayload,
  QuizStatus,
} from '../types/quiz';
import { vietnameseErrorMessage } from './ui-labels';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/+$/, '');
let refreshInFlight: Promise<void> | null = null;

function refreshAccessToken(): Promise<void> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    const refreshToken = getStoredRefreshToken();
    if (!refreshToken) throw new Error('No refresh token');
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!response.ok) throw new Error('Session refresh failed');
    const result = await response.json() as ApiSuccessResponse<LoginResponse>;
    if (!result?.data?.access_token || !result.data.user) throw new Error('Invalid session refresh response');
    saveSession({ accessToken: result.data.access_token, refreshToken: result.data.refresh_token, user: result.data.user });
  })().finally(() => { refreshInFlight = null; });
  return refreshInFlight;
}

export class ApiClientError extends Error {
  code: string;
  status: number;

  constructor(message: string, code = 'INTERNAL_ERROR', status = 500) {
    super(vietnameseErrorMessage(message));
    this.name = 'ApiClientError';
    this.code = code;
    this.status = status;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}, retried = false): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const headers: Record<string, string> = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
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

  let responseBody: unknown = null;
  try {
    responseBody = await response.json();
  } catch {
    // Empty or non-JSON response body.
  }

  if (!response.ok) {
    let errorDetail: { code?: string; message?: string } = {};
    const errorJson = responseBody as ApiErrorResponse | null;
    if (errorJson?.error) {
      errorDetail = errorJson.error;
    }

    const code = errorDetail.code || `HTTP_${response.status}`;
    const message = errorDetail.message || response.statusText || 'Yêu cầu thất bại';

    if (response.status === 401 && typeof window !== 'undefined') {
      if (!retried && token && getStoredRefreshToken() && endpoint !== '/api/v1/auth/login') {
        try {
          if (getStoredToken() === token) await refreshAccessToken();
          return request<T>(endpoint, options, true);
        } catch {
          // The refresh token is invalid or the refresh endpoint is unavailable.
        }
      }
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

export type Material = {
  id: string;
  lesson_id: string;
  title: string;
  file_type: 'PDF' | 'Image' | 'Code Sample';
  file_size: number | null;
  created_at: string;
  lesson_title?: string;
  course_id?: string;
  course_title?: string;
};

export const materialApi = {
  list: () => request<Material[]>('/api/v1/courses/materials'),
  byLesson: (lessonId: string) => request<Material[]>(`/api/v1/courses/lessons/${encodeURIComponent(lessonId)}/materials`),
  upload: (lessonId: string, file: File, title?: string) => {
    const body = new FormData();
    body.append('file', file);
    if (title) body.append('title', title);
    return request<Material>(`/api/v1/courses/lessons/${encodeURIComponent(lessonId)}/materials`, { method: 'POST', body });
  },
  rename: (id: string, title: string) => request<Material>(`/api/v1/courses/materials/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ title }) }),
  remove: (id: string) => request<{ id: string }>(`/api/v1/courses/materials/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  access: (id: string, download = false) => request<{ url: string }>(`/api/v1/courses/materials/${encodeURIComponent(id)}/access?download=${download}`),
  learnerByLesson: (lessonId: string) => request<Material[]>(`/api/v1/learner/courses/lessons/${encodeURIComponent(lessonId)}/materials`),
  learnerAccess: (id: string, download = false) => request<{ url: string }>(`/api/v1/learner/courses/materials/${encodeURIComponent(id)}/access?download=${download}`),
};

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

export const aiTutorApi = {
  history: () =>
    request<{
      conversations: Array<{ id: string; title: string; preview: string; created_at: string }>;
      messages: Array<{
        id: string;
        conversation_id: string;
        sender_role: 'user' | 'assistant' | 'system';
        message_content: string;
        created_at: string;
      }>;
    }>('/api/v1/ai/tutor/history'),
  send: (payload: { conversationId?: string; message: string }) =>
    request<{ conversationId: string; message: { id: string; conversation_id: string; sender_role: 'assistant'; message_content: string; created_at: string } }>(
      '/api/v1/ai/tutor/message',
      { method: 'POST', body: JSON.stringify(payload) },
    ),
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
    version: number;
    created_by: string | null;
    submitted_by: string | null;
    submitted_at: string | null;
    reviewed_by: string | null;
    reviewed_at: string | null;
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
    version: number;
    title?: string;
    estimated_duration_minutes?: number;
    content?: string;
    code_example?: string;
  }) => request<{ version: number; status: string }>(`/api/v1/courses/lessons/${encodeURIComponent(lessonId)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }),
  reviewQueue: () => request<Array<{
    id: string; title: string; status: string; version: number; is_ai_generated: boolean;
    created_by: string | null; updated_at: string;
    chapters: { title: string; courses: { title: string; status: string } };
  }>>('/api/v1/courses/lessons/review-queue'),
  reviewTree: () => request<Array<{
    id: string;
    title: string;
    slug: string;
    status: string;
    chapters: Array<{
      id: string;
      course_id: string;
      title: string;
      status: string;
      order_index: number;
      lessons: Array<{
        id: string;
        chapter_id: string;
        title: string;
        status: string;
        version: number;
        is_ai_generated: boolean;
        order_index: number;
      }>;
    }>;
  }>>('/api/v1/courses/review-tree'),
  reviewChapterAction: (chapterId: string, action: 'approve' | 'publish' | 'unpublish') =>
    request<{ id: string; status: string }>(`/api/v1/courses/chapters/${encodeURIComponent(chapterId)}/review-action`, {
      method: 'POST', body: JSON.stringify({ action }),
    }),
  reviewCourseAction: (courseId: string, action: 'approve' | 'publish' | 'unpublish') =>
    request<{ id: string; status: string }>(`/api/v1/courses/${encodeURIComponent(courseId)}/review-action`, {
      method: 'POST', body: JSON.stringify({ action }),
    }),
  reviewHistory: (lessonId: string) => request<Array<{
    id: string; version: number; action: string; from_status: string | null; to_status: string;
    actor_id: string | null; actor_email: string; reason: string | null; created_at: string;
  }>>(`/api/v1/courses/lessons/${encodeURIComponent(lessonId)}/review-history`),
  reviewAction: (lessonId: string, payload: {
    action: 'approve' | 'publish' | 'unpublish'; version: number; reason?: string;
  }) => request<{ version: number; status: string }>(`/api/v1/courses/lessons/${encodeURIComponent(lessonId)}/review-action`, {
    method: 'POST', body: JSON.stringify(payload),
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
      status: string;
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
  learnerList: (): Promise<import('../types/learning-content').Course[]> =>
    request('/api/v1/learner/courses'),
  chapters: (courseId: string): Promise<import('../types/learning-content').Chapter[]> => {
    return request(`/api/v1/courses/${encodeURIComponent(courseId)}/chapters`);
  },
  createLesson: (courseId: string, chapterId: string, payload: {
    title: string;
    estimated_duration_minutes?: number;
    content?: string;
    code_example?: string;
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
    chapter_id?: string;
    lesson_id?: string;
    question_type?: import('../types/question').QuestionType;
    difficulty?: import('../types/question').DifficultyLevel;
    status?: import('../types/question').QuestionStatus;
    is_ai_generated?: boolean;
    is_deleted?: boolean;
  } = {}): Promise<import('../types/question').QuestionItem[]> => {
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.course_id) params.set('course_id', filters.course_id);
    if (filters.chapter_id) params.set('chapter_id', filters.chapter_id);
    if (filters.lesson_id) params.set('lesson_id', filters.lesson_id);
    if (filters.question_type) params.set('question_type', filters.question_type);
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

type ConfigureQuizQuestionsResponse = {
  quiz_id: string;
  total_questions: number;
  total_score: number;
};

export const quizApi = {
  list: (filters: {
    course_id?: string;
    status?: QuizStatus;
    page?: number;
  } = {}): Promise<QuizItem[]> => {
    const params = new URLSearchParams();
    if (filters.course_id) params.set('course_id', filters.course_id);
    if (filters.status) params.set('status', filters.status);
    if (filters.page !== undefined) params.set('page', String(filters.page));
    const query = params.toString();
    return request<QuizItem[]>(`/api/v1/quizzes${query ? `?${query}` : ''}`);
  },
  getById: (id: string): Promise<QuizData> =>
    request<QuizData>(`/api/v1/quizzes/${encodeURIComponent(id)}`),
  create: (payload: Partial<QuizData>): Promise<QuizData> =>
    request<QuizData>('/api/v1/quizzes', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  update: (id: string, payload: Partial<QuizData>): Promise<QuizData> =>
    request<QuizData>(`/api/v1/quizzes/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  publish: (id: string): Promise<QuizData> =>
    request<QuizData>(`/api/v1/quizzes/${encodeURIComponent(id)}/publish`, {
      method: 'POST',
    }),
  archive: (id: string): Promise<QuizData> =>
    request<QuizData>(`/api/v1/quizzes/${encodeURIComponent(id)}/archive`, {
      method: 'POST',
    }),
  delete: (id: string): Promise<{ id: string; message: string }> =>
    request<{ id: string; message: string }>(`/api/v1/quizzes/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),
  getQuestions: (quizId: string): Promise<QuizQuestionItem[]> =>
    request<QuizQuestionItem[]>(
      `/api/v1/quizzes/${encodeURIComponent(quizId)}/questions`,
    ),
  configureQuestions: (
    quizId: string,
    questions: Array<{ question_id: string; score_weight: number }>,
  ): Promise<ConfigureQuizQuestionsResponse> =>
    request<ConfigureQuizQuestionsResponse>(
      `/api/v1/quizzes/${encodeURIComponent(quizId)}/questions`,
      {
        method: 'PUT',
        body: JSON.stringify({ questions }),
      },
    ),
  startAttempt: (quizId: string): Promise<QuizAttempt & { questions: QuizAttemptQuestion[] }> =>
    request<QuizAttempt & { questions: QuizAttemptQuestion[] }>(`/api/v1/quizzes/${encodeURIComponent(quizId)}/attempts`, {
      method: 'POST',
    }),
  submitAttempt: (payload: QuizSubmissionPayload) =>
    request<QuizAttempt & { passed: boolean }>(`/api/v1/quiz-attempts/${encodeURIComponent(payload.attempt_id)}/submit`, {
      method: 'POST',
      body: JSON.stringify({ answers: payload.answers }),
    }),
  latestResult: (quizId: string): Promise<QuizResultResponse> =>
    request<QuizResultResponse>(`/api/v1/quiz-results/latest?quiz_id=${encodeURIComponent(quizId)}`),
};

export const practiceApi = {
  overview: (): Promise<import('../types/practice').PracticeOverview> =>
    request('/api/v1/practice/overview'),
  questions: (
    mode: 'quick' | 'weak' | 'course',
    courseId?: string,
  ): Promise<{ mode: string; questions: import('../types/practice').PracticeQuestion[] }> => {
    const params = new URLSearchParams({ mode });
    if (courseId) params.set('course_id', courseId);
    return request(`/api/v1/practice/questions?${params.toString()}`);
  },
  ai: (courseId?: string, count = 10, prompt?: string, chapterId?: string): Promise<{
    mode: string;
    difficulty: string;
    rationale: string;
    questions: { mode: string; questions: import('../types/practice').PracticeQuestion[] } | import('../types/practice').PracticeQuestion[];
  }> => request('/api/v1/practice/ai', {
    method: 'POST',
    body: JSON.stringify({ course_id: courseId, chapter_id: chapterId, count, prompt }),
  }),
  createAttempt: (payload: { mode: 'quick' | 'weak' | 'course' | 'ai'; course_id?: string; total_questions: number }) =>
    request<{ id: string }>('/api/v1/practice/attempts', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  completeAttempt: (attemptId: string) =>
    request<{ id: string; score: number; percentage: number }>(`/api/v1/practice/attempts/${encodeURIComponent(attemptId)}/complete`, {
      method: 'POST',
    }),
  check: (payload: { question_id: string; option_ids?: string[]; answer_text?: string; attempt_id?: string }) =>
    request<{ is_correct: boolean; explanation: string | null }>('/api/v1/practice/check', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
