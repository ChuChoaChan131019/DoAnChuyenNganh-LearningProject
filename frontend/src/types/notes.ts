export interface NoteLessonInfo {
  id: string;
  title: string;
  chapter_id?: string;
  chapter_title?: string;
  course_id?: string;
  course_title?: string;
  course_slug?: string;
}

export interface Note {
  id: string;
  learner_id: string;
  lesson_id?: string;
  title?: string;
  content: string;
  created_at: string;
  updated_at: string;
  lesson?: NoteLessonInfo | null;
}

export interface CreateNotePayload {
  title?: string;
  content: string;
  lesson_id?: string;
}

export interface UpdateNotePayload {
  title?: string;
  content?: string;
  lesson_id?: string;
}
