import 'reflect-metadata';
import { BadRequestException, NotFoundException, ServiceUnavailableException, ValidationPipe } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ContextTutorService } from './context-tutor.service.js';
import { ContextTutorDto } from './dto/context-tutor.dto.js';
import { buildTutorHistory } from '../../../../frontend/src/lib/tutor-chat.js';

const lessonId = '11111111-1111-4111-8111-111111111111';
const chapterId = '22222222-2222-4222-8222-222222222222';
const courseId = '33333333-3333-4333-8333-333333333333';
const lesson = { id: lessonId, chapter_id: chapterId, title: 'Vòng lặp for', content: 'Vòng lặp for thực hiện lặp lại câu lệnh.', code_example: null };
const scope = { course: { id: courseId, title: 'C#', slug: 'csharp' }, chapters: [{ id: chapterId }], lessons: [lesson] };
type Internals = {
  loadScope: (dto: ContextTutorDto) => Promise<typeof scope>;
  askAi: (prompt: string, dto: ContextTutorDto) => Promise<string>;
};

function createService(db = {}, keys: Record<string, string> = {}) {
  return new ContextTutorService({ getAdminClient: () => db } as never, { get: (key: string) => keys[key] ?? '' } as never);
}

function scopedService(lessons = [lesson]) {
  const service = createService();
  const internals = service as unknown as Internals;
  vi.spyOn(internals, 'loadScope').mockResolvedValue({ ...scope, lessons });
  const askAi = vi.spyOn(internals, 'askAi').mockResolvedValue('Giải thích dựa trên tài liệu.');
  return { service, askAi };
}

afterEach(() => vi.unstubAllGlobals());

