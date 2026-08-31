// src/types/question.ts

export type QuestionType =
  | 'single_choice'
  | 'multiple_choice'
  | 'true_false'
  | 'fill_in_blank';

export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export type QuestionStatus = 'draft' | 'approved';

export interface QuestionOption {
  id: string;
  question_id: string;
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

  // Các trường DTO/UI phục vụ hiển thị trên page.tsx
  subtopic?: string;
  lesson_title?: string;
  course_title?: string;
  options?: QuestionOption[];
}

export interface QuestionFilters {
  search?: string;
  course_id?: string;
  difficulty?: DifficultyLevel | 'all';
  is_ai_generated?: boolean | 'all';
}