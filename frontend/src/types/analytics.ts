export interface MetricOverview {
  totalAttempts: number;
  attemptsGrowth: number;
  averageScore: number;
  scoreGrowth: number;
  passRate: number;
  weakestTopic: string;
}

export interface TestScoreChartData {
  label: string;
  score: number;
}

export interface StruggleTopic {
  topic: string;
  accuracy: number;
}

export interface RecentAttemptSummary {
  id: string;
  testTitle: string;
  courseName: string;
  attemptsCount: number;
  avgScore: number;
}