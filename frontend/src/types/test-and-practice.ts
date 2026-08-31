import { DifficultyLevel, QuestionType } from './question';

export type TestStatus = 'draft' | 'approved' | 'published';

// ============================================================================
// 1. PRACTICE SETS (Dùng cho thẻ bài luyện tập tự do)
// ============================================================================
export interface PracticeSetItem {
  id: string; // UUID (quizzes.id)
  title: string; // quizzes.title
  course: string; // JOIN courses.title
  course_id?: string;
  questionCount: number; // COUNT từ quiz_questions
  difficulty: DifficultyLevel;
  averageScore: number; // Điểm trung bình từ quiz_attempts
  is_active?: boolean;
}

// ============================================================================
// 2. TESTS (Dùng cho bảng danh sách bài thi/đánh giá)
// ============================================================================
export interface TestItem {
  id: string; // UUID
  course_id?: string;
  chapter_id?: string | null;
  title: string;
  duration_minutes: number;
  pass_score: number;
  shuffle_questions: boolean;
  shuffle_options: boolean;
  is_active: boolean;
  status: TestStatus;
  created_at: string;

  // DTO mở rộng cho Table
  course_title: string;
  questions_count: number;
  difficulty: DifficultyLevel;
  attempts_count: number;
}

// ============================================================================
// 3. TEST BUILDER (Dùng cho màn hình kéo thả tạo đề thi)
// ============================================================================
export interface BankQuestion {
  id: string; // UUID
  title: string; // Map từ content của questions
  type: QuestionType;
  lesson: string; // Map từ lesson_title
  difficulty: DifficultyLevel;
}

export interface TestSettings {
  title: string;
  description?: string;
  course_id: string;
  course_title: string;
  timeLimit: number; // duration_minutes
  passingScore: number; // pass_score
  randomiseQuestions: boolean; // shuffle_questions
  randomiseAnswers: boolean; // shuffle_options
  showExplanations: boolean;
}

// ============================================================================
// 4. ANALYTICS & STATS (Thống kê từ quiz_attempts, quiz_attempt_details)
// ============================================================================
export interface MetricOverview {
  totalAttempts: number; // COUNT(quiz_attempts.id)
  attemptsGrowth: number;
  averageScore: number; // AVG(quiz_attempts.total_score)
  scoreGrowth: number;
  passRate: number; // (COUNT(is_passed=true) / COUNT(*)) * 100
  weakestTopic: string;
}

export interface TestScoreChartData {
  label: string;
  score: number;
}

export interface StruggleTopic {
  topic: string;
  accuracy: number; // Tính từ quiz_attempt_details.is_correct
}

export interface RecentAttemptSummary {
  id: string; // UUID
  testTitle: string;
  courseName: string;
  attemptsCount: number;
  avgScore: number;
}