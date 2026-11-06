import { describe, expect, it, vi } from 'vitest';
import { PracticeService } from './practice.service.js';

type Row = Record<string, unknown>;

function fakeQuery(result: { data: Row[]; error: null }, calls: Array<[string, string, unknown]>, table: string) {
  const query = {
    select: () => query,
    eq: (column: string, value: unknown) => { calls.push([table, column, value]); return query; },
    in: (column: string, value: unknown) => { calls.push([table, column, value]); return query; },
    is: (column: string, value: unknown) => { calls.push([table, column, value]); return query; },
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
      generated_for_user_id: 'learner-1',
    })]);
    expect(result.questions).toHaveLength(1);
  });

  it('generates a private practice set from published lesson content', async () => {
    const aiQuestion = {
      question_type: 'single_choice',
      difficulty: 'medium',
      content: 'Biến trong C# dùng để làm gì?',
      explanation: 'Biến lưu trữ một giá trị có kiểu xác định.',
      options: [
        { option_text: 'Lưu trữ giá trị', is_correct: true, order_index: 0 },
        { option_text: 'Biên dịch chương trình', is_correct: false, order_index: 1 },
      ],
    };
    const generatedQuestions = [aiQuestion, { ...aiQuestion, content: 'Câu 2' }, { ...aiQuestion, content: 'Câu 3' }];
    const responses: Record<string, Array<{ data: unknown; error: null; count?: number }>> = {
      lessons: [{ data: { id: 'lesson-1', chapter_id: 'chapter-1', title: 'Biến', content: 'Nội dung biến', code_example: 'int age = 18;', status: 'published' }, error: null }],
      chapters: [{ data: { id: 'chapter-1', course_id: 'course-1', title: 'Cơ bản', status: 'published' }, error: null }],
      courses: [{ data: { id: 'course-1', title: 'C#', description: 'Khóa C#', status: 'published' }, error: null }],
      questions: [
        { data: null, error: null, count: 0 },
        { data: [
          { id: 'q-1', course_id: 'course-1', chapter_id: 'chapter-1', lesson_id: 'lesson-1', question_options: [] },
          { id: 'q-2', course_id: 'course-1', chapter_id: 'chapter-1', lesson_id: 'lesson-1', question_options: [] },
          { id: 'q-3', course_id: 'course-1', chapter_id: 'chapter-1', lesson_id: 'lesson-1', question_options: [] },
        ], error: null },
      ],
    };
    const from = vi.fn((table: string) => {
      const response = responses[table]?.shift();
      if (!response) throw new Error(`Unexpected query: ${table}`);
      const query = {
        select: () => query,
        eq: () => query,
        in: () => query,
        gte: () => query,
        maybeSingle: () => Promise.resolve(response),
        then: (resolve: (value: typeof response) => unknown) => Promise.resolve(response).then(resolve),
      };
      return query;
    });
    const rpc = vi.fn().mockResolvedValue({
      data: [{ id: 'q-1' }, { id: 'q-2' }, { id: 'q-3' }],
      error: null,
    });
    const generatePracticeQuestions = vi.fn().mockResolvedValue(generatedQuestions);
    const service = new PracticeService(
      { getClient: () => ({ from, rpc }) } as never,
      { generatePracticeQuestions } as never,
    );

    const result = await service.generateAiPractice('learner-1', {
      lesson_id: 'lesson-1',
      count: 3,
      difficulty: 'mixed',
    });

    expect(generatePracticeQuestions).toHaveBeenCalledWith(
      undefined,
      3,
      expect.stringContaining('int age = 18;'),
      'mixed',
    );
    expect(rpc).toHaveBeenCalledWith('save_ai_practice_questions', {
      p_user_id: 'learner-1',
      p_lesson_id: 'lesson-1',
      p_questions: generatedQuestions,
    });
    expect(result.questions).toHaveLength(3);
    expect(result.rationale).toContain('Biến');
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

describe('PracticeService learner-owned AI sets', () => {
  it('creates a generating set with the authenticated user and derived lesson relations', async () => {
    const insertedSets: unknown[] = [];
    const responses: Record<string, Array<{ data: unknown; error: null }>> = {
      ai_practice_sets: [
        { data: [], error: null },
        {
          data: {
            id: 'set-1',
            course_id: 'course-1',
            chapter_id: 'chapter-1',
            lesson_id: 'lesson-1',
            status: 'generating',
            difficulty: 'mixed',
            requested_count: 5,
            generated_count: 0,
            created_at: '2026-11-05T00:00:00.000Z',
          },
          error: null,
        },
      ],
      lessons: [{ data: { id: 'lesson-1', chapter_id: 'chapter-1', title: 'Biến', content: 'Nội dung', code_example: null, status: 'published' }, error: null }],
      chapters: [{ data: { id: 'chapter-1', course_id: 'course-1', title: 'Cơ bản', status: 'published' }, error: null }],
      courses: [{ data: { id: 'course-1', title: 'C#', description: null, status: 'published' }, error: null }],
    };
    const from = vi.fn((table: string) => {
      const response = responses[table]?.shift();
      if (!response) throw new Error(`Unexpected query: ${table}`);
      const query = {
        select: () => query,
        eq: () => query,
        in: () => query,
        gte: () => query,
        insert: (payload: unknown) => { insertedSets.push(payload); return query; },
        maybeSingle: () => Promise.resolve(response),
        single: () => Promise.resolve(response),
        then: (resolve: (value: typeof response) => unknown) => Promise.resolve(response).then(resolve),
      };
      return query;
    });
    const immediate = vi.spyOn(globalThis, 'setImmediate').mockImplementation(() => 0 as never);
    const service = new PracticeService(
      { getClient: () => ({ from }) } as never,
      { generatePracticeQuestions: vi.fn() } as never,
    );

    const result = await service.createAiPracticeSet('learner-from-jwt', {
      lesson_id: 'lesson-1',
      count: 5,
      difficulty: 'mixed',
    });

    expect(insertedSets).toContainEqual(expect.objectContaining({
      user_id: 'learner-from-jwt',
      course_id: 'course-1',
      chapter_id: 'chapter-1',
      lesson_id: 'lesson-1',
      status: 'generating',
    }));
    expect(result).toMatchObject({ id: 'set-1', status: 'generating' });
    immediate.mockRestore();
  });

  it('filters the chapter set list by both authenticated user and chapter', async () => {
    const filters: Array<[string, unknown]> = [];
    let call = 0;
    const from = vi.fn(() => {
      call += 1;
      const response = call === 1
        ? { data: null, error: null }
        : { data: [], error: null };
      const query = {
        update: () => query,
        select: () => query,
        eq: (column: string, value: unknown) => { filters.push([column, value]); return query; },
        lt: () => query,
        order: () => query,
        then: (resolve: (value: typeof response) => unknown) => Promise.resolve(response).then(resolve),
      };
      return query;
    });
    const service = new PracticeService({ getClient: () => ({ from }) } as never, {} as never);

    await expect(service.listAiPracticeSets('learner-1', 'chapter-1')).resolves.toEqual({ sets: [] });
    expect(filters.filter(([column]) => column === 'user_id')).toEqual([
      ['user_id', 'learner-1'],
      ['user_id', 'learner-1'],
    ]);
    expect(filters.filter(([column]) => column === 'chapter_id')).toEqual([
      ['chapter_id', 'chapter-1'],
      ['chapter_id', 'chapter-1'],
    ]);
  });
});
