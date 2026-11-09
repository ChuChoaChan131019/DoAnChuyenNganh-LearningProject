export type TutorMode = "lesson" | "practice" | "quiz";

export type TutorContext = {
  mode: TutorMode;
  lessonId?: string;
  chapterId?: string;
  courseId?: string;
  courseSlug?: string;
  quizId?: string;
  questionId?: string;
  questionText?: string;
};

export type TutorChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type TutorContextRequest = TutorContext & {
  message: string;
  history: TutorChatMessage[];
};

export type TutorContextResponse = {
  answer: string;
  sources: Array<{
    lessonId: string;
    title: string;
  }>;
};
