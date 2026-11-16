import type {
  AiGeneratedQuestion,
  QuestionOption,
  QuestionType,
  SaveAiDraftRequest,
} from "../types/question";

export function changeQuestionOptions(
  options: QuestionOption[],
  type: QuestionType,
): QuestionOption[] {
  const clean = options.map(({ option_text, is_correct }, order_index) => ({
    option_text,
    is_correct,
    order_index,
  }));
  if (type === "fill_in_blank")
    return [
      {
        option_text:
          clean.find((option) => option.is_correct)?.option_text ??
          clean[0]?.option_text ??
          "",
        is_correct: true,
        order_index: 0,
      },
    ];
  if (type === "true_false")
    return [
      { option_text: "Đúng", is_correct: false, order_index: 0 },
      { option_text: "Sai", is_correct: false, order_index: 1 },
    ];
  const result = clean.slice(0, 8);
  const minimum = type === "multiple_choice" ? 3 : 2;
  while (result.length < minimum)
    result.push({
      option_text: "",
      is_correct: false,
      order_index: result.length,
    });
  if (type === "single_choice") {
    const first = result.findIndex((option) => option.is_correct);
    return result.map((option, index) => ({
      ...option,
      is_correct: index === first,
    }));
  }
  return result;
}

export function draftErrors(question: AiGeneratedQuestion): string[] {
  const errors: string[] = [];
  if (!question.content.trim()) errors.push("Nhập đề bài.");
  if (!question.explanation.trim()) errors.push("Nhập giải thích.");
  if (question.content.length > 5000 || question.explanation.length > 5000)
    errors.push("Đề bài và giải thích tối đa 5.000 ký tự.");
  const options = question.options;
  if (
    options.some(
      (option) =>
        !option.option_text.trim() || option.option_text.length > 1000,
    )
  )
    errors.push("Mỗi đáp án cần nội dung, tối đa 1.000 ký tự.");
  const labels = options.map((option) =>
    option.option_text.trim().replace(/\s+/g, " ").toLocaleLowerCase("vi-VN"),
  );
  if (new Set(labels).size !== options.length)
    errors.push("Các đáp án không được trùng nhau.");
  const correct = options.filter((option) => option.is_correct).length;
  if (options.length > 8) errors.push("Tối đa tám đáp án.");
  if (
    question.question_type === "multiple_choice" &&
    (options.length < 3 || correct < 2 || correct === options.length)
  )
    errors.push(
      "Chọn ít nhất hai đáp án đúng và một đáp án sai (3–8 lựa chọn).",
    );
  if (
    question.question_type === "single_choice" &&
    (options.length < 2 || correct !== 1)
  )
    errors.push("Chọn đúng một đáp án (2–8 lựa chọn).");
  if (
    question.question_type === "true_false" &&
    (options.length !== 2 ||
      correct !== 1 ||
      !labels.includes("đúng") ||
      !labels.includes("sai"))
  )
    errors.push("Đúng/Sai cần hai nhãn chuẩn và đúng một đáp án đúng.");
  if (
    question.question_type === "fill_in_blank" &&
    (options.length !== 1 || correct !== 1)
  )
    errors.push("Nhập một đáp án chuẩn.");
  return errors;
}

export function makeSaveSnapshot(
  batchId: string,
  questions: SaveAiDraftRequest["questions"],
): SaveAiDraftRequest {
  if (questions.length < 1 || questions.length > 10)
    throw new Error("Mỗi lần lưu từ 1 đến 10 câu.");
  // Explicitly whitelist the wire fields; the snapshot never shares mutable options with the editor.
  return {
    batch_id: batchId,
    questions: questions.map((question) => ({
      client_id: question.client_id,
      course_id: question.course_id,
      chapter_id: question.chapter_id,
      lesson_id: question.lesson_id,
      content: question.content,
      question_type: question.question_type,
      difficulty: question.difficulty,
      explanation: question.explanation,
      options: question.options.map(
        ({ option_text, is_correct }, order_index) => ({
          option_text,
          is_correct,
          order_index,
        }),
      ),
    })),
  };
}

export function completeSavedMapping(
  snapshot: SaveAiDraftRequest,
  saved: Array<{ client_id: string; id: string }> | undefined,
): boolean {
  if (!Array.isArray(saved) || saved.length !== snapshot.questions.length)
    return false;
  const clients = new Set(
    snapshot.questions.map((question) => question.client_id),
  );
  return (
    new Set(saved.map((item) => item.client_id)).size === clients.size &&
    new Set(saved.map((item) => item.id)).size === saved.length &&
    saved.every(
      (item) =>
        clients.has(item.client_id) &&
        typeof item.id === "string" &&
        !!item.id.trim(),
    )
  );
}

/** Retain server placement when a broad scope supplies no selected lesson. */
export function resolveGeneratedSource(
  question: AiGeneratedQuestion,
  selected: { course_id: string; chapter_id?: string; lesson_id?: string },
): { course_id: string; chapter_id: string; lesson_id: string } | null {
  const course_id = question.course_id || selected.course_id;
  const chapter_id = question.chapter_id || selected.chapter_id;
  const lesson_id = question.lesson_id || selected.lesson_id;
  if (!course_id || !chapter_id || !lesson_id || course_id !== selected.course_id
    || (selected.chapter_id && chapter_id !== selected.chapter_id)
    || (selected.lesson_id && lesson_id !== selected.lesson_id)) return null;
  return { course_id, chapter_id, lesson_id };
}
