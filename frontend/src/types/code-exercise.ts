export type CodeDifficulty = 'easy' | 'medium' | 'hard';
export type CodeProgressStatus = 'not_started' | 'in_progress' | 'completed';

export type CodeExerciseLocation = {
  id: string;
  title: string;
};

export type CodeExerciseListItem = {
  id: string;
  title: string;
  difficulty: CodeDifficulty;
  course: CodeExerciseLocation & { slug: string };
  chapter: CodeExerciseLocation;
  lesson: CodeExerciseLocation;
  published_revision_id: string;
  progress_status: CodeProgressStatus;
  requires_resubmission: boolean;
  last_saved_at: string | null;
};

export type CodeExerciseListResponse = {
  items: CodeExerciseListItem[];
  next_cursor: string | null;
};

export type CodeExerciseFilters = {
  search?: string;
  course_id?: string;
  chapter_id?: string;
  lesson_id?: string;
  difficulty?: CodeDifficulty;
  progress_status?: CodeProgressStatus;
  limit?: number;
  cursor?: string;
};

export type PublicCodeExample = {
  id: string;
  input: string;
  expected_output: string;
  order_index: number;
};

export type LearnerCodeExerciseDetail = {
  id: string;
  title: string;
  objective: string | null;
  description: string;
  difficulty: CodeDifficulty;
  input_format: string | null;
  output_format: string | null;
  starter_code: string;
  published_revision: { id: string; revision_no: number };
  course: CodeExerciseLocation & { slug: string };
  chapter: CodeExerciseLocation;
  lesson: CodeExerciseLocation;
  public_examples: PublicCodeExample[];
  progress: {
    has_saved_code: boolean;
    saved_code: string;
    save_version: number;
    status: CodeProgressStatus;
    last_seen_revision_id: string | null;
    requires_resubmission: boolean;
    updated_at: string | null;
  };
};

export type SaveLearnerCodeResponse = {
  exercise_id: string;
  save_version: number;
  updated_at: string;
};
