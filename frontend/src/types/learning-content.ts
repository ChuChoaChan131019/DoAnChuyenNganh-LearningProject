export type ContentStatus = "Published" | "Draft" | "Approved" | "In review";

export type CourseLevel = "Beginner" | "Intermediate" | "Advanced";

export interface Category {
  id: string | number;
  name: string;
  slug: string;
  description: string;
  courses: number;
  created: string;
  status: ContentStatus;
}

export interface Course {
  id: string | number;
  categoryId?: string;
  title: string;
  slug: string;
  category: string;
  description: string;
  level: CourseLevel;
  status: ContentStatus;
  chapters: number;
  lessons: number;
  updated: string;
  gradient: string;
}

export interface CourseDetail extends Course {
  questions: number;
  author: string;
  created: string;
  thumbnailUrl: string | null;
  chapterList: Array<{
    id: string;
    title: string;
    lessons: number;
    status: ContentStatus;
  }>;
}

export interface CategoryCourse extends Omit<Course, "id"> {
  id: string;
}

export interface Lesson {
  id?: string;
  code: string;
  title: string;
  duration: string;
  status: ContentStatus;
  ai?: boolean;
  slug?: string;
  chapter?: string;
}

export interface Chapter {
  id: string | number;
  title: string;
  summary: string;
  lessons: Lesson[];
}

export type ResourceType =
  | "PDF"
  | "Video"
  | "Article"
  | "Code Sample"
  | "Slide Deck";

export interface LearningResource {
  id: number;
  title: string;
  course: string;
  lesson: string;
  type: ResourceType;
  size: string;
  updated: string;
  status: ContentStatus;
}
