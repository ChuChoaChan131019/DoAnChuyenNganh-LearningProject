import "reflect-metadata";
import { ConfigService } from "@nestjs/config";
import { SupabaseService } from "../backend/dist/config/supabase.service.js";
import { AiService } from "../backend/dist/modules/ai/ai.service.js";
const scope = process.env.AUTHORING_SMOKE_SCOPE || "lesson";
if (!["course", "chapter", "lesson"].includes(scope)) throw new Error("Invalid AUTHORING_SMOKE_SCOPE");
const config = new ConfigService({
  ...process.env,
  ...(process.env.AUTHORING_SMOKE_GEMINI_ONLY === "1"
    ? { OPENAI_API_KEY: "" }
    : {}),
});
const supabase = new SupabaseService(config);
const db = supabase.getAdminClient();
const { data: lessons, error } = await db
  .from("lessons")
  .select("id,chapter_id,content")
  .not("content", "is", null)
  .limit(30);
if (error) throw new Error("Unable to read lesson metadata");
const lesson = lessons.find(
  (row) => row.content?.replace(/\s/g, "").length > 100,
);
if (!lesson) throw new Error("No usable source found");
const { data: chapter } = await db
  .from("chapters")
  .select("id,course_id")
  .eq("id", lesson.chapter_id)
  .single();
console.log(
  JSON.stringify({
    scope,
    models: {
      gemini: process.env.AI_QUESTION_MODEL || "gemini-flash-latest",
      openai: process.env.AI_QUESTION_OPENAI_MODEL || "gpt-4o-mini",
    },
    test: "one real authoring service request; no database writes; not authenticated HTTP acceptance",
  }),
);
try {
  const result = await new AiService(
    config,
    supabase,
  ).generateAuthoringQuestions(
    {
      course_id: chapter.course_id,
      ...(scope !== "course" ? { chapter_id: chapter.id } : {}),
      ...(scope === "lesson" ? { lesson_id: lesson.id } : {}),
      question_type: "single_choice",
      difficulty: "easy",
      count: 1,
    },
    "authoring-readonly-smoke",
  );
  console.log(
    JSON.stringify({
      success: true,
      count: result.questions.length,
      type: result.questions[0].question_type,
      difficulty: result.questions[0].difficulty,
      scope: result.source.scope,
      sourceMatches: result.questions.every(question =>
        question.course_id === chapter.course_id &&
        (scope === "course" || question.chapter_id === chapter.id) &&
        (scope !== "lesson" || question.lesson_id === lesson.id) &&
        result.source.lessons.some(source => source.lesson_id === question.lesson_id && source.chapter_id === question.chapter_id)),
    }),
  );
} catch (error) {
  const response = error.getResponse?.();
  const detail =
    response && typeof response === "object" ? response.error : undefined;
  process.exitCode = 1;
  console.log(
    JSON.stringify({
      success: false,
      status: error.getStatus?.(),
      code: detail && typeof detail === "object" ? detail.code : undefined,
      message:
        detail && typeof detail === "object" ? detail.message : error.message,
    }),
  );
}
