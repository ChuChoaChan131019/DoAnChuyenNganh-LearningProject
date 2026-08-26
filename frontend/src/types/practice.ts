export type DifficultyLevel = 'Easy' | 'Medium' | 'Hard';

export interface PracticeSetItem {
  id: string;
  title: string;
  course: string;
  questionCount: number;
  difficulty: DifficultyLevel;
  averageScore: number; 
}