import { describe, expect, it } from 'vitest';
import { validateLessonContent } from './lesson-validation.js';

const validLesson = {
  title: 'Vòng lặp for trong C#',
  content: '## Mục tiêu học tập\nSau bài học, học viên sẽ sử dụng được vòng lặp for.\n\n## Ví dụ\nĐoạn mã sau in các số từ 1 đến 10 và giải thích từng bước xử lý trong chương trình C#.',
  code_example: 'for (var i = 1; i <= 10; i++) Console.WriteLine(i);',
  estimated_duration_minutes: 15,
  version: 3,
  chapter_title: 'Vòng lặp',
};

describe('lesson content validation', () => {
  it('accepts a complete lesson', () => {
    expect(validateLessonContent(validLesson, [])).toEqual({
      valid: true,
      lesson_version: 3,
      errors: [],
      warnings: [],
    });
  });

  it('separates blocking errors from advisory warnings', () => {
    const result = validateLessonContent({
      ...validLesson,
      content: 'Ngắn',
      code_example: '',
      estimated_duration_minutes: 0,
    }, []);

    expect(result.valid).toBe(false);
    expect(result.errors.map((issue) => issue.code)).toEqual(expect.arrayContaining(['CONTENT_TOO_SHORT', 'INVALID_DURATION']));
    expect(result.warnings.map((issue) => issue.code)).toEqual(expect.arrayContaining(['MISSING_OBJECTIVE', 'MISSING_EXAMPLE', 'MISSING_CODE_EXAMPLE']));
  });

  it('blocks script-like content', () => {
    const result = validateLessonContent({ ...validLesson, content: `${validLesson.content}<script>alert(1)</script>` }, []);
    expect(result.errors).toContainEqual(expect.objectContaining({ code: 'UNSAFE_CONTENT' }));
  });

  it('warns about duplicate titles and highly similar content', () => {
    const result = validateLessonContent(validLesson, [{ id: 'peer', title: validLesson.title, content: validLesson.content }]);
    expect(result.warnings).toContainEqual(expect.objectContaining({ code: 'DUPLICATE_TITLE' }));
  });
});
