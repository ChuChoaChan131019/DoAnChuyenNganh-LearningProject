export type DifficultyLevel = 'Easy' | 'Medium' | 'Hard';

export interface PracticeSetItem {
  id: string;
  title: string;
  course: string;
  questionCount: number;
  difficulty: DifficultyLevel;
  averageScore: number; 
}

export interface PracticeCourse {
  id: string;
  title: string;
  slug: string;
}

export interface PracticeChapter {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
}

export interface WeakChapter {
  id: string;
  name: string;
  accuracy: number;
  attempts: number;
}

export interface PracticeQuestionOption {
  id: string;
  option_text: string;
  order_index: number;
}

export interface PracticeQuestion {
  id: string;
  course_id: string;
  chapter_id: string | null;
  lesson_id: string | null;
  question_type: 'single_choice' | 'multiple_choice' | 'true_false' | 'fill_in_blank';
  difficulty: 'easy' | 'medium' | 'hard';
  content: string;
  courses: { id: string; title: string } | null;
  chapters: { id: string; title: string } | null;
  lessons: { id: string; title: string } | null;
  question_options: PracticeQuestionOption[];
}

export interface GenerateAiPracticeRequest {
  lessonId?: string;
  courseId?: string;
  chapterId?: string;
  count?: number;
  difficulty?: 'easy' | 'medium' | 'hard' | 'mixed';
  prompt?: string;
}

export interface GenerateAiPracticeResponse {
  mode: 'ai';
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  rationale: string;
  questions: PracticeQuestion[];
}

export type AiPracticeSetStatus = 'generating' | 'ready' | 'failed';

export interface AiPracticeSet {
  id: string;
  course_id: string;
  chapter_id: string;
  lesson_id: string;
  lesson_title: string;
  status: AiPracticeSetStatus;
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  requested_count: number;
  generated_count: number;
  error_code: string | null;
  attempt_count: number;
  created_at: string;
  completed_at: string | null;
}

export interface CreateAiPracticeSetRequest {
  lessonId: string;
  count?: number;
  difficulty?: 'easy' | 'medium' | 'hard' | 'mixed';
  prompt?: string;
}

export interface CreatedAiPracticeSet {
  id: string;
  course_id: string;
  chapter_id: string;
  lesson_id: string;
  status: 'generating';
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  requested_count: number;
  generated_count: number;
  created_at: string;
}

export interface AiPracticeSetQuestionsResponse {
  mode: 'ai';
  set: {
    id: string;
    course_id: string;
    chapter_id: string;
    lesson_id: string;
    lesson_title: string;
    difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  };
  questions: PracticeQuestion[];
}

export interface PracticeOverview {
  courses: PracticeCourse[];
  chapters: PracticeChapter[];
  weakChapters: WeakChapter[];
}
