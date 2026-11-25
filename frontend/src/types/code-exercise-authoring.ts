export type CodeDifficulty = 'easy' | 'medium' | 'hard';

export type AuthorTestCase = {
  input: string;
  expected_output: string;
  is_public: boolean;
};

export type CodeExercisePayload = {
  lesson_id: string;
  title: string;
  difficulty: CodeDifficulty;
  objective: string;
  description: string;
  input_format: string;
  output_format: string;
  starter_code: string;
  hint_1: string;
  hint_2: string;
  hint_3: string;
  solution_code: string;
  solution_explanation: string;
  test_cases: AuthorTestCase[];
};

export type CodeExerciseListItem = {
  id: string;
  can_edit: boolean;
  lesson_id: string;
  title: string;
  difficulty: CodeDifficulty;
  status: "draft" | "published";
  edit_version: number;
  revision_no: number;
  has_draft: boolean;
  is_published: boolean;
  updated_at: string;
};

export type CodeExerciseDetail = {
  id: string;
  can_edit: boolean;
  lesson_id: string;
  archived_at: string | null;
  published_revision_id: string | null;
  revision: Omit<CodeExercisePayload, "lesson_id" | "test_cases"> & {
    id: string;
    exercise_id: string;
    revision_no: number;
    edit_version: number;
    status: "draft" | "published" | "superseded";
    test_cases: Array<
      AuthorTestCase & {
        id: string;
        order_index: number;
      }
    >;
  };
  revisions: Array<{
    id: string;
    revision_no: number;
    status: string;
    edit_version: number;
  }>;
};

export type SaveCodeExerciseResult = {
  id: string;
  revision_id: string;
  revision_no: number;
  edit_version: number;
  status: "draft";
};

export type CodeExerciseCheckResult = {
  can_publish: boolean;
  errors: string[];
  cases: Array<{
    index: number;
    is_public: boolean;
    status: string;
    expected_output: string;
    actual_output: string;
    stderr: string;
  }>;
};

export type PublishCodeExerciseResult = {
  id: string;
  revision_id: string;
  status: "published";
};
