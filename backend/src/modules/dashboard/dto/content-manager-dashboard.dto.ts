export class CourseOptionDto {
  id: string;
  title: string;
  slug: string;
  status: string;
}

export class ContentManagerStatsDto {
  total_courses: number;
  total_lessons: number;
  total_questions: number;
  total_active_learners: number;
  published_count: number;
  draft_count: number;
  ai_generated_count: number;
  total_feedbacks: number;
  total_notifications: number;
}

export class StatusDistributionDto {
  published: number;
  approved: number;
  draft: number;
  in_review: number;
}

export class MonthlyGrowthDto {
  month: string;
  lessons: number;
  questions: number;
}

export class RecentActivityDto {
  id: string;
  type: 'lesson' | 'feedback' | 'notification' | 'course';
  title: string;
  description: string;
  timestamp: string;
}

export class ContentManagerDashboardResponseDto {
  courses: CourseOptionDto[];
  selected_course_id?: string;
  stats: ContentManagerStatsDto;
  status_distribution: StatusDistributionDto;
  monthly_growth: MonthlyGrowthDto[];
  recent_activities: RecentActivityDto[];
}
