import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { validate } from 'class-validator';
import { AiService } from './ai.service.js';
import { GenerateAiQuestionsDto } from './dto/generate-ai-questions.dto.js';
import { QuestionDifficulty, QuestionType } from '../questions/dto/question.dto.js';

const course = '00000000-0000-4000-8000-000000000010';
const chapterA = '00000000-0000-4000-8000-000000000011';
const lessonA = '00000000-0000-4000-8000-000000000012';
const chapterB = '00000000-0000-4000-8000-000000000013';
const lessonB = '00000000-0000-4000-8000-000000000014';
const foreign = '00000000-0000-4000-8000-000000000099';
const question = { content: 'What does a variable store?', question_type: 'single_choice', difficulty: 'easy', explanation: 'Variables store typed values.', options: [
  { option_text: 'Values', is_correct: true, order_index: 0 }, { option_text: 'Compilation', is_correct: false, order_index: 1 },
] };
const base: GenerateAiQuestionsDto = { course_id: course, count: 1, question_type: QuestionType.SINGLE_CHOICE, difficulty: QuestionDifficulty.EASY };
const lesson = (id: string, chapter_id: string) => ({ id, chapter_id, title: `Variables ${id}`, content: 'Variables store typed values that can change during program execution in C#.', code_example: 'int value = 42;', order_index: 0 });
const gemini = (questions: unknown[]) => ({ ok: true, json: async () => ({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify({ questions }) }] } }] }) });
function setup(empty = false) {
  const tables: Record<string, Record<string, unknown>[]> = {
    courses: [{ id: course, title: 'C# course' }],
    chapters: [{ id: chapterA, course_id: course, title: 'Variables', order_index: 0 }, { id: chapterB, course_id: course, title: 'More variables', order_index: 1 }],
    lessons: [lesson(lessonA, chapterA), lesson(lessonB, chapterB)], questions: [],
  };
  if (empty) tables.lessons = tables.lessons.map(row => ({ ...row, content: '<p>&nbsp;</p>', code_example: '' }));
  const from = vi.fn((table: string) => {
    let rows = [...(tables[table] ?? [])];
    const query: any = {
      select: () => query,
      eq: (key: string, value: unknown) => { rows = rows.filter(row => row[key] === value); return query; },
      in: (key: string, values: unknown[]) => { rows = rows.filter(row => values.includes(row[key])); return query; },
      is: (key: string, value: unknown) => { rows = rows.filter(row => value === null ? row[key] == null : row[key] === value); return query; },
      order: () => query,
      limit: (count: number) => { rows = rows.slice(0, count); return query; },
      maybeSingle: async () => ({ data: rows[0] ?? null, error: null }),
      then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: rows, error: null }).then(resolve),
    };
    return query;
  });
  const config: Record<string, string> = { GEMINI_API_KEY: 'test-gemini', OPENAI_API_KEY: 'test-openai' };
  const service = new AiService({ get: (key: string) => config[key] } as never, { getAdminClient: () => ({ from }) } as never);
  return { service, from };
}

describe('AI authoring course/chapter/lesson scopes', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('generates from a course and derives each placement from a verified source lesson', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(gemini([{ ...question, source_lesson_id: lessonB }])));
    const result = await setup().service.generateAuthoringQuestions(base, 'actor');
    expect(result.source).toMatchObject({ scope: 'course', course_id: course });
    expect(result.questions[0]).toMatchObject({ course_id: course, chapter_id: chapterB, lesson_id: lessonB, chapter_title: 'More variables' });
    expect(result.source.lessons).toHaveLength(2);
  });
  it('limits a chapter request to source lessons inside the chosen chapter', async () => {
    const fetchMock = vi.fn().mockResolvedValue(gemini([{ ...question, source_lesson_id: lessonA }]));
    vi.stubGlobal('fetch', fetchMock);
    const result = await setup().service.generateAuthoringQuestions({ ...base, chapter_id: chapterA }, 'actor');
    expect(result.source).toMatchObject({ scope: 'chapter', chapter_id: chapterA });
    expect(result.questions[0]).toMatchObject({ chapter_id: chapterA, lesson_id: lessonA });
    const schema = JSON.parse(fetchMock.mock.calls[0][1].body).generationConfig.responseJsonSchema;
    expect(schema.properties.questions.items.properties.source_lesson_id.enum).toEqual([lessonA]);
  });
  it('keeps the existing single lesson request and provider schema compatible', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(gemini([question])));
    const result = await setup().service.generateAuthoringQuestions({ ...base, chapter_id: chapterA, lesson_id: lessonA }, 'actor');
    expect(result.source).toMatchObject({ scope: 'lesson', lesson_id: lessonA });
    expect(result.questions[0]).toMatchObject({ chapter_id: chapterA, lesson_id: lessonA });
  });
  it('rejects a lesson without a chapter before calling a provider', async () => {
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    await expect(setup().service.generateAuthoringQuestions({ ...base, lesson_id: lessonA }, 'actor')).rejects.toBeInstanceOf(BadRequestException);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('rejects a chapter outside the selected course before calling a provider', async () => {
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    await expect(setup().service.generateAuthoringQuestions({ ...base, chapter_id: foreign }, 'actor')).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('rejects a lesson outside the selected chapter', async () => {
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    await expect(setup().service.generateAuthoringQuestions({ ...base, chapter_id: chapterA, lesson_id: lessonB }, 'actor')).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('rejects a course with no meaningful lesson content', async () => {
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    await expect(setup(true).service.generateAuthoringQuestions(base, 'actor')).rejects.toBeInstanceOf(BadRequestException);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('falls back when a model claims a source outside the selected scope', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(gemini([{ ...question, source_lesson_id: lessonB }]))
      .mockResolvedValueOnce({ ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify({ questions: [{ ...question, source_lesson_id: lessonA }] }) } }] }) });
    vi.stubGlobal('fetch', fetchMock);
    const result = await setup().service.generateAuthoringQuestions({ ...base, chapter_id: chapterA }, 'actor');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.questions[0].lesson_id).toBe(lessonA);
  });
  it('does not invent a placement when both providers omit a source for a broad scope', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(gemini([question]))
      .mockResolvedValueOnce({ ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify({ questions: [question] }) } }] }) }));
    await expect(setup().service.generateAuthoringQuestions(base, 'actor')).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});

describe('generate DTO scope combinations', () => {
  for (const placement of [{}, { chapter_id: chapterA }, { chapter_id: chapterA, lesson_id: lessonA }]) {
    it(`accepts scope fields ${Object.keys(placement).join(',') || 'course only'}`, async () => {
      expect(await validate(Object.assign(new GenerateAiQuestionsDto(), base, placement))).toEqual([]);
    });
  }
  it('rejects malformed optional IDs', async () => {
    const errors = await validate(Object.assign(new GenerateAiQuestionsDto(), base, { chapter_id: 'invalid', lesson_id: 'invalid' }));
    expect(errors.map(error => error.property)).toEqual(expect.arrayContaining(['chapter_id', 'lesson_id']));
  });
});
