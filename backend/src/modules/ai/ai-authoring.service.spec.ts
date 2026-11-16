import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildAuthoringSource } from './authoring-source.js';
import { AiService } from './ai.service.js';
import { GenerateAiQuestionsDto } from './dto/generate-ai-questions.dto.js';
const question = {
  content: 'What does a variable store in C#?',
  question_type: 'single_choice',
  difficulty: 'easy',
  explanation: 'A variable stores a value.',
  options: [
    { option_text: 'A value', is_correct: true, order_index: 0 },
    { option_text: 'Compilation', is_correct: false, order_index: 1 },
  ],
};
const request = {
  course_id: 'course',
  chapter_id: 'chapter',
  lesson_id: 'lesson',
  count: 1,
  question_type: 'single_choice',
  difficulty: 'easy',
} as GenerateAiQuestionsDto;
function setup(
  content = 'A variable in C# stores a typed value that can change during program execution.',
  code = '',
) {
  const config: Record<string, string> = {
    GEMINI_API_KEY: 'test-gemini',
    OPENAI_API_KEY: 'test-openai',
  };
  const service = new AiService(
    { get: (key: string) => config[key] } as never,
    {} as never,
  );
  vi.spyOn(service as any, 'getAuthoringLessonContext').mockResolvedValue({
    course: {
      title:
        'A long title that alone must not count as useful teaching material',
    },
    chapters: [{ id: 'chapter', title: 'Chapter' }],
    lessons: [{ id: 'lesson', chapter_id: 'chapter', chapter_title: 'Chapter', title: 'Variables', content, code_example: code }],
    existingQuestionContents: [],
  });
  return service;
}
const gemini = (questions: unknown[]) => ({
  ok: true,
  json: async () => ({
    candidates: [
      { content: { parts: [{ text: JSON.stringify({ questions }) }] } },
    ],
  }),
});
const openai = (questions: unknown[]) => ({
  ok: true,
  json: async () => ({
    choices: [{ message: { content: JSON.stringify({ questions }) } }],
  }),
});
describe('Content Manager question authoring', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });
  it.each(['', '<p><br>&nbsp;</p>', '## **  **'])(
    'rejects empty source before provider: %s',
    async (content) => {
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);
      await expect(
        setup(content).generateAuthoringQuestions(request, 'actor'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );
  it('rejects markup-only code examples', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(
      setup('', '<p><br>&nbsp;</p>').generateAuthoringQuestions(
        request,
        'actor',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('accepts useful code without prose', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(gemini([question])));
    await expect(
      setup(
        '',
        'int value = 42; Console.WriteLine(value);',
      ).generateAuthoringQuestions(request, 'actor'),
    ).resolves.toMatchObject({ questions: [question] });
  });
  it.each([1, 10])('accepts exactly %i questions', async (count) => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          gemini(Array.from({ length: count }, () => question)),
        ),
    );
    expect(
      (await setup().generateAuthoringQuestions({ ...request, count }, 'actor'))
        .questions,
    ).toHaveLength(count);
  });
  it('rejects wrong type and difficulty and falls back within two calls', async () => {
    const correct = {
      ...question,
      question_type: 'multiple_choice',
      difficulty: 'hard',
      options: [
        ...question.options,
        { option_text: 'Stored data', is_correct: true, order_index: 2 },
      ],
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(gemini([question]))
      .mockResolvedValueOnce(openai([correct]));
    vi.stubGlobal('fetch', fetchMock);
    const result = await setup().generateAuthoringQuestions(
      {
        ...request,
        question_type: 'multiple_choice',
        difficulty: 'hard',
      } as GenerateAiQuestionsDto,
      'actor',
    );
    expect(result.questions[0]).toMatchObject(correct);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it('sends Gemini an explicit schema with the requested count, type and difficulty', async () => {
    const fetchMock = vi.fn().mockResolvedValue(gemini([question]));
    vi.stubGlobal('fetch', fetchMock);
    await setup().generateAuthoringQuestions(request, 'actor');
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(
      body.generationConfig.responseJsonSchema.properties.questions,
    ).toMatchObject({
      minItems: 1,
      maxItems: 1,
      items: {
        properties: {
          question_type: { enum: ['single_choice'] },
          difficulty: { enum: ['easy'] },
        },
      },
    });
  });
  it('assembles all final Gemini text parts without thought parts', async () => {
    const json = JSON.stringify({ questions: [question] });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            finishReason: 'STOP',
            content: {
              parts: [
                {
                  thought: true,
                  text: 'Internal reasoning must never be parsed as output',
                },
                { text: json.slice(0, 40) },
                { text: json.slice(40) },
              ],
            },
          },
        ],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);
    await expect(
      setup().generateAuthoringQuestions(request, 'actor'),
    ).resolves.toMatchObject({ questions: [question] });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('rejects two invalid batches without repairing or relabelling them', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(gemini([question, question]))
      .mockResolvedValueOnce(openai([{ ...question, difficulty: 'hard' }]));
    vi.stubGlobal('fetch', fetchMock);
    await expect(
      setup().generateAuthoringQuestions(request, 'actor'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it('keeps complete fenced blocks when reducing a long lesson', () => {
    const fence = '```csharp\nint value = 42; Console.WriteLine(value);\n```';
    const result = buildAuthoringSource(
      {
        course: { title: 'C#' },
        chapter: { title: 'Values' },
        lesson: {
          title: 'Variable',
          content:
            'Useful prose about variables. '.repeat(1000) + '\n\n' + fence,
        },
      },
      'Console.WriteLine',
    );
    expect(result.truncated).toBe(true);
    expect(result.text.length).toBeLessThanOrEqual(20_000);
    expect(result.text).toContain(fence);
    expect(result.text.match(/```/g)).toHaveLength(2);
  });
  it('times out each upstream and never exceeds two calls', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn(
      (_url, options) =>
        new Promise((_resolve, reject) => {
          const timer = setTimeout(() => reject(new Error('timeout')), 20_000);
          options.signal.addEventListener('abort', () => {
            clearTimeout(timer);
            reject(new Error('timeout'));
          });
        }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const result = setup().generateAuthoringQuestions(request, 'actor');
    const assertion = expect(result).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    await vi.advanceTimersByTimeAsync(40_001);
    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it('reports temporary overload when Gemini is overloaded and fallback has no quota', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { status: 'UNAVAILABLE' } }), {
          status: 503,
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ error: { code: 'credit_balance_exhausted' } }),
          { status: 429 },
        ),
      );
    vi.stubGlobal('fetch', fetchMock);
    const service = setup();
    await expect(
      service.generateAuthoringQuestions(request, 'actor'),
    ).rejects.toMatchObject({
      status: 503,
      response: {
        error: {
          code: 'AI_PROVIDER_OVERLOADED',
          message: expect.stringContaining('tạm quá tải'),
        },
      },
    });
    await expect(
      service.generateAuthoringQuestions(request, 'other'),
    ).rejects.toMatchObject({
      response: { error: { code: 'AI_PROVIDER_OVERLOADED' } },
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it('does not describe invalid Gemini output as a provider quota failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(gemini([]))
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ error: { code: 'credit_balance_exhausted' } }),
            { status: 429 },
          ),
        ),
    );
    await expect(
      setup().generateAuthoringQuestions(request, 'actor'),
    ).rejects.toMatchObject({
      response: { error: { code: 'AI_OUTPUT_INVALID' } },
    });
  });
  it('distinguishes the per-user minute limit from upstream quota', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(gemini([question])));
    const service = setup();
    for (let index = 0; index < 3; index++)
      await service.generateAuthoringQuestions(request, 'actor');
    await expect(
      service.generateAuthoringQuestions(request, 'actor'),
    ).rejects.toMatchObject({
      status: 429,
      response: { error: { code: 'AI_AUTHORING_RATE_LIMIT' } },
    });
  });
  it.each(['insufficient_quota', 'credit_balance_exhausted'])(
    'skips quota %s and overloaded providers during cooldown',
    async (quotaCode) => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ error: { status: 'UNAVAILABLE' } }), {
            status: 503,
            headers: { 'Retry-After': '60' },
          }),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ error: { code: quotaCode } }), {
            status: 429,
          }),
        );
      vi.stubGlobal('fetch', fetchMock);
      const service = setup();
      await expect(
        service.generateAuthoringQuestions(request, 'actor'),
      ).rejects.toThrow();
      await expect(
        service.generateAuthoringQuestions(request, 'other'),
      ).rejects.toThrow();
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(
        fetchMock.mock.calls.every(
          (call) => call[1].signal instanceof AbortSignal,
        ),
      ).toBe(true);
    },
  );
});
