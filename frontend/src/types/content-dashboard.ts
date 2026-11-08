export interface ContentDashboardData {
  overview: {
    totalCourses: number;
    totalLessons: number;
    totalQuestions: number;
    totalAiGenerated: number;
    aiLessons: number;
    aiQuestions: number;
  };

  status: {
    draft: number;
    approved: number;
    published: number;
  };

  growth: Array<{
    month: string;
    courses: number;
    lessons: number;
    questions: number;
    aiQuestions: number;
    manualQuestions: number;
  }>;

  questionDifficulty: {
    easy: number;
    medium: number;
    hard: number;
  };

  courseLevels: {
    beginner: number;
    intermediate: number;
    advanced: number;
  };
}
