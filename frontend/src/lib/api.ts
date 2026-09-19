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
import type {
  QuizItem,
  QuizData,
  QuizQuestionItem,
  QuizAttempt,
  QuizAnswerSubmission,
  QuizAttemptQuestion,
  QuizResultResponse,
  QuizSubmissionPayload,
  QuizStatus,
} from '../types/quiz';

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

export const topicApi = {
  list: () => request<Array<{ id: string; name: string; slug: string }>>('/api/v1/topics'),
  create: (name: string, description?: string) =>
    request<{ id: string; name: string; slug: string }>('/api/v1/topics', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    }),
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
  ai: (courseId?: string, count = 10, prompt?: string): Promise<{
    mode: string;
    difficulty: string;
    rationale: string;
    questions: { mode: string; questions: import('../types/practice').PracticeQuestion[] };
  }> => request('/api/v1/practice/ai', {
    method: 'POST',
    body: JSON.stringify({ course_id: courseId, count, prompt }),
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

export interface FeedbackItem {
  id: string;
  managerId: string;
  learnerId: string;
  learnerName: string;
  learnerEmail: string;
  courseId: string;
  courseTitle?: string;
  content: string;
  contextType: 'general' | 'progress' | 'result' | 'task';
  contextId?: string | null;
  contextSnapshot?: any;
  status: 'draft' | 'sent';
  sentAt?: string | null;
  readAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFeedbackPayload {
  learnerId: string;
  courseId: string;
  content: string;
  contextType?: 'general' | 'progress' | 'result' | 'task';
  contextId?: string;
  contextSnapshot?: Record<string, any>;
  status?: 'draft' | 'sent';
}

export interface UpdateFeedbackPayload {
  content?: string;
  contextType?: 'general' | 'progress' | 'result' | 'task';
  contextId?: string;
  contextSnapshot?: Record<string, any>;
}

export const feedbacksApi = {
  getLearners: (courseId?: string): Promise<Array<{ id: string; name: string; email: string }>> => {
    const query = courseId ? `?courseId=${encodeURIComponent(courseId)}` : '';
    return request<Array<{ id: string; name: string; email: string }>>(`/api/v1/feedbacks/learners${query}`);
  },
  list: (status?: string): Promise<FeedbackItem[]> => {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return request<FeedbackItem[]>(`/api/v1/feedbacks${query}`);
  },
  getById: (id: string): Promise<FeedbackItem> => {
    return request<FeedbackItem>(`/api/v1/feedbacks/${encodeURIComponent(id)}`);
  },
  create: (payload: CreateFeedbackPayload): Promise<FeedbackItem> => {
    return request<FeedbackItem>('/api/v1/feedbacks', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  update: (id: string, payload: UpdateFeedbackPayload): Promise<FeedbackItem> => {
    return request<FeedbackItem>(`/api/v1/feedbacks/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
  delete: (id: string): Promise<{ success: boolean; message: string }> => {
    return request<{ success: boolean; message: string }>(`/api/v1/feedbacks/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },
  send: (id: string): Promise<FeedbackItem> => {
    return request<FeedbackItem>(`/api/v1/feedbacks/${encodeURIComponent(id)}/send`, {
      method: 'POST',
    });
  },
};

// Dashboard API
export interface ContinueLearningStudyPlan {
  id: string;
  name: string;
  lesson_id: string;
  lesson_name: string;
  course_id: string;
  course_name: string;
}

export interface ContinueLearningLesson {
  id: string;
  name: string;
  course_id: string;
  course_name: string;
}

export interface ContinueLearning {
  type: 'study_plan' | 'lesson' | 'empty';
  study_plan?: ContinueLearningStudyPlan;
  lesson?: ContinueLearningLesson;
}

export interface CourseProgress {
  course_id: string;
  course_name: string;
  completed_lessons: number;
  total_lessons: number;
  percentage: number;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  deadline?: string;
  status: string;
}

export interface QuizResult {
  id: string;
  quiz_name: string;
  score: number;
  total_questions: number;
  completed_at: string;
}

export interface DashboardData {
  continue_learning: ContinueLearning;
  progress: {
    courses: CourseProgress[];
  };
  tasks: {
    active: Task[];
    overdue: Task[];
    upcoming: Task[];
  };
  recent_results: {
    quizzes: QuizResult[];
    trend: 'improving' | 'stable' | 'declining' | 'insufficient_data';
  };
}

export const dashboardApi = {
  get: (): Promise<DashboardData> => {
    return request<DashboardData>('/api/v1/dashboard');
  },
};
