import { QuestionType } from './dto/question.dto.js';

export type QuestionValidationInput = {
  question_type: QuestionType | string;
  content: string;
  explanation?: string | null;
  options: Array<{
    option_text: string;
    is_correct: boolean;
    order_index?: number;
  }>;
};

export function normalizeQuestionText(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi-VN');
}

export function getQuestionValidationErrors(input: QuestionValidationInput): string[] {
  const errors: string[] = [];
  const content = input.content?.trim() ?? '';
  const explanation = input.explanation?.trim() ?? '';
  const options = Array.isArray(input.options) ? input.options : [];

  if (!content) errors.push('Question content is required');
  if (content.length > 5000) errors.push('Question content must be at most 5000 characters');
  if (!explanation) errors.push('Question explanation is required');
  if (explanation.length > 5000) errors.push('Question explanation must be at most 5000 characters');
  if (options.length > 8) errors.push('A question can contain at most 8 options');

  const seenOptions = new Set<string>();
  for (const option of options) {
    const text = option?.option_text?.trim() ?? '';
    if (!text) errors.push('Option text is required');
    if (text.length > 1000) errors.push('Option text must be at most 1000 characters');
    const normalized = normalizeQuestionText(text);
    if (normalized && seenOptions.has(normalized)) errors.push('Options must not be duplicated');
    if (normalized) seenOptions.add(normalized);
  }

  const correctCount = options.filter((option) => option.is_correct === true).length;
  const hasIncorrectOption = options.some((option) => option.is_correct === false);
  switch (input.question_type) {
    case QuestionType.SINGLE_CHOICE:
      if (options.length < 2 || correctCount !== 1) {
        errors.push('single_choice requires 2-8 options and exactly one correct option');
      }
      break;
    case QuestionType.MULTIPLE_CHOICE:
      if (options.length < 3 || correctCount < 2 || !hasIncorrectOption) {
        errors.push('multiple_choice requires at least two correct options and one incorrect option');
      }
      break;
    case QuestionType.TRUE_FALSE: {
      const labels = new Set(options.map((option) => normalizeQuestionText(option.option_text)));
      if (options.length !== 2 || correctCount !== 1 || !labels.has('đúng') || !labels.has('sai')) {
        errors.push('true_false requires the standard Đúng and Sai options with exactly one correct option');
      }
      break;
    }
    case QuestionType.FILL_IN_BLANK:
      if (options.length !== 1 || correctCount !== 1) {
        errors.push('fill_in_blank requires one correct option containing the standard answer');
      }
      break;
    default:
      errors.push('Unsupported question type');
  }

  return [...new Set(errors)];
}

export function assertValidQuestion(input: QuestionValidationInput): void {
  const errors = getQuestionValidationErrors(input);
  if (errors.length > 0) throw new Error(errors.join('; '));
}
