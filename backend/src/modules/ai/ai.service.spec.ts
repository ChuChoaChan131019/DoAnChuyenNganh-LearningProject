import { ServiceUnavailableException } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AiService } from './ai.service.js';

const question = {
  content: 'Biến trong C# dùng để làm gì?',
  question_type: 'single_choice',
  difficulty: 'easy',
  explanation: 'Biến dùng để lưu trữ giá trị.',
  options: [
    { option_text: 'Lưu trữ giá trị', is_correct: true, order_index: 0 },
    { option_text: 'Biên dịch mã', is_correct: false, order_index: 1 },
  ],
};

function createService(openAiApiKey = 'test-openai-key') {
  const config = {
    get: vi.fn((key: string) => {
      if (key === 'OPENAI_API_KEY') return openAiApiKey;
      if (key === 'AI_TUTOR_ENCRYPTION_KEY') return 'test-encryption-key';
      return '';
    }),
  };
  return new AiService(config as never, {} as never);
}

describe('AiService practice question generation', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses a strict JSON schema and validates the generated question count', async () => {
    const questions = [question, { ...question, content: 'Câu 2' }, { ...question, content: 'Câu 3' }];
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        choices: [{ message: { content: JSON.stringify({ questions }) } }],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await createService().generatePracticeQuestions(
      undefined,
      3,
      'Bài học về biến trong C#',
      'mixed',
    );

    expect(result).toHaveLength(3);
    const request = fetchMock.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(String(request.body));
    expect(body.response_format).toMatchObject({
      type: 'json_schema',
      json_schema: { name: 'practice_questions', strict: true },
    });
  });

  it('rejects a structurally invalid provider response instead of returning mock questions', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        choices: [{ message: { content: JSON.stringify({ questions: [{ ...question, options: [] }] }) } }],
      }),
    }));

    await expect(createService().generatePracticeQuestions(
      undefined,
      3,
      'Bài học về biến trong C#',
      'mixed',
    )).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
