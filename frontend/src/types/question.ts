export type QuestionType =
  | 'Single Choice'
  | 'Multiple Choice'
  | 'True / False'
  | 'Fill in the Blank'
  | 'Coding';

export type DifficultyLevel = 'Easy' | 'Medium' | 'Hard';

export type QuestionSource = 'Human' | 'AI';

export type QuestionStatus = 'Published' | 'Approved' | 'In review' | 'Draft';

export interface QuestionItem {
  id: string;
  title: string;
  subtopic: string;
  type: QuestionType;
  lesson: string;
  difficulty: DifficultyLevel;
  source: QuestionSource;
  status: QuestionStatus;
}

export interface QuestionFilters {
  search: string;
  course: string;
  difficulty: string;
  source: string;
}