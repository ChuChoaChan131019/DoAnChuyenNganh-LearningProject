export type LearningUnitKind = "lesson" | "quiz" | "code";

export type LearningUnitCount = {
  completed: number;
  total: number;
};

export type ContinueLearningItem = {
  kind: LearningUnitKind;
  title: string;
  course_title: string;
  course_slug: string;
  href: string;
  last_activity_at: string | null;
};

export type LearnerCourseOverview = {
  id: string;
  title: string;
  slug: string;
  started: boolean;
  completed_units: number;
  total_units: number;
  percentage: number;
  lessons: LearningUnitCount;
  quizzes: LearningUnitCount;
  code: LearningUnitCount;
  completed_lesson_ids: string[];
  last_activity_at: string | null;
  next: ContinueLearningItem | null;
};

export type LearnerOverview = {
  summary: {
    started_courses: number;
    completed_courses: number;
    completed_units: number;
    total_units: number;
    percentage: number;
    lessons: LearningUnitCount;
    quizzes: LearningUnitCount;
    code: LearningUnitCount;
  };
  continue_learning: ContinueLearningItem | null;
  courses: LearnerCourseOverview[];
};

export type LessonActivityResponse = {
  lesson_id: string;
  completed: boolean;
  completed_at: string | null;
  last_opened_at: string;
};