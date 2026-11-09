import { Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ContextTutorDto } from './dto/context-tutor.dto.js';

type ProviderName = 'huggingface' | 'gemini' | 'openai';
type Failure =
  'quota' | 'auth' | 'busy' | 'timeout' | 'network' | 'configuration' | 'empty';
type Provider = { name: ProviderName; key: string; model: string };
type FailedAttempt = { reason: Failure; retryDelay: number; status?: number };
type ProviderState = Provider & { until: number; reason: Failure };
type ProviderResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string; thought?: boolean }> };
  }>;
  error?: { code?: string | number; type?: string; status?: string };
};

const DEFAULT_ORDER: ProviderName[] = ['huggingface', 'gemini', 'openai'];
const QUOTA_CODES = new Set([
  'insufficient_quota',
  'credit_balance_exhausted',
  'organization_spend_limit_exceeded',
  'project_spend_limit_exceeded',
  'organization_usage_limit_exceeded',
  'usage_limit_exceeded',
]);
const LABELS: Record<ProviderName, string> = {
  huggingface: 'Hugging Face',
  gemini: 'Gemini',
  openai: 'OpenAI',
};
const REASONS: Record<Failure, string> = {
  quota: 'hết credit hoặc hạn mức',
  auth: 'key không hợp lệ hoặc thiếu quyền',
  busy: 'đang bận hoặc bị giới hạn tốc độ',
  timeout: 'hết thời gian chờ',
  network: 'không kết nối được',
  configuration: 'cấu hình model không hợp lệ',
  empty: 'không trả về nội dung',
};

export class TutorAiProvider {
  private readonly logger = new Logger(TutorAiProvider.name);
  private readonly states = new Map<ProviderName, ProviderState>();

  constructor(private readonly config: ConfigService) {}

  private duration(name: string, fallback: number, max: number): number {
    const value = Number(this.config.get(name));
    return Number.isFinite(value) && value >= 1000
      ? Math.min(value, max)
      : fallback;
  }

  private providers(): Provider[] {
    const order = this.config.get<string>('AI_TUTOR_PROVIDERS')?.trim();
    const names = order
      ? order.split(',').map((name) => name.trim().toLowerCase())
      : DEFAULT_ORDER;
    const settings: Record<ProviderName, [string, string, string]> = {
      huggingface: [
        'HUGGINGFACE_API_KEY',
        'HUGGINGFACE_MODEL',
        'Qwen/Qwen2.5-72B-Instruct',
      ],
      gemini: ['GEMINI_API_KEY', 'GEMINI_TUTOR_MODEL', 'gemini-3.1-flash-lite'],
      openai: ['OPENAI_API_KEY', 'OPENAI_TUTOR_MODEL', 'gpt-4o-mini'],
    };
    return [...new Set(names)].flatMap((name) => {
      if (!Object.hasOwn(settings, name)) return [];
      const typedName = name as ProviderName;
      const [keyName, modelName, defaultModel] = settings[typedName];
      const key = this.config.get<string>(keyName)?.trim();
      if (!key || key.startsWith('your-')) return [];
      return [
        {
          name: typedName,
          key,
          model: this.config.get<string>(modelName)?.trim() || defaultModel,
        },
      ];
    });
  }

  private retryDelay(response: Response): number {
    const header = response.headers.get('retry-after');
    if (!header) return 500 + Math.floor(Math.random() * 250);
    const seconds = Number(header);
    const duration = Number.isFinite(seconds)
      ? seconds * 1000
      : Date.parse(header) - Date.now();
    return Number.isFinite(duration) ? Math.max(500, duration) : 500;
  }