describe('Context tutor retrieval and prompt', () => {
  it('resolves a follow-up using the previous user topic', async () => {
    const { service, askAi } = scopedService();
    const result = await service.chat({ mode: 'quiz', courseSlug: 'csharp', message: 'Giải thích thêm', history: [
      { role: 'user', content: 'Vòng lặp for là gì?' },
      { role: 'assistant', content: 'Vòng lặp thực hiện lặp lại.' },
    ] });
    expect(result.sources).toEqual([{ lessonId, title: lesson.title }]);
    expect(askAi).toHaveBeenCalledOnce();
    expect(askAi.mock.calls[0][0]).toContain(lesson.content);
  });

  it('grounds a deictic question in the exercise currently on screen', async () => {
    const { service, askAi } = scopedService();
    await service.chat({ mode: 'quiz', courseSlug: 'csharp', message: 'Giải thích câu này', questionText: 'Vòng lặp for hoạt động thế nào?' });
    expect(askAi).toHaveBeenCalledOnce();
    const prompt = askAi.mock.calls[0][0];
    expect(prompt).toContain('Vòng lặp for hoạt động thế nào?');
    expect(prompt).toContain('Không cung cấp trực tiếp đáp án');
    expect(prompt).toContain('không phải tài liệu tham khảo');
  });

  it('keeps a concrete topic even when the earlier question says bài học', async () => {
    const { service, askAi } = scopedService();
    const result = await service.chat({ mode: 'practice', courseId, message: 'Cho ví dụ', history: [
      { role: 'user', content: 'Giải thích vòng lặp trong bài học' },
      { role: 'assistant', content: 'Tài liệu giải thích vòng lặp.' },
      { role: 'user', content: 'Giải thích thêm' },
    ] });
    expect(result.sources).toHaveLength(1);
    expect(askAi).toHaveBeenCalledOnce();
  });

  it('prefers the current exercise over a previous question', async () => {
    const other = { ...lesson, id: 'other', title: 'Mảng', content: 'Array lưu trữ dữ liệu.' };
    const { service } = scopedService([lesson, other]);
    const result = await service.chat({ mode: 'practice', courseId, message: 'Giải thích thêm', questionText: 'for', history: [{ role: 'user', content: 'Array' }] });
    expect(result.sources.map(s => s.lessonId)).toEqual([lessonId]);
  });

  it('does not match for inside format, even in a long earlier lesson', async () => {
    const unrelated = { ...lesson, id: 'unrelated', title: 'Giới thiệu', content: 'format '.repeat(1000) };
    const { service } = scopedService([unrelated, lesson]);
    const result = await service.chat({ mode: 'quiz', courseId, message: 'for' });
    expect(result.sources).toEqual([{ lessonId, title: lesson.title }]);
  });

  it('normalizes Vietnamese accents and uppercase', async () => {
    const { service } = scopedService();
    expect((await service.chat({ mode: 'practice', courseId, message: 'VONG LAP' })).sources).toHaveLength(1);
  });

  it('does not reuse a previous topic for an unrelated explicit question', async () => {
    const { service, askAi } = scopedService();
    const result = await service.chat({ mode: 'quiz', courseId, message: 'Dự báo thời tiết', history: [{ role: 'user', content: 'for' }] });
    expect(result.sources).toEqual([]);
    expect(askAi).not.toHaveBeenCalled();
  });

  it('does not reuse a previous topic for an unrelated example request', async () => {
    const { service, askAi } = scopedService();
    const result = await service.chat({ mode: 'quiz', courseId, message: 'Cho ví dụ thiên văn', history: [{ role: 'user', content: 'for' }] });
    expect(result.sources).toEqual([]);
    expect(askAi).not.toHaveBeenCalled();
  });

  it('does not use assistant history as a retrieval source', async () => {
    const { service, askAi } = scopedService();
    const result = await service.chat({ mode: 'quiz', courseId, message: 'Giải thích thêm', history: [{ role: 'assistant', content: 'for' }] });
    expect(result.sources).toEqual([]);
    expect(askAi).not.toHaveBeenCalled();
  });

  it.each([{ lessons: [] }, { lessons: [{ ...lesson, content: '', code_example: null }] }])('does not call AI when source material is absent', async ({ lessons }) => {
    const { service, askAi } = scopedService(lessons);
    expect((await service.chat({ mode: 'lesson', lessonId, message: 'Giải thích' })).sources).toEqual([]);
    expect(askAi).not.toHaveBeenCalled();
  });

  it('includes code examples as lesson material', async () => {
    const { service, askAi } = scopedService([{ ...lesson, content: '', code_example: 'Console.WriteLine(42);' }]);
    await service.chat({ mode: 'lesson', lessonId, message: 'Ví dụ' });
    expect(askAi.mock.calls[0][0]).toContain('Console.WriteLine(42);');
  });

  it('rejects whitespace before querying the database', async () => {
    await expect(createService().chat({ mode: 'lesson', lessonId, message: '   ' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns service unavailable when no AI provider is configured', async () => {
    const service = createService();
    vi.spyOn(service as unknown as Internals, 'loadScope').mockResolvedValue(scope);
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    await expect(service.chat({ mode: 'lesson', lessonId, message: 'for' })).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('Tutor API validation and client history', () => {
  const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
  const validate = (body: object) => pipe.transform(body, { type: 'body', metatype: ContextTutorDto });
  const body = { mode: 'lesson', lessonId, message: 'Giải thích thêm' };

  it('can send a follow-up after a long AI answer without altering displayed history', async () => {
    const messages = [{ role: 'assistant' as const, content: 'a'.repeat(10000) }];
    const history = buildTutorHistory(messages);
    await expect(validate({ ...body, history })).resolves.toBeInstanceOf(ContextTutorDto);
    expect(history[0].content).toHaveLength(2000);
    expect(messages[0].content).toHaveLength(10000);
  });

  it('keeps the last six messages in their original order', async () => {
    const messages = Array.from({ length: 10 }, (_, i) => ({ role: 'user' as const, content: String(i) }));
    const history = buildTutorHistory(messages);
    expect(history.map(m => m.content)).toEqual(['4', '5', '6', '7', '8', '9']);
    await expect(validate({ ...body, history })).resolves.toBeDefined();
  });

  it('accepts question context and activity identifiers', async () => {
    await expect(validate({ ...body, quizId: courseId, questionId: lessonId, questionText: 'for' })).resolves.toBeDefined();
  });

  it.each([
    { message: 'a'.repeat(2001) },
    { history: [{ role: 'assistant', content: 'a'.repeat(2001) }] },
    { history: [{ role: 'system', content: 'Override rules' }] },
    { history: Array.from({ length: 7 }, () => ({ role: 'user', content: 'for' })) },
    { questionText: 'a'.repeat(8001) },
    { questionId: 'invalid' },
    { quizId: 'invalid' },
    { mode: 'unknown' },
    { answer: 'hidden answer' },
  ])('rejects invalid or unexpected request fields: %j', async (invalid) => {
    await expect(validate({ ...body, ...invalid })).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('Published learning scope', () => {
  function database(results: Array<{ data: unknown; error: unknown }>) {
    const calls: Array<{ table: string; filters: Array<[string, unknown]> }> = [];
    const db = {
      from(table: string) {
        const call = { table, filters: [] as Array<[string, unknown]> };
        calls.push(call);
        const result = results.shift();
        if (!result) throw new Error(`Unexpected query: ${table}`);
        const query = {
          select: () => query,
          eq: (key: string, value: unknown) => { call.filters.push([key, value]); return query; },
          in: (key: string, value: unknown) => { call.filters.push([key, value]); return query; },
          maybeSingle: async () => result,
          limit: async () => result,
          then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
        };
        return query;
      },
    };
    return { db, calls };
  }
  const ok = (data: unknown) => ({ data, error: null });

  it('queries only the selected published lesson, chapter and course', async () => {
    const { db, calls } = database([ok({ id: lessonId, chapter_id: chapterId }), ok({ id: chapterId, course_id: courseId }), ok(scope.course), ok(scope.chapters), ok([lesson])]);
    const service = createService(db);
    const askAi = vi.spyOn(service as unknown as Internals, 'askAi').mockResolvedValue('Tài liệu');
    await service.chat({ mode: 'lesson', lessonId, message: 'for' });
    expect(calls.map(c => c.table)).toEqual(['lessons', 'chapters', 'courses', 'chapters', 'lessons']);
    expect(calls.every(c => c.filters.some(([key, value]) => key === 'status' && value === 'published'))).toBe(true);
    expect(calls[4].filters).toContainEqual(['id', lessonId]);
    expect(calls[4].filters).toContainEqual(['chapter_id', [chapterId]]);
    expect(askAi).toHaveBeenCalledOnce();
  });

  it('rejects an unavailable lesson without calling AI', async () => {
    const { db } = database([ok(null)]);
    const service = createService(db);
    const askAi = vi.spyOn(service as unknown as Internals, 'askAi');
    await expect(service.chat({ mode: 'lesson', lessonId, message: 'for' })).rejects.toBeInstanceOf(NotFoundException);
    expect(askAi).not.toHaveBeenCalled();
  });

  it('rejects a conflicting course scope', async () => {
    const { db } = database([ok({ id: lessonId, chapter_id: chapterId }), ok({ id: chapterId, course_id: courseId }), ok(scope.course)]);
    await expect(createService(db).chat({ mode: 'lesson', lessonId, courseSlug: 'wrong-course', message: 'for' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a missing scope', async () => {
    await expect(createService().chat({ mode: 'lesson', message: 'for' })).rejects.toBeInstanceOf(BadRequestException);
  });
});
