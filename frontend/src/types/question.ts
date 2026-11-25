export type QuestionType =
  | 'single_choice'
  | 'multiple_choice'
  | 'true_false'
  | 'fill_in_blank';

export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export type QuestionStatus = 'draft' | 'approved' | 'rejected';

export interface QuestionOption {
  id?: string;
  question_id?: string;
  option_text: string;
  is_correct: boolean;
  order_index: number;
}

export interface QuestionItem {
  id: string;
  course_id: string;
  chapter_id?: string | null;
  lesson_id?: string | null;
  question_type: QuestionType;
  difficulty: DifficultyLevel;
  content: string;
  explanation?: string | null;
  status: QuestionStatus;
  is_ai_generated: boolean;
  created_at: string;
  course?: { id: string; title: string } | null;
  chapter?: { id: string; title: string } | null;
  lesson?: { title: string } | null;

  // Các trường DTO/UI phục vụ hiển thị trên page.tsx
  subtopic?: string;
  lesson_title?: string;
  course_title?: string;
  options?: QuestionOption[];
  submitted_for_review_at?: string | null;
  version?: number;
  created_by?: string | null;
  updated_by?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  deleted_at?: string | null;
  deleted_by?: string | null;
}

export interface QuestionHistoryItem {
  id: string;
  question_id: string;
  version: number;
  action: 'created' | 'updated' | 'submitted' | 'approved' | 'rejected' | 'unapproved';
  from_status?: QuestionStatus | null;
  to_status?: QuestionStatus | null;
  actor_id: string;
  reason?: string | null;
  snapshot?: Record<string, unknown> | null;
  created_at: string;
}

export interface QuestionFilters {
  search?: string;
  course_id?: string;
  difficulty?: DifficultyLevel | 'all';
  is_ai_generated?: boolean | 'all';
}

export type QuestionPayload = {
  course_id: string;
  chapter_id: string;
  lesson_id: string | null;
  question_type: QuestionType;
  difficulty: DifficultyLevel;
  content: string;
  explanation?: string | null;
  status: QuestionStatus;
  options: QuestionOption[];
  expected_version?: number;
};

export type AiGeneratedQuestion = {
  course_id?: string;
  chapter_id?: string;
  lesson_id?: string;
  chapter_title?: string;
  lesson_title?: string;
  client_id: string;
  content: string;
  question_type: QuestionType;
  difficulty: DifficultyLevel;
  explanation: string;
  options: QuestionOption[];
};

export type GenerateAiQuestionsRequest = {
  course_id: string;
  chapter_id?: string;
  lesson_id?: string;
  question_type: QuestionType;
  difficulty: DifficultyLevel;
  count: number;
  topic?: string;
  instructions?: string;
  exclude_contents?: string[];
};

export type SaveAiDraftRequest = {
  batch_id: string;
  questions: Array<AiGeneratedQuestion & {
    course_id: string;
    chapter_id: string;
    lesson_id: string;
  }>;
};

export type CourseOption = { id: string; title: string; slug?: string };
export type ChapterOption = { id: string; course_id: string; title: string; order_index: number };
export type LessonOption = { id: string; chapter_id?: string; title: string; order_index: number };
