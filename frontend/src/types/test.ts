export type DifficultyLevel = 'Easy' | 'Medium' | 'Hard';

export type TestStatus = 'Published' | 'Approved' | 'In review' | 'Draft';

export interface TestItem {
  id: string;
  title: string;
  createdAt: string;
  course: string;
  questionsCount: number;
  durationMinutes: number;
  difficulty: DifficultyLevel;
  status: TestStatus;
  attemptsCount: number;
}