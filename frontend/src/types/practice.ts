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

export interface WeakTopic {
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
  question_type: 'single_choice' | 'multiple_choice' | 'true_false' | 'fill_in_blank';
  difficulty: 'easy' | 'medium' | 'hard';
  content: string;
  explanation: string | null;
  courses: { id: string; title: string } | null;
  chapters: { id: string; title: string } | null;
  lessons: { id: string; title: string } | null;
  question_options: PracticeQuestionOption[];
}

export interface PracticeOverview {
  courses: PracticeCourse[];
  weakTopics: WeakTopic[];
}