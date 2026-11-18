export type LessonValidationField =
  | 'title'
  | 'content'
  | 'code_example'
  | 'estimated_duration_minutes'
  | 'chapter';

export type LessonValidationIssue = {
  code: string;
  field: LessonValidationField;
  message: string;
};

export type LessonValidationResult = {
  valid: boolean;
  lesson_version: number;
  errors: LessonValidationIssue[];
  warnings: LessonValidationIssue[];
};

type LessonInput = {
  title: string | null;
  content: string | null;
  code_example: string | null;
  estimated_duration_minutes: number | null;
  version: number;
  chapter_title: string;
};

type PeerLesson = {
  id: string;
  title: string | null;
  content: string | null;
};

const STOP_WORDS = new Set([
  'bai', 'chuong', 'hoc', 'gioi', 'thieu', 'tong', 'quan', 'can', 'ban',
  'trong', 'va', 'voi', 'cua', 'cho', 'mot', 'nhung', 'cac', 'lap', 'trinh',
]);

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('vi')
    .replace(/[^a-z0-9#+]+/g, ' ')
    .trim();
}

function tokens(value: string) {
  return new Set(normalize(value).split(/\s+/).filter((token) => token.length >= 3 && !STOP_WORDS.has(token)));
}

function similarity(first: string, second: string) {
  const left = tokens(first);
  const right = tokens(second);
  if (left.size < 10 || right.size < 10) return 0;
  let intersection = 0;
  for (const token of left) if (right.has(token)) intersection += 1;
  return intersection / (left.size + right.size - intersection);
}

export function validateLessonContent(lesson: LessonInput, peers: PeerLesson[]): LessonValidationResult {
  const errors: LessonValidationIssue[] = [];
  const warnings: LessonValidationIssue[] = [];
  const title = lesson.title?.trim() ?? '';
  const content = lesson.content?.trim() ?? '';
  const codeExample = lesson.code_example?.trim() ?? '';

  if (title.length < 3) errors.push({ code: 'TITLE_REQUIRED', field: 'title', message: 'Tiêu đề phải có ít nhất 3 ký tự.' });
  if (title.length > 160) errors.push({ code: 'TITLE_TOO_LONG', field: 'title', message: 'Tiêu đề không được vượt quá 160 ký tự.' });
  if (content.length < 100) errors.push({ code: 'CONTENT_TOO_SHORT', field: 'content', message: 'Nội dung phải có ít nhất 100 ký tự trước khi duyệt.' });
  if (content.length > 100_000) errors.push({ code: 'CONTENT_TOO_LONG', field: 'content', message: 'Nội dung không được vượt quá 100.000 ký tự.' });
  if (codeExample.length > 50_000) errors.push({ code: 'CODE_TOO_LONG', field: 'code_example', message: 'Ví dụ C# không được vượt quá 50.000 ký tự.' });
  if (!lesson.estimated_duration_minutes || lesson.estimated_duration_minutes < 1 || lesson.estimated_duration_minutes > 1440) {
    errors.push({ code: 'INVALID_DURATION', field: 'estimated_duration_minutes', message: 'Thời lượng bài học phải từ 1 đến 1.440 phút.' });
  }
  if (/<script\b|javascript\s*:|\bon\w+\s*=/i.test(`${content}\n${codeExample}`)) {
    errors.push({ code: 'UNSAFE_CONTENT', field: 'content', message: 'Nội dung chứa HTML hoặc mã script không được phép.' });
  }

  if (!/(mục tiêu|sau bài học|học viên sẽ|người học sẽ)/i.test(content)) {
    warnings.push({ code: 'MISSING_OBJECTIVE', field: 'content', message: 'Chưa nhận diện được mục tiêu học tập rõ ràng.' });
  }
  if (!/(ví dụ|example|```)/i.test(content) && !codeExample) {
    warnings.push({ code: 'MISSING_EXAMPLE', field: 'content', message: 'Bài học chưa có ví dụ minh họa.' });
  }
  if (!codeExample) warnings.push({ code: 'MISSING_CODE_EXAMPLE', field: 'code_example', message: 'Bài học chưa có ví dụ mã C#.' });

  const normalizedTitle = normalize(title);
  for (const peer of peers) {
    if (normalizedTitle && normalize(peer.title ?? '') === normalizedTitle) {
      warnings.push({ code: 'DUPLICATE_TITLE', field: 'title', message: `Tiêu đề trùng với bài học “${peer.title}”.` });
      break;
    }
    if (similarity(content, peer.content ?? '') >= 0.85) {
      warnings.push({ code: 'SIMILAR_CONTENT', field: 'content', message: `Nội dung gần trùng với bài học “${peer.title ?? peer.id}”.` });
      break;
    }
  }

  const chapterTokens = tokens(lesson.chapter_title);
  const lessonTokens = tokens(`${title} ${content}`);
  if (chapterTokens.size > 0 && ![...chapterTokens].some((token) => lessonTokens.has(token))) {
    warnings.push({ code: 'CHAPTER_RELEVANCE', field: 'chapter', message: `Nội dung chưa thể hiện rõ chủ đề của chương “${lesson.chapter_title}”.` });
  }

  return { valid: errors.length === 0, lesson_version: lesson.version, errors, warnings };
}
