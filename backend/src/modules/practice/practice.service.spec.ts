import { describe, expect, it, vi } from 'vitest';
import { PracticeService } from './practice.service.js';

type Row = Record<string, unknown>;

function fakeQuery(result: { data: Row[]; error: null }, calls: Array<[string, string, unknown]>, table: string) {
  const query = {
    select: () => query,
    eq: (column: string, value: unknown) => { calls.push([table, column, value]); return query; },
    in: (column: string, value: unknown) => { calls.push([table, column, value]); return query; },
    not: () => query,
    gte: () => query,
    order: () => query,
    then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
  };
  return query;
}

describe('PracticeService chapter-based practice', () => {
  it('requires a chapter before generating new AI questions', async () => {
    const from = vi.fn((table: string) => {
      if (table !== 'courses') throw new Error(`Unexpected query: ${table}`);
      return fakeQuery({ data: [{ id: 'course-1' }], error: null }, [], table);
    });
    const generatePracticeQuestions = vi.fn();
    const service = new PracticeService(
      { getClient: () => ({ from }) } as never,
      { generatePracticeQuestions } as never,
    );

    await expect(service.generateAiPractice('learner-1', { prompt: 'Variables' }))
      .rejects.toThrow('Select a chapter for AI practice');
    expect(generatePracticeQuestions).not.toHaveBeenCalled();
  });

  it('saves generated AI questions with the selected chapter', async () => {
    const inserts: Array<[string, unknown]> = [];
    const responses: Record<string, Array<{ data: unknown; error: null }>> = {
      courses: [
        { data: [{ id: 'course-1' }], error: null },
        { data: { id: 'course-1', title: 'C#', description: '' }, error: null },
      ],
      chapters: [{ data: { id: 'chapter-1', course_id: 'course-1', title: 'Variables', description: '' }, error: null }],
      questions: [
        { data: { id: 'generated-1' }, error: null },
        { data: [{ id: 'generated-1', chapter_id: 'chapter-1', question_options: [] }], error: null },
      ],
    };
    const from = vi.fn((table: string) => {
      if (table.includes('topic')) throw new Error(`Unexpected topic table: ${table}`);
      const response = responses[table]?.shift();
      if (!response) throw new Error(`Unexpected query: ${table}`);
      const query = {
        select: () => query,
        eq: () => query,
        in: () => query,
        insert: (payload: unknown) => { inserts.push([table, payload]); return query; },
        single: () => Promise.resolve(response),
        maybeSingle: () => Promise.resolve(response),
        then: (resolve: (value: typeof response) => unknown) => Promise.resolve(response).then(resolve),
      };
      return query;
    });
    const aiService = { generatePracticeQuestions: vi.fn().mockResolvedValue([{
      question_type: 'single_choice', difficulty: 'easy', content: 'What is a variable?', options: [],
    }]) };
    const service = new PracticeService({ getClient: () => ({ from }) } as never, aiService as never);

    const result = await service.generateAiPractice('learner-1', { chapter_id: 'chapter-1', prompt: 'Variables' });

    expect(inserts).toContainEqual(['questions', expect.objectContaining({
      course_id: 'course-1', chapter_id: 'chapter-1', status: 'approved',
    })]);
    expect(result.questions).toHaveLength(1);
  });

  it('uses a chapter for weak practice and ignores historical questions without a chapter', async () => {
    const calls: Array<[string, string, unknown]> = [];
    const responses: Record<string, Row[][]> = {
      courses: [[{ id: 'course-1' }]],
      quiz_attempts: [[{ id: 'attempt-1' }]],
      practice_attempts: [[]],
      quiz_attempt_details: [[
        { question_id: 'question-1', is_correct: false },
        { question_id: 'old-ai-question', is_correct: false },
      ]],
      questions: [
        [
          { id: 'question-1', course_id: 'course-1', chapter_id: 'chapter-1', chapters: { id: 'chapter-1', title: 'Introduction to C#', status: 'published' } },
          { id: 'old-ai-question', course_id: 'course-1', chapter_id: null, chapters: null },
        ],
        [{ id: 'question-1', chapter_id: 'chapter-1', question_options: [{ id: 'option-1', option_text: 'Answer', order_index: 0 }] }],
      ],
    };
    const from = vi.fn((table: string) => {
      if (table.includes('topic')) throw new Error(`Unexpected topic table: ${table}`);
      const rows = responses[table]?.shift();
      if (!rows) throw new Error(`Unexpected query: ${table}`);
      return fakeQuery({ data: rows, error: null }, calls, table);
    });
    const service = new PracticeService({ getClient: () => ({ from }) } as never, {} as never);

    const result = await service.getQuestions('learner-1', 'weak');

    expect(result.questions).toHaveLength(1);
    expect(result.questions[0].id).toBe('question-1');
    expect(calls).toContainEqual(['questions', 'chapter_id', ['chapter-1']]);
    expect(from).not.toHaveBeenCalledWith('question_topics');
  });

  it('returns an empty weak set when history has no classified questions', async () => {
    const responses: Record<string, Row[][]> = {
      courses: [[{ id: 'course-1' }]],
      quiz_attempts: [[]],
      practice_attempts: [[]],
    };
    const from = vi.fn((table: string) => {
      const rows = responses[table]?.shift();
      if (!rows) throw new Error(`Unexpected query: ${table}`);
      return fakeQuery({ data: rows, error: null }, [], table);
    });
    const service = new PracticeService({ getClient: () => ({ from }) } as never, {} as never);

    expect(await service.getQuestions('learner-1', 'weak')).toEqual({ mode: 'weak', questions: [] });
  });
});
