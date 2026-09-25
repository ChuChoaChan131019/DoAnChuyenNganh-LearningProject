export interface Note {
  id: string;
  learner_id: string;
  lesson_id?: string;
  title?: string;
  content: string;
  created_at: string;
  updated_at: string;
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
