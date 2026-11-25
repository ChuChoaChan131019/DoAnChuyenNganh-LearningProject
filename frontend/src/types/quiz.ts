export type QuizStatus = 'draft' | 'published' | 'archived';

export type QuizVisibility = 'private' | 'public';

export type QuizType = 'exam' | 'exercise';

export type AttemptStatus = 'in_progress' | 'completed' | 'expired';

export interface QuizData {
  id: string;
  course_id: string;
  chapter_id: string | null;
  title: string;
  description?: string | null;
  duration_minutes: number | null;
  pass_percentage: number;
  shuffle_questions: boolean;
  shuffle_options: boolean;
  is_active: boolean;
  quiz_type: QuizType;
  is_required: boolean;
  counts_toward_progress: boolean;
  created_at: string;
  pass_score: number;
  total_score: number;
  total_questions: number;
  visibility: QuizVisibility;
  status: QuizStatus;
  course_title?: string;
  chapter_title?: string | null;
  attempts_count?: number;
  avg_score?: number;
  created_by?: string;
  updated_at: string;
}

export interface QuizQuestionItem {
  quiz_id: string;
  question_id: string;
  score_weight: number;
  questions?: any;
}

export interface QuizItem {
  id: string;
  title: string;
  description?: string | null;
  course_id: string;
  course_title?: string;
  chapter_id?: string | null;
  chapter_title?: string | null;
  quiz_type: QuizType;
  duration_minutes: number | null;
  pass_score: number;
  total_score: number;
  total_questions: number;
  visibility: QuizVisibility;
  status: QuizStatus;
  shuffle_questions: boolean;
  shuffle_options: boolean;
  attempts_count?: number;
  avg_score?: number;
  created_by?: string;
  updated_at: string;
}

export interface QuizSettingsPayload {
  title: string;
  description?: string;
  course_id: string;
  chapter_id?: string | null;
  quiz_type: QuizType;
  duration_minutes: number | null;
  pass_score: number;
  visibility: QuizVisibility;
  status: QuizStatus;
  shuffle_questions: boolean;
  shuffle_options: boolean;
}

export interface QuizAttempt {
  attempt_id: string;
  quiz_id: string;
  quiz_title: string;
  course_id: string;
  chapter_id: string | null;
  quiz_type: QuizType;
  status: AttemptStatus;
  score: number | null;
  max_score: number | null;
  percentage: number | null;
  started_at: string;
  completed_at: string | null;
}

export interface QuizAnswerSubmission {
  question_id: string;
  selected_option_ids?: string[];
  answer?: string;
}

export interface QuizSubmissionPayload {
  attempt_id: string;
  answers: QuizAnswerSubmission[];
}

export interface QuizResultResponse {
  quiz_id: string;
  latest_attempt_id: string | null;
  score: number | null;
  max_score: number | null;
  percentage: number | null;
  completed_at: string | null;
}

export interface QuizQuestionConfiguration {
  question_id: string;
  order_index: number;
  score_weight: number;
}

export interface QuizAttemptQuestion {
  question_id: string;
  content: string;
  question_type: string;
  options: Array<{ id: string; option_text: string }>;
}