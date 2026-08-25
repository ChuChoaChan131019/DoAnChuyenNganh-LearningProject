export type DifficultyLevel = 'Easy' | 'Medium' | 'Hard';

export interface BankQuestion {
  id: string;
  title: string;
  type: string;
  lesson: string;
  difficulty: DifficultyLevel;
}

export interface TestSettings {
  title: string;
  description: string;
  course: string;
  timeLimit: number;
  passingScore: number;
  randomiseQuestions: boolean;
  randomiseAnswers: boolean;
  showExplanations: boolean;
}