  private async attempt(
    provider: Provider,
    prompt: string,
    dto: ContextTutorDto,
    deadline: number,
  ): Promise<string | FailedAttempt> {
    const history = (dto.history ?? []).slice(-6);
    const isGemini = provider.name === 'gemini';
    const url = isGemini
      ? `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(provider.model)}:generateContent`
      : provider.name === 'huggingface'
        ? 'https://router.huggingface.co/v1/chat/completions'
        : 'https://api.openai.com/v1/chat/completions';
    const body = isGemini
      ? {
          systemInstruction: { parts: [{ text: prompt }] },
          contents: [...history, { role: 'user', content: dto.message }].map(
            (message) => ({
              role: message.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: message.content }],
            }),
          ),
          generationConfig: { temperature: 0.1, maxOutputTokens: 1200 },
        }
      : {
          model: provider.model,
          temperature: 0.1,
          max_tokens: 900,
          messages: [
            { role: 'system', content: prompt },
            ...history,
            { role: 'user', content: dto.message },
          ],
        };
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(isGemini
            ? { 'x-goog-api-key': provider.key }
            : { Authorization: `Bearer ${provider.key}` }),
        },
        signal: AbortSignal.timeout(
          Math.max(
            1,
            Math.floor(
              Math.min(
                this.duration('AI_TUTOR_PROVIDER_TIMEOUT_MS', 15000, 30000),
                deadline - Date.now(),
              ),
            ),
          ),
        ),
        body: JSON.stringify(body),
      });
      let data: ProviderResponse | null = null;
      try {
        data = (await response.json()) as ProviderResponse;
      } catch (error) {
        if (
          error instanceof Error &&
          (error.name === 'TimeoutError' || error.name === 'AbortError')
        )
          throw error;
      }
      if (response.ok) {
        const answer = isGemini
          ? data?.candidates?.[0]?.content?.parts
              ?.filter((part) => !part.thought)
              .map((part) => part.text ?? '')
              .join('')
              .trim()
          : data?.choices?.[0]?.message?.content?.trim();
        return (
          answer || {
            reason: 'empty',
            retryDelay: 500,
            status: response.status,
          }
        );
      }
      const code = String(data?.error?.code ?? '');
      const type = data?.error?.type ?? '';
      const reason: Failure =
        response.status === 402 ||
        QUOTA_CODES.has(code) ||
        QUOTA_CODES.has(type)
          ? 'quota'
          : response.status === 401 || response.status === 403
            ? 'auth'
            : response.status === 429 || response.status >= 500
              ? 'busy'
              : 'configuration';
      return {
        reason,
        retryDelay: this.retryDelay(response),
        status: response.status,
      };
    } catch (error) {
      return {
        reason:
          error instanceof Error &&
          (error.name === 'TimeoutError' || error.name === 'AbortError')
            ? 'timeout'
            : 'network',
        retryDelay: 500,
      };
    }
  }

  private remember(provider: Provider, failure: FailedAttempt): void {
    const cooldown = ['quota', 'auth', 'configuration'].includes(failure.reason)
      ? 300000
      : 30000;
    this.states.set(provider.name, {
      ...provider,
      reason: failure.reason,
      until: Date.now() + Math.max(cooldown, failure.retryDelay),
    });
    // Không log response body, prompt, URL có key hoặc nội dung exception từ upstream.
    this.logger.warn(
      `${LABELS[provider.name]}: ${failure.status ? `HTTP ${failure.status}` : 'request failed'}; ${failure.reason}`,
    );
  }

  async answer(prompt: string, dto: ContextTutorDto): Promise<string> {
    const providers = this.providers();
    const deadline =
      Date.now() + this.duration('AI_TUTOR_TOTAL_TIMEOUT_MS', 30000, 60000);
    const retries: Array<{ provider: Provider; after: number }> = [];
    // Thử các nhà cung cấp dự phòng trước khi thử lại lỗi tạm thời.
    for (const provider of providers) {
      const state = this.states.get(provider.name);
      if (
        state &&
        state.key === provider.key &&
        state.model === provider.model &&
        state.until > Date.now()
      )
        continue;
      if (Date.now() >= deadline) break;
      const result = await this.attempt(provider, prompt, dto, deadline);
      if (typeof result === 'string') {
        this.states.delete(provider.name);
        return result;
      }
      this.remember(provider, result);
      if (['busy', 'timeout', 'network'].includes(result.reason))
        retries.push({ provider, after: Date.now() + result.retryDelay });
    }
    // Mỗi nhà cung cấp có tối đa một lần thử lại trong tổng ngân sách chờ.
    for (const { provider, after } of retries) {
      const delay = Math.max(0, after - Date.now());
      if (Date.now() + delay + 1000 >= deadline) continue;
      if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
      const result = await this.attempt(provider, prompt, dto, deadline);
      if (typeof result === 'string') {
        this.states.delete(provider.name);
        return result;
      }
      this.remember(provider, result);
    }
    const details = providers
      .map((provider) => {
        const state = this.states.get(provider.name);
        return `${LABELS[provider.name]}: ${state ? REASONS[state.reason] : 'chưa nhận được phản hồi'}`;
      })
      .join('; ');
    throw new ServiceUnavailableException(
      details
        ? `AI Tutor tạm thời không khả dụng. ${details}. Vui lòng thử lại sau hoặc kiểm tra cấu hình nhà cung cấp.`
        : 'AI Tutor chưa được cấu hình nhà cung cấp hợp lệ.',
    );
  }
}
