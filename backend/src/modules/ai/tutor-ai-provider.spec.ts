import { Logger, ServiceUnavailableException } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TutorAiProvider } from './tutor-ai-provider.js';

const dto = {
  mode: 'lesson' as const,
  message: 'Giải thích for',
  history: [{ role: 'user' as const, content: 'Vòng lặp' }],
};
const prompt = 'Chỉ dựa trên tài liệu bài học: vòng lặp for.';
function create(
  keys: Record<string, string> = { HUGGINGFACE_API_KEY: 'test-hf' },
) {
  return new TutorAiProvider({ get: (key: string) => keys[key] } as never);
}
const success = (text = 'Giải thích từ tài liệu') =>
  new Response(JSON.stringify({ choices: [{ message: { content: text } }] }), {
    status: 200,
  });
const failure = (status: number, code?: string, headers = {}) =>
  new Response(JSON.stringify({ error: { code } }), { status, headers });

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Tutor AI providers', () => {
  it('calls the HF chat router with the system prompt and conversation intact', async () => {
    const fetch = vi.fn().mockResolvedValue(success());
    vi.stubGlobal('fetch', fetch);
    expect(await create().answer(prompt, dto)).toBe('Giải thích từ tài liệu');
    expect(fetch).toHaveBeenCalledOnce();
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('https://router.huggingface.co/v1/chat/completions');
    expect(init.headers.Authorization).toBe('Bearer test-hf');
    expect(JSON.parse(init.body)).toMatchObject({
      model: 'Qwen/Qwen2.5-72B-Instruct',
      messages: [
        { role: 'system', content: prompt },
        ...dto.history,
        { role: 'user', content: dto.message },
      ],
    });
  });

  it('falls back immediately on HF quota without retrying the paid failure', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(failure(402))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            candidates: [{ content: { parts: [{ text: 'Gemini trả lời' }] } }],
          }),
        ),
      );
    vi.stubGlobal('fetch', fetch);
    expect(
      await create({
        HUGGINGFACE_API_KEY: 'hf',
        GEMINI_API_KEY: 'gemini',
      }).answer(prompt, dto),
    ).toBe('Gemini trả lời');
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('preserves Gemini system instruction priority and maps assistant to model', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [
                    { thought: true, text: 'Private reasoning' },
                    { text: 'Answer' },
                  ],
                },
              },
            ],
          }),
        ),
      );
    vi.stubGlobal('fetch', fetch);
    expect(
      await create({ GEMINI_API_KEY: 'gemini' }).answer(prompt, {
        ...dto,
        history: [{ role: 'assistant', content: 'Earlier answer' }],
      }),
    ).toBe('Answer');
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.systemInstruction).toEqual({ parts: [{ text: prompt }] });
    expect(body.contents[0]).toEqual({
      role: 'model',
      parts: [{ text: 'Earlier answer' }],
    });
  });

  it('tries fallback before retrying a transient failure', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(failure(503))
      .mockResolvedValueOnce(success('OpenAI answer'));
    vi.stubGlobal('fetch', fetch);
    expect(
      await create({
        HUGGINGFACE_API_KEY: 'hf',
        OPENAI_API_KEY: 'openai',
      }).answer(prompt, dto),
    ).toBe('OpenAI answer');
    expect(fetch.mock.calls.map((call) => new URL(call[0]).hostname)).toEqual([
      'router.huggingface.co',
      'api.openai.com',
    ]);
  });

  it('retries temporary overload once after backoff when no fallback succeeds', async () => {
    vi.useFakeTimers();
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(failure(503))
      .mockResolvedValueOnce(success('Recovered'));
    vi.stubGlobal('fetch', fetch);
    const answer = create().answer(prompt, dto);
    await vi.runAllTimersAsync();
    expect(await answer).toBe('Recovered');
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('honors Retry-After before retrying a rate limit', async () => {
    vi.useFakeTimers();
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        failure(429, 'rate_limit_exceeded', { 'Retry-After': '2' }),
      )
      .mockResolvedValueOnce(success());
    vi.stubGlobal('fetch', fetch);
    const answer = create().answer(prompt, dto);
    await vi.advanceTimersByTimeAsync(1999);
    expect(fetch).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    await answer;
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('does not wait beyond the total budget for Retry-After', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(
        failure(429, 'rate_limit_exceeded', { 'Retry-After': '120' }),
      );
    vi.stubGlobal('fetch', fetch);
    await expect(create().answer(prompt, dto)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('temporarily skips a provider whose credits are exhausted', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(failure(429, 'credit_balance_exhausted'));
    vi.stubGlobal('fetch', fetch);
    const provider = create({ OPENAI_API_KEY: 'openai' });
    await expect(provider.answer(prompt, dto)).rejects.toThrow('hết credit');
    await expect(provider.answer(prompt, dto)).rejects.toThrow('hết credit');
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('tries a replacement key immediately even during cooldown', async () => {
    const keys = { HUGGINGFACE_API_KEY: 'old-key' };
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(failure(401))
      .mockResolvedValueOnce(success());
    vi.stubGlobal('fetch', fetch);
    const provider = create(keys);
    await expect(provider.answer(prompt, dto)).rejects.toThrow(
      'key không hợp lệ',
    );
    keys.HUGGINGFACE_API_KEY = 'new-key';
    await expect(provider.answer(prompt, dto)).resolves.toBeDefined();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('recovers after the quota cooldown expires', async () => {
    vi.useFakeTimers();
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(failure(402))
      .mockResolvedValueOnce(success());
    vi.stubGlobal('fetch', fetch);
    const provider = create();
    await expect(provider.answer(prompt, dto)).rejects.toBeDefined();
    await vi.advanceTimersByTimeAsync(300000);
    await expect(provider.answer(prompt, dto)).resolves.toBeDefined();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it.each([401, 403, 400, 404])(
    'does not retry non-transient HTTP %i',
    async (status) => {
      const fetch = vi.fn().mockResolvedValue(failure(status));
      vi.stubGlobal('fetch', fetch);
      await expect(create().answer(prompt, dto)).rejects.toBeDefined();
      expect(fetch).toHaveBeenCalledOnce();
    },
  );

  it('falls back after invalid JSON or an empty success', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response('<html>bad proxy</html>'))
      .mockResolvedValueOnce(success());
    vi.stubGlobal('fetch', fetch);
    await expect(
      create({ HUGGINGFACE_API_KEY: 'hf', OPENAI_API_KEY: 'openai' }).answer(
        prompt,
        dto,
      ),
    ).resolves.toBeDefined();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('bounds requests by the remaining total deadline and stops after it expires', async () => {
    vi.useFakeTimers();
    const fetch = vi.fn().mockImplementation(async (_url, init) => {
      expect(init.signal).toBeInstanceOf(AbortSignal);
      // Simulate a request consuming the entire budget and failing by timeout.
      vi.setSystemTime(Date.now() + 30000);
      throw new DOMException('Timed out', 'TimeoutError');
    });
    vi.stubGlobal('fetch', fetch);
    await expect(
      create({ HUGGINGFACE_API_KEY: 'hf', GEMINI_API_KEY: 'gemini' }).answer(
        prompt,
        dto,
      ),
    ).rejects.toThrow('hết thời gian chờ');
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('supports explicit provider order and model configuration', async () => {
    const fetch = vi.fn().mockResolvedValue(success());
    vi.stubGlobal('fetch', fetch);
    await create({
      HUGGINGFACE_API_KEY: 'hf',
      OPENAI_API_KEY: 'openai',
      AI_TUTOR_PROVIDERS: 'openai,huggingface',
      OPENAI_TUTOR_MODEL: 'configured-model',
    }).answer(prompt, dto);
    expect(fetch.mock.calls[0][0]).toBe(
      'https://api.openai.com/v1/chat/completions',
    );
    expect(JSON.parse(fetch.mock.calls[0][1].body).model).toBe(
      'configured-model',
    );
  });

  it('never exposes upstream error bodies, prompts or credentials in logs and client errors', async () => {
    const warn = vi
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({
              error: {
                code: 'credit_balance_exhausted',
                message: 'secret-key sensitive-prompt',
              },
            }),
            { status: 429 },
          ),
        ),
    );
    await expect(
      create({ HUGGINGFACE_API_KEY: 'secret-key' }).answer(
        'sensitive-prompt',
        dto,
      ),
    ).rejects.toThrow('hết credit');
    expect(JSON.stringify(warn.mock.calls)).not.toMatch(
      /secret-key|sensitive-prompt/,
    );
  });
});